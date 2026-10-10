# Recipe photo workflow

Choose real, openly licensed photos for recipes in Sufra (/Users/revansarbast/Documents/personal/projects/sufra), a halal meal-planner PWA. Each recipe page shows its photo (or a drawn plate when there is none), with a credit line.

## Which recipes need a photo
Every recipe ends with either a photo or a recorded "no photo" decision in `photos/<id>.json`. Recipes with neither still need one: `node scripts/photos/manifest.mjs` lists them under "Not searched yet". Read the recipe itself when useful: `grep -n "id: '<id>'" -A40 src/data/recipes/*.ts`.

## The tools (run from the project root; read the header comment of each script first)
- `node scripts/photos/search.mjs <id> [--q "words"]... [--openverse] [--more]` — searches Wikimedia Commons (and Openverse with --openverse) for licence-safe candidates and saves previews `.photo-work/<id>/c01.jpg`, `c02.jpg` … plus `candidates.json` (title, author, licence, size). Without --q it searches the recipe name and native name. Add your own queries: native names in their script (Arabic, Persian, Turkish, Kurdish, Hindi, Thai, Chinese, Japanese, Korean...), common English names, spelling variants. --more appends to existing candidates.
- LOOK at the previews with the Read tool (they are images) before choosing. Never choose from titles alone.
- `node scripts/photos/select.mjs <id> <cNN> --alt "..." --focus x,y` — downloads the chosen original, makes the 960 px and 400 px WebP files, records the credit, regenerates src/data/photos.ts.
- `node scripts/photos/none.mjs <id> --reason "..."` — records that no suitable photo exists (the page keeps its drawn plate). The reason says what you searched and why nothing fit.

## What to choose
- The photo must clearly show THIS dish, as a cook would recognise it: the same dish and essentially the same form. A meat version for a vegetarian recipe, a different dish with a similar name, raw ingredients, a restaurant menu, a market stall, packaging, or an unrecognisable close-up do NOT count. If in doubt, record none — a wrong photo is worse than the drawn plate.
- Halal: reject photos that visibly show pork, wine/beer glasses or bottles, or bacon/ham toppings.
- Prefer appetising, well-lit, in-focus, plated food; avoid heavy watermarks, people's faces as the subject, collages and text overlays.
- Licence and attribution are handled by the scripts (only CC0, public domain, CC BY, CC BY-SA pass); never bypass them or fetch images another way.
- Alt text: a concrete description of what is in the photo (≥ 15 characters), e.g. "Bowl of red lentil soup with a lemon wedge and parsley on a blue cloth". Don't claim things you can't see.
- Focus: where the food sits in the frame, as percentages from left and top, so square and wide crops keep it in view (default 50,50).
- Each photo file may be used for only one recipe: check `grep -l "<source url fragment>" photos/*.json` if a candidate looks familiar.
- Spend a reasonable effort per recipe: the default search, then 2–4 more queries (native script, variants, --openverse) before recording none.

## Rules
- Touch nothing except via these scripts (they write photos/<id>.json, public/images/<id>*.webp and src/data/photos.ts). Do not edit recipe files, do not git commit, do not install packages, do not start a dev server.
- Several agents run at once; the scripts handle the shared Openverse budget. If Commons or Openverse rate-limit you, wait and retry rather than giving up.
- Process every id in your batch: each must end with either select or none.

## When done
Run `node scripts/photos/manifest.mjs` once more (it regenerates src/data/photos.ts from every photos/*.json) and `pnpm test src/data` (photos.test.ts checks licences, credits and that no image file is orphaned).
