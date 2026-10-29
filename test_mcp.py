"""Standalone smoke test for real MCP stdio discovery, resources, prompts, and tools."""
import asyncio
from recipes.services.mcp_client import MCPRecipeClient

async def main():
    client = MCPRecipeClient()
    capabilities = await client.capabilities()
    assert {item["name"] for item in capabilities["tools"]} == {"recipe_search_tool", "recipe_details_tool"}
    search = await client.call_tool("recipe_search_tool", {"ingredients": ["chicken", "rice"], "min_match_percentage": 30, "limit": 5})
    assert search["results"]
    detail = await client.call_tool("recipe_details_tool", {"recipe_id": "chicken-rice"})
    assert detail["recipe"]["name"] == "Chicken and Rice"
    print("MCP discovery, resources, prompts, and tool execution passed.")

if __name__ == "__main__":
    asyncio.run(main())
