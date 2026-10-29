"""Rule-based routing; no language model is used."""
class RuleBasedSupervisor:
    def route(self, intent):
        if intent in {"search", "recipe_search"}:
            from recipes.agents.recipe_agent import RecipeAgent
            return RecipeAgent()
        if intent in {"details", "recipe_details"}:
            from recipes.agents.recipe_agent import RecipeAgent
            return RecipeAgent()
        raise ValueError(f"Unsupported recipe intent: {intent}")
