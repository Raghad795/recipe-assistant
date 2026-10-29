# Recipe Assistant

A local recipe discovery app built with Python 3.11, Django REST Framework, and the MCP Python SDK. It includes an Arabic right-to-left web interface and a JSON API, and matches ingredients against a bundled catalog of 20 recipes. It uses deterministic Python rules and requires no AI service, API key, or external recipe source.

## Architecture

```text
Insomnia / HTTP client
  -> Django REST Framework serializers and views
  -> RuleBasedSupervisor -> RecipeAgent
  -> asynchronous MCP Python client over stdio
  -> automatically launched MCP server subprocess
  -> recipe tools, resources, and prompts
```

Every REST request needing recipe data starts an MCP server subprocess, initializes an MCP session, discovers/calls the protocol endpoint, and closes the subprocess. The HTTP handlers bridge Django's synchronous request lifecycle to the asynchronous MCP client. Recipe matching logic is shared as server-side tool implementation, but Django does not call that logic directly: its agent sends `tools/call` over MCP stdio.

The MCP server publishes `recipe_search_tool` and `recipe_details_tool`; resources `recipes://catalog` and `recipes://matching-rules`; and prompts `recipe_assistant_prompt` and `recipe_details_prompt`. The capability endpoint discovers these through MCP and also reads both resources and retrieves both prompts. Prompts are reusable text instructions. No AI model interprets or executes them in this project.

Ingredient names are case-insensitive, and surrounding/repeated whitespace is normalized. Match percentage is the count of matched required ingredients divided by all required ingredients, multiplied by 100 and rounded to the nearest integer. Optional ingredients are excluded. Search results sort by percentage descending and then recipe name ascending. `available_ingredients` lists the recipe ingredients matched from the user's input. A partial match includes missing ingredients and is never described as fully available.

## Prerequisites and installation

Python 3.11 or newer is required by the selected MCP SDK 1.x line. The SDK is pinned below major version 2 because its 2.x line introduced breaking client/server API changes.

### Windows PowerShell

```powershell
cd "C:\path\to\Recipe Assistant"
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that PowerShell window, then activate again.

### macOS / Linux

```bash
cd "/path/to/Recipe Assistant"
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Database and checks

The initial recipe catalog is Python data and does not require database models. Django migrations are still safe to run for the installed framework apps:

```powershell
python manage.py migrate
python manage.py check
python manage.py test
python test_mcp.py
```

Cross-platform, use the same `python manage.py ...` commands after activating the virtual environment. The tests include actual stdio subprocess tests that discover MCP capabilities, read resources/prompts, and call tools.

## Start the API

```powershell
python manage.py runserver 127.0.0.1:8000
```

Use the same command on macOS/Linux. The MCP server starts automatically when an API request needs it; do not start it separately. The initial configuration is for local development only, with no authentication or production deployment hardening.

## Web interface

Open `http://127.0.0.1:8000/` after starting Django. The interface is Arabic and right-to-left. It provides ingredient search, match threshold adjustment, recipe cards with missing-ingredient indicators, saved recipes in browser storage, and full recipe detail dialogs. The interface accepts a small built-in set of Arabic ingredient names and maps them to the English catalog. The API itself expects the catalog's English ingredient names.

## API endpoints

All responses are JSON. Validation errors use HTTP 400, unknown recipe IDs use HTTP 404, and MCP startup/communication failures use HTTP 503.

### Search recipes

`POST http://127.0.0.1:8000/api/recipes/search/`

```json
{
  "ingredients": ["chicken", "rice", "onion", "tomato", "garlic"],
  "min_match_percentage": 40,
  "limit": 10
}
```

`ingredients` is required and must contain 1–100 nonblank strings. `min_match_percentage` is an integer from 0 to 100 and defaults to 30. `limit` is an integer from 1 to 50 and defaults to 10.

Example response (the results array is shortened here):

```json
{
  "results": [
    {
      "recipe": {"id": "chicken-rice", "name": "Chicken and Rice", "description": "A comforting one-pot chicken and rice meal.", "ingredients": [], "preparation_time_minutes": 15, "cooking_time_minutes": 35, "difficulty": "easy", "servings": 4, "dietary_tags": ["gluten-free"], "instructions": []},
      "match_percentage": 100,
      "matched_ingredients": ["chicken", "rice", "onion", "tomato", "garlic"],
      "missing_ingredients": [],
      "available_ingredients": ["chicken", "rice", "onion", "tomato", "garlic"]
    }
  ],
  "count": 1,
  "suggestion": null
}
```

The actual response includes complete ingredient and instruction arrays. A partial result carries the absent required ingredient names. If no recipe meets the threshold, `results` is empty and `suggestion` advises adding ingredients or lowering the threshold.

### Recipe details

`GET http://127.0.0.1:8000/api/recipes/chicken-rice/`

Returns the complete recipe object, including quantity/unit per ingredient, cooking instructions, times, difficulty, servings, and tags. Unknown IDs return `{"error":"recipe_not_found", ...}` with status 404.

### MCP capabilities

`GET http://127.0.0.1:8000/api/mcp/capabilities/`

Returns the tools, resources, and prompts discovered from the running MCP subprocess. Its `retrieved` object confirms catalog/rules resource reads and prompt retrieval.

## Test with Insomnia

1. Create a collection named **Recipe Assistant**, and start Django using the command above.
2. Add a request named **Search recipes**. Select `POST`, enter `http://127.0.0.1:8000/api/recipes/search/`, choose **Body → JSON**, paste the search JSON above, and send it. Expect status 200 and ranked recipe matches.
3. Add **Recipe details**. Select `GET`, enter `http://127.0.0.1:8000/api/recipes/chicken-rice/`, and send. Expect status 200 and the complete Chicken and Rice object. Change the final path component to `unknown-id` to see the 404 response.
4. Add **MCP capabilities**. Select `GET`, enter `http://127.0.0.1:8000/api/mcp/capabilities/`, and send. Expect status 200 and discovered tools/resources/prompts plus retrieved text/data.
5. To check validation, send the search request with `{"ingredients": []}` or with `min_match_percentage` set to 101; expect status 400 with field-level details.

## Project layout

```text
config/                 Django settings and URL/ASGI/WSGI configuration
templates/recipes/       Arabic web interface template
static/recipes/          Responsive CSS and browser-side API integration
recipes/                API, validation, local data, agent, and matching service
recipes/agents/          Rule-based supervisor and recipe agent
recipes/services/        Ingredient matcher and asynchronous MCP client
mcp_server/              MCP stdio server with tools, resources, and prompts
manage.py
requirements.txt
test_mcp.py              Standalone MCP protocol integration smoke test
```

## Limitations

- Matching uses exact normalized ingredient names; it does not infer substitutions, quantities on hand, or ingredient units. Arabic ingredient translation in the web interface covers a limited list.
- The bundled catalog is intentionally small and static. Edit `recipes/recipe_data.py` to add recipes.
- A server subprocess is started per MCP operation. This keeps lifecycle management simple for local development but adds process startup overhead.
- There is no authentication, server-side user-specific storage, or production server configuration.
