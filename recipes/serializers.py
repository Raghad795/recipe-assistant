from rest_framework import serializers

class RecipeSearchSerializer(serializers.Serializer):
    ingredients = serializers.ListField(child=serializers.CharField(max_length=100, allow_blank=False, trim_whitespace=True), allow_empty=False, max_length=100)
    min_match_percentage = serializers.IntegerField(min_value=0, max_value=100, required=False, default=30)
    limit = serializers.IntegerField(min_value=1, max_value=50, required=False, default=10)

    def validate_ingredients(self, value):
        cleaned = [item.strip() for item in value]
        if any(not item for item in cleaned):
            raise serializers.ValidationError("Ingredients must not be blank.")
        if len({item.casefold() for item in cleaned}) != len(cleaned):
            raise serializers.ValidationError("Ingredients must be unique after normalization.")
        return cleaned
