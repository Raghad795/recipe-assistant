"""MCP stdio server exposing recipe tools, resources, and reusable prompts."""
import json
from mcp.server.fastmcp import FastMCP
from recipes.recipe_data import MATCHING_RULES, RECIPES
from recipes.services.matching import find_recipe, search_recipes

mcp = FastMCP("Recipe Assistant")

@mcp.tool()
def recipe_search_tool(ingredients: list[str], min_match_percentage: int = 30, limit: int = 10) -> str:
    """Search local recipes by available ingredients."""
    results = search_recipes(ingredients, min_match_percentage, limit)
    return json.dumps({"results": results, "count": len(results), "suggestion": "Add more ingredients or lower min_match_percentage." if not results else None})

@mcp.tool()
def recipe_details_tool(recipe_id: str) -> str:
    """Retrieve complete details for a recipe ID."""
    recipe = find_recipe(recipe_id)
    return json.dumps({"recipe": recipe} if recipe else {"error": "recipe_not_found", "recipe_id": recipe_id})

@mcp.resource("recipes://catalog")
def recipe_catalog() -> str:
    """Local recipe catalog reference data."""
    return json.dumps(RECIPES)

@mcp.resource("recipes://matching-rules")
def matching_rules() -> str:
    """Ingredient matching and ranking rules."""
    return json.dumps(MATCHING_RULES)

@mcp.prompt()
def recipe_assistant_prompt() -> str:
    """Reusable instructions for selecting suitable recipes."""
    return "Compare available ingredients with required recipe ingredients. Report match percentage, available ingredients, and missing ingredients accurately. Rank the strongest matches first."

@mcp.prompt()
def recipe_details_prompt() -> str:
    """Reusable instructions for presenting recipe details."""
    return "Present the recipe name, description, ingredient quantities, timings, difficulty, servings, dietary tags, and numbered cooking instructions clearly."

def main():
    mcp.run(transport="stdio")
