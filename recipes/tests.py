import asyncio

from django.test import SimpleTestCase
from rest_framework.test import APIClient

from recipes.agents.supervisor import RuleBasedSupervisor
from recipes.recipe_data import RECIPES
from recipes.services.matching import find_recipe, normalize_ingredient, search_recipes

class MatchingTests(SimpleTestCase):
    def test_normalization(self):
        self.assertEqual(normalize_ingredient("  GARLIC   "), "garlic")

    def test_match_percentage_and_missing_ingredients(self):
        result = next(x for x in search_recipes(["chicken", "rice"]) if x["recipe"]["id"] == "chicken-rice")
        self.assertEqual(result["match_percentage"], 40)
        self.assertEqual(result["matched_ingredients"], ["chicken", "rice"])
        self.assertEqual(result["missing_ingredients"], ["onion", "tomato", "garlic"])

    def test_optional_ingredients_do_not_change_percentage(self):
        recipe = find_recipe("chicken-rice")
        self.assertTrue(recipe["ingredients"][-1]["optional"])
        result = next(x for x in search_recipes(["chicken", "rice"]) if x["recipe"]["id"] == "chicken-rice")
        self.assertEqual(result["match_percentage"], 40)

    def test_ranking_is_descending(self):
        results = search_recipes(["chicken", "rice", "onion", "tomato", "garlic"])
        percentages = [item["match_percentage"] for item in results]
        self.assertEqual(percentages, sorted(percentages, reverse=True))

    def test_empty_search_has_no_results(self):
        self.assertEqual(search_recipes([], min_match_percentage=0), [])

    def test_unknown_recipe(self):
        self.assertIsNone(find_recipe("not-a-recipe"))

    def test_dataset_has_twenty_complete_recipes(self):
        self.assertGreaterEqual(len(RECIPES), 20)
        for item in RECIPES:
            for key in ("id", "name", "description", "ingredients", "preparation_time_minutes", "cooking_time_minutes", "difficulty", "servings", "instructions"):
                self.assertIn(key, item)

class SupervisorTests(SimpleTestCase):
    def test_search_and_details_route_to_recipe_agent(self):
        from recipes.agents.recipe_agent import RecipeAgent
        supervisor = RuleBasedSupervisor()
        self.assertIsInstance(supervisor.route("search"), RecipeAgent)
        self.assertIsInstance(supervisor.route("details"), RecipeAgent)

    def test_unknown_intent_is_rejected(self):
        with self.assertRaises(ValueError):
            RuleBasedSupervisor().route("weather")

class APITests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_search_validates_empty_ingredients(self):
        response = self.client.post("/api/recipes/search/", {"ingredients": []}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_search_validates_percentage_and_limit(self):
        for body in ({"ingredients": ["rice"], "min_match_percentage": 101}, {"ingredients": ["rice"], "limit": 0}):
            self.assertEqual(self.client.post("/api/recipes/search/", body, format="json").status_code, 400)

    def test_detail_unknown_id(self):
        response = self.client.get("/api/recipes/missing/")
        self.assertEqual(response.status_code, 404)

    def test_search_endpoint_uses_mcp_and_returns_match_fields(self):
        response = self.client.post("/api/recipes/search/", {
            "ingredients": [" CHICKEN ", "rice"], "min_match_percentage": 40, "limit": 3,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        chicken_rice = next(item for item in response.json()["results"] if item["recipe"]["id"] == "chicken-rice")
        self.assertEqual(chicken_rice["match_percentage"], 40)
        self.assertEqual(chicken_rice["missing_ingredients"], ["onion", "tomato", "garlic"])

    def test_capabilities_endpoint_discovers_server(self):
        response = self.client.get("/api/mcp/capabilities/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["retrieved"]["catalog_recipe_count"], len(RECIPES))

    def test_real_mcp_tool_execution(self):
        """Integration test: starts the stdio subprocess and calls a discovered MCP tool."""
        from recipes.services.mcp_client import MCPRecipeClient
        result = asyncio.run(MCPRecipeClient().call_tool("recipe_details_tool", {"recipe_id": "chicken-rice"}))
        self.assertEqual(result["recipe"]["id"], "chicken-rice")

    def test_mcp_capability_discovery(self):
        from recipes.services.mcp_client import MCPRecipeClient
        data = asyncio.run(MCPRecipeClient().capabilities())
        self.assertEqual({x["name"] for x in data["tools"]}, {"recipe_search_tool", "recipe_details_tool"})
        self.assertEqual(data["retrieved"]["catalog_recipe_count"], len(RECIPES))
