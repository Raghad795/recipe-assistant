"""Pure recipe search and matching logic."""
from recipes.recipe_data import RECIPES

def normalize_ingredient(value):
    return " ".join(value.casefold().split())

def find_recipe(recipe_id):
    return next((recipe for recipe in RECIPES if recipe["id"] == recipe_id), None)

def search_recipes(ingredients, min_match_percentage=30, limit=10):
    available = {normalize_ingredient(item) for item in ingredients}
    if not available:
        return []
    results = []
    for recipe in RECIPES:
        required = [item["name"] for item in recipe["ingredients"] if not item.get("optional", False)]
        matched = [name for name in required if normalize_ingredient(name) in available]
        missing = [name for name in required if normalize_ingredient(name) not in available]
        percentage = round(len(matched) * 100 / len(required)) if required else 0
        if percentage < min_match_percentage:
            continue
        results.append({"recipe": recipe, "match_percentage": percentage,
                        "matched_ingredients": matched, "missing_ingredients": missing,
                        "available_ingredients": matched})
    results.sort(key=lambda item: (-item["match_percentage"], item["recipe"]["name"].casefold()))
    return results[:limit]
