"""Async stdio MCP client. Every operation launches and closes its server child."""
import json
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.types import TextContent
from pydantic import AnyUrl

BASE_DIR = Path(__file__).resolve().parents[2]

class MCPRecipeClient:
    def __init__(self, command=None):
        self.command = command or sys.executable

    @asynccontextmanager
    async def _session(self):
        params = StdioServerParameters(command=self.command, args=["-m", "mcp_server"], cwd=str(BASE_DIR))
        async with stdio_client(params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                yield session

    async def call_tool(self, name, arguments):
        async with self._session() as session:
            result = await session.call_tool(name, arguments=arguments)
            if result.isError:
                raise RuntimeError(f"MCP tool {name} returned an error")
            for block in result.content:
                if isinstance(block, TextContent):
                    return json.loads(block.text)
            raise RuntimeError(f"MCP tool {name} returned no text result")

    async def capabilities(self):
        async with self._session() as session:
            tools = await session.list_tools()
            resources = await session.list_resources()
            prompts = await session.list_prompts()
            # Read reusable reference material over MCP, not from local Python imports.
            catalog = await session.read_resource(AnyUrl("recipes://catalog"))
            rules = await session.read_resource(AnyUrl("recipes://matching-rules"))
            assistant_prompt = await session.get_prompt("recipe_assistant_prompt")
            details_prompt = await session.get_prompt("recipe_details_prompt")
            return {
                "tools": [{"name": x.name, "description": x.description} for x in tools.tools],
                "resources": [{"uri": str(x.uri), "name": x.name, "description": x.description} for x in resources.resources],
                "prompts": [{"name": x.name, "description": x.description} for x in prompts.prompts],
                "retrieved": {
                    "catalog_recipe_count": len(json.loads(catalog.contents[0].text)),
                    "matching_rules": json.loads(rules.contents[0].text),
                    "recipe_assistant_prompt": assistant_prompt.messages[0].content.text,
                    "recipe_details_prompt": details_prompt.messages[0].content.text,
                },
            }
