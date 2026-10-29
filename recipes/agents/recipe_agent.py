"""Recipe agent routes operations through the MCP client."""
from recipes.services.mcp_client import MCPRecipeClient

class RecipeAgent:
    def __init__(self, client=None):
        self.client = client or MCPRecipeClient()

    async def search(self, ingredients, min_match_percentage=30, limit=10):
        return await self.client.call_tool("recipe_search_tool", {
            "ingredients": ingredients,
            "min_match_percentage": min_match_percentage,
            "limit": limit,
        })

    async def details(self, recipe_id):
        return await self.client.call_tool("recipe_details_tool", {"recipe_id": recipe_id})
