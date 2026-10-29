"""JSON-only REST API views."""
import asyncio
import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from recipes.agents.supervisor import RuleBasedSupervisor
from recipes.serializers import RecipeSearchSerializer
from recipes.services.mcp_client import MCPRecipeClient

logger = logging.getLogger("recipes")

def run_async(awaitable):
    """Bridge Django's synchronous request handlers to the async MCP client."""
    return asyncio.run(awaitable)

class RecipeSearchView(APIView):
    def post(self, request):
        serializer = RecipeSearchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": "validation_error", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        values = serializer.validated_data
        try:
            agent = RuleBasedSupervisor().route("search")
            result = run_async(agent.search(values["ingredients"], values["min_match_percentage"], values["limit"]))
            result["suggestion"] = "Add more ingredients or lower the minimum match threshold." if not result["results"] else None
            return Response(result)
        except Exception:
            logger.exception("Recipe search through MCP failed")
            return Response({"error": "mcp_unavailable", "message": "Recipe search service is temporarily unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class RecipeDetailView(APIView):
    def get(self, request, recipe_id):
        try:
            agent = RuleBasedSupervisor().route("details")
            result = run_async(agent.details(recipe_id))
            if "error" in result:
                return Response(result, status=status.HTTP_404_NOT_FOUND)
            return Response(result["recipe"])
        except Exception:
            logger.exception("Recipe details through MCP failed")
            return Response({"error": "mcp_unavailable", "message": "Recipe service is temporarily unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class MCPCapabilitiesView(APIView):
    def get(self, request):
        try:
            return Response(run_async(MCPRecipeClient().capabilities()))
        except Exception:
            logger.exception("MCP capability discovery failed")
            return Response({"error": "mcp_unavailable", "message": "MCP capability discovery is temporarily unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
