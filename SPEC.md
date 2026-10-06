# Sufra spec

Sufra (سفرة, the spread a meal is laid on) is an offline-first web app (PWA) that suggests healthy **halal** meals every day: breakfast, lunch, dinner and 0-2 snacks, each with a full recipe. Plans are balanced to the user's calorie and protein targets and respect their diet and allergies. The food is Kurdish, plus dishes close to Kurdish cooking from the neighbouring Iraqi, Turkish, Persian and Levantine kitchens, and simple, easy desserts (planned as snacks). No other cuisines. The UI is English first and ready for translation (Sorani Kurdish and Arabic, RTL, come later).

Everything runs in the browser. There is no backend, account or network call. Recipes ship with the app.

## Stack and conventions

- React 19.2, Vite 8, TypeScript 6 (strict, `erasableSyntaxOnly`), Vitest 4. Package manager: **pnpm**.
- **Never add a dependency** without the user's explicit approval. Everything else is hand-written: CSS, hash router, service worker, icons.
- Relative imports always carry the file extension (`'../types.ts'`, `'./Card.tsx'`). Node runs `scripts/*.mjs` against the real sources by stripping types, so imports must resolve without a bundler. Use `import type` for types. No enums or namespaces.
- `src/types.ts` is the shared contract. Don't change it without a reason. If you must, keep it backward compatible and mention it in your final report.
- Commands: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm report [filter]` (recipe nutrition + validation), `pnpm audit:age`, `pnpm verify` (all of them).
- Do not `git commit`. Do not install packages.

## Layout and ownership

```
src/types.ts                  shared contract (main agent)
src/lib/nutrition.ts          nutrition math, diet flags, catalog building (main agent; extend, don't break)
src/data/                     recipe library, owned by the data workflow
  ingredients/*.ts            ingredient tables by aisle group, per-100 g USDA values
  ingredients/extra/<chunk>.ts  ingredients added while writing recipes/<chunk>.ts
  recipes/<chunk>.ts          recipes, one file per "chunk" (breakfast, lunch, dinner, snacks, desserts)
  validate.ts, coverage.ts    quality gates (health rules, halal, unit sanity, coverage)
  index.ts                    INGREDIENTS, ingredientIndex, CATALOG, catalogById
src/lib/                      pure logic: planner, filters, targets, shopping, dates, format, storage, random
src/ui/, src/main.tsx, src/i18n/, src/styles/, public/, index.html   the app
scripts/                      report.mjs, audit-package-age.mjs, icon generation
```

## Recipe data rules

### Ingredients (`src/data/ingredients/*.ts`)

- `per100g` values come from **USDA FoodData Central** (SR Legacy or Foundation Foods) for the exact state the id names. Raw vs cooked and dry vs canned matter: `rice-basmati-raw`, `chickpeas-dried`, `chickpeas-canned-drained`, `chicken-breast-raw`. Weigh everything in the state it goes into the pot.
- `carbs` is total carbohydrate **including** fiber. kcal has to agree with the macros (Atwater check in `validate.ts`).
- Allergens: the 9 in `ALLERGENS`. Wheat, barley, rye, bulgur, freekeh, semolina, couscous, regular oats and soy sauce carry `gluten`. Tahini, za'atar blends and sesame seeds carry `sesame`.
- `animal` drives the derived flags: meat, poultry, fish, shellfish, dairy, egg, honey. Dairy products need `animal: 'dairy'` and the `dairy` allergen.
- **Halal**: no pork or pork products, no alcohol (wine, beer, mirin, sake, spirits, wine or sherry vinegar, vanilla extract), no gelatin, no blood. Every meat and poultry ingredient needs a `halalNote` ("Buy halal (zabiha) lamb."). Cheese: note microbial rennet or halal-certified. Soy sauce: note halal-certified. Stocks: low-sodium, halal-certified for chicken or beef stock.
- `freeSugar: true` on sugar, honey, date syrup, molasses, jam, maple syrup and fruit juice. Whole and dried fruit are **not** free sugar.
- Names are sentence case, singular or mass nouns: 'Onion', 'Red lentils (dry)', 'Greek yogurt, plain, 2%'.

### Recipes (`src/data/recipes/<chunk>.ts`)

- **Cuisine scope.** Only Kurdish dishes and close neighbours: `kurdish`, `iraqi`, `turkish`, `persian`, `levantine`. Desserts go in `recipes/desserts.ts` with slot `snack`; they should be easy to make and may come from any kitchen when they're simple (fruit, yogurt, oat or date sweets), though regional ones (rice pudding, kleicha, hoşaf) come first.

- `ingredients[].grams` is for the whole recipe. `qty` and `unit` are the human amount for the whole recipe and must agree with the grams. Useful weights: 1 tbsp oil 13.5 g, 1 tsp salt 6 g, 1 tsp ground spice 2-3 g, 1 garlic clove 3-5 g, 1 medium onion 110 g, 1 medium tomato 120 g, 1 large egg 50 g, 1 cup cooked rice 160-190 g, 1 cup dry red lentils 190 g, 1 cup plain yogurt 245 g, 1 cup chopped parsley 60 g.
- **Measure the salt.** No "salt to taste" without grams: sodium has to be real.
- Diet flags and allergens are derived from ingredients, so don't tag them. `tags` is descriptive only, and `quick`, `no-cook`, `high-protein` and `high-fiber` are validated.
- Steps are imperative and concrete: heat level, time, temperature in °C, doneness cues. One action group per step, 4-9 steps. Every listed ingredient appears in the steps and nothing unlisted is used.
- Healthy cooking: whole grains where they fit (bulgur, freekeh, brown or basmati rice, whole-wheat bread), lots of vegetables and legumes, lean proteins, measured olive oil, yogurt instead of cream, spices and herbs instead of salt, baked or grilled rather than deep-fried. Keep dishes recognizable. A lighter version of a classic is fine and the description says so.
- Kurdish and Iraqi dishes must be authentic in name and method. `nativeName` is a common transliteration (Kurmanji/Sorani/Iraqi Arabic as appropriate).

### Health rules (per serving, portion 1), enforced by `validate.ts`

| slot | kcal | protein ≥ | fiber ≥ | sodium ≤ | free sugar ≤ |
|---|---|---|---|---|---|
| breakfast | 250-650 | 10 g | 3 g | 700 mg | 12 g |
| lunch / dinner | 350-800 | 15 g | 4 g | 900 mg | 8 g |
| snack | 80-350 | none | none | 350 mg | 10 g |

Saturated fat is at most 12% of energy (warning above 10%). Total fat above 45% of energy is a warning. A recipe listed for several slots must satisfy the protein, fiber, sodium and sugar rules for every slot, and its kcal must fit at least one. `pnpm report <chunk>` shows the numbers and issues. `pnpm test` fails on any error.

### Coverage (`coverage.ts`)

The finished library must have enough recipes per slot under each filter (vegetarian, vegan, gluten-free, dairy-free, nut-free, egg-free, ready in 30 minutes) to plan a week without repeats. `pnpm report` prints the table.

## Planner (`src/lib/planner.ts`)

Requirements:

1. **Deterministic and pure.** The same date, profile, catalog, favorites and overrides always give the same plan. Use a seeded PRNG from `src/lib/random.ts`. No `Math.random` or `Date.now` in planning; dates are passed in as `YYYY-MM-DD` local strings. The seed is a constant and every order is keyed on recipe ids, so a setting that leaves every slot's pool unchanged (excluding an allergen no recipe has) changes nothing, and a recipe joining or leaving a pool moves only a few meals.
2. **Eligibility.** A recipe is only planned in a slot it lists, and only if it passes the profile's filters: diet (vegan ⊂ vegetarian ⊂ pescatarian ⊂ omnivore), excluded allergens, disliked ingredients, `maxTotalMinutes`.
3. **Variety.** No recipe twice on the same day. Within any 7 consecutive days, no recipe repeats in the same slot while the eligible pool has at least 7 recipes. This holds **across week boundaries**. With a smaller pool, spread repeats as far apart as possible. Vary cuisines and main proteins, and for omnivores include legume-based mains several times a week.
4. **Balance.** Portions come from {0.5, 0.75, 1, 1.25, 1.5, 1.75, 2}. Energy split by slot: no snacks 30/40/30; 1 snack 25/35/30 + 10; 2 snacks 22/32/28 + 9 + 9. The day's kcal lands within ±10% of target whenever the pool allows, and protein reaches at least 90% of target when achievable. Prefer higher-protein choices when the day is behind.
5. **Favorites** get a mild preference without breaking the variety rules: once a 28-day block has served a favorite, it comes back sooner in that block. A favorite never reorders anything before that: favoriting a recipe changes no day of a block up to the first day the block serves it, and never the last 6 days of a block.
6. **Overrides** (the user's swaps and "add to day" choices) win for their date, slot and index. Other meals of that day stay as generated (stable UI). Totals are recomputed.
7. **Swap candidates**: for a date, slot and index, return the best N eligible alternatives. Rank by fit to that meal's kcal budget (with its best portion), protein, sodium (against what the rest of the day leaves of the daily budget, R10) and variety, excluding recipes already in that day.
8. **Unfillable meals** go in `DayPlan.unfilled` when the filters leave no candidate. Never throw.
9. Fast: planning 7 days over 150 recipes takes well under 20 ms.
10. **Health, below the kcal and protein guarantees.** These are scores and costs that rank choices of equal kcal and protein standing, so they never cost R4:
    - **Sodium:** a soft daily budget of 2,000 mg (WHO), absolute, not scaled by the kcal target. Picks weigh a recipe's sodium against what the day's other meals leave, capped so a salty recipe still gets its turn; portions count sodium above the budget once kcal lands.
    - **Red meat:** about 600 g raw (about 430 g cooked, within the WCRF 350-500 g cooked) over any 7 days. A red-meat main past that costs in picks, and once protein reaches the floor it isn't scaled past 1.25 servings. A main with oily fish (salmon, mackerel, sardines, trout) gets a small bonus when none was served in the last 6 days.
    - **A sensible day:** each meal stays between 0.65 and 1.5 times its share of the day's energy, plates above 1.5 servings (a double bowl of soup) cost a little, and portions give whole or half eggs, tortillas, flatbreads and bread slices.
    - **Weight loss:** when the body stats' goal is to lose weight, kcal above the target costs a little, so equal days land at or under it. The protein floor can still push a day over.

## Other logic

- `targets.ts`: Mifflin-St Jeor BMR × activity factor (1.2 / 1.375 / 1.55 / 1.725 / 1.9). Goal: lose −15%, gain +10%. Floor at 1200 kcal for women and 1500 for men. Protein 1.6 g/kg to lose, 1.2 g/kg to maintain, 1.6 g/kg to gain, rounded to 5 g. Kcal rounded to 50.
- `shopping.ts`: aggregate over a date range. Amount = recipe grams × portion ÷ servings × householdSize. Group by aisle in `AISLES` order and merge by ingredient id; variants that differ only in fat or salt (90% vs 95% lean beef, regular vs low-sodium beans) share one line named after the lower-salt variant. Round up to buyable steps (5 g under 50 g, then 10 g, 50 g, 100 g; kg from 1000 g). Counted things lead with the count: eggs, cans, slices, pieces, and fresh herbs by the bunch (60 g), e.g. "Egg: 11 (≈ 550 g)". When every contributing line uses the same size unit (medium, clove...), show it too ("≈ 3 medium"). Water isn't listed. Spices, salt, oils, vinegars, leaveners, and sweeteners or sauces under 30 g in total go in a collapsed "pantry staples" group.
- `storage.ts`: one localStorage key `sufra:v1`, versioned and schema-checked, every access in try/catch. The app works when storage is unavailable. It holds profile, favorites, overrides, shopping checkmarks, onboarding state and theme choice.
- Default profile: 2000 kcal, 90 g protein, 1 snack, omnivore, no exclusions, no time limit, week starts Saturday, household 1.

## App

Mobile-first PWA with a bottom tab bar on phones and a side or top nav on wide screens.

- **Today**: day navigation (‹ date ›, a "Today" pill). A summary of kcal against target and protein, carbs, fat and fiber. Meal cards in order: slot, recipe name, native name, cuisine, time, kcal and protein for the planned portion, portion chip, diet badges. Actions: **Swap** (a sheet of alternatives with kcal, protein and time), **Favorite**, open recipe.
- **Recipe**: name and native name, description, time and servings chips, nutrition for the planned portion (all 8 nutrients, with % of daily target for kcal and protein), allergens, halal notes, ingredients scaled by a servings stepper (defaults to householdSize × portion), numbered steps you can tick off, tips, storage, and a "Watch how it's made" link to a reference YouTube video (`src/data/videos.ts`, each checked against YouTube's oEmbed data; a YouTube search link when none was picked). Videos are only linked, opening in a new tab: never embedded, no thumbnails fetched, so the app itself still makes no network requests. Keep the screen awake while cooking (Wake Lock API when available).
- **Week**: the 7 days of the current week with meals and daily kcal. Tap a day to open it.
- **Shopping**: range (today / next 3 days / this week), grouped by aisle, persisted checkboxes, collapsed pantry staples, copy or share as text.
- **Recipes**: browse the library. Search by name or ingredient, filter by slot, diet, quick and cuisine, show favorites. "Add to a day" creates an override.
- **Settings**: targets with the calculator; diet; allergens; disliked ingredients (searchable picker); snacks per day; max cooking time; household size; week start; theme (system/light/dark); reset. An About section with the halal statement and a nutrition disclaimer (estimates from USDA data, not medical advice).
- **First run**: short onboarding (targets or calculator, diet, allergens) with "Skip, use defaults".
- **Quality bar**: every string goes through `t()` from `src/i18n/en.ts`. CSS uses logical properties (RTL-ready) and design tokens on `:root`, with light and dark. WCAG AA contrast, 44 px touch targets, visible focus, labelled controls, `prefers-reduced-motion`. No external fonts or network requests.
- **PWA**: `manifest.webmanifest` with 192, 512 and maskable PNG icons and an apple-touch-icon. A hand-written service worker precaches the built app shell and assets (list generated at build time), serves navigations network-first with an offline fallback, and is registered only in production builds.
