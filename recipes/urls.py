from django.urls import path
from recipes.views import MCPCapabilitiesView, RecipeDetailView, RecipeSearchView

urlpatterns = [
    path("recipes/search/", RecipeSearchView.as_view(), name="recipe-search"),
    path("recipes/<str:recipe_id>/", RecipeDetailView.as_view(), name="recipe-detail"),
    path("mcp/capabilities/", MCPCapabilitiesView.as_view(), name="mcp-capabilities"),
]
