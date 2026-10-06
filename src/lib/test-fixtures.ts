// Synthetic ingredients and recipes for the logic tests. Independent of src/data (which is written separately):
// realistic-ish USDA-style numbers, spread over slots, diets, allergens, cuisines and kcal/protein levels.
import type { CatalogRecipe, Cuisine, Ingredient, MealSlot, Nutrients, Profile, Recipe, RecipeIngredient, Unit } from '../types.ts';
import { buildCatalog, indexIngredients, toCatalogRecipe } from './nutrition.ts';

function n(kcal: number, protein: number, carbs: number, fiber: number, sugars: number, fat: number, satFat: number, sodium: number): Nutrients {
  return { kcal, protein, carbs, fiber, sugars, fat, satFat, sodium };
}

export const FIXTURE_INGREDIENTS: Ingredient[] = [
  { id: 'chicken-breast-raw', name: 'Chicken breast (raw)', aisle: 'meat-poultry', per100g: n(120, 22.5, 0, 0, 0, 2.6, 0.6, 45), allergens: [], animal: 'poultry', halalNote: 'Buy halal (zabiha) chicken.' },
  { id: 'lamb-lean-raw', name: 'Lamb, lean (raw)', aisle: 'meat-poultry', per100g: n(160, 20.3, 0, 0, 0, 8.8, 3.9, 66), allergens: [], animal: 'meat', halalNote: 'Buy halal (zabiha) lamb.' },
  { id: 'salmon-raw', name: 'Salmon (raw)', aisle: 'seafood', per100g: n(208, 20, 0, 0, 0, 13.4, 3.1, 59), allergens: ['fish'], animal: 'fish' },
  { id: 'egg-whole-raw', name: 'Egg', aisle: 'dairy-eggs', per100g: n(143, 12.6, 0.7, 0, 0.4, 9.5, 3.1, 142), allergens: ['egg'], animal: 'egg' },
  { id: 'greek-yogurt-2', name: 'Greek yogurt, plain, 2%', aisle: 'dairy-eggs', per100g: n(73, 9.95, 3.9, 0, 3.6, 1.9, 1.2, 34), allergens: ['dairy'], animal: 'dairy' },
  { id: 'lentils-red-dry', name: 'Red lentils (dry)', aisle: 'legumes', per100g: n(358, 24, 63, 10.8, 2, 2.2, 0.4, 7), allergens: [] },
  { id: 'chickpeas-canned-drained', name: 'Chickpeas (canned, drained)', aisle: 'legumes', per100g: n(139, 7, 22.5, 7, 0.4, 2.6, 0.3, 240), allergens: [] },
  { id: 'tofu-firm', name: 'Tofu, firm', aisle: 'legumes', per100g: n(144, 17.3, 2.8, 2.3, 0.6, 8.7, 1.3, 14), allergens: ['soy'] },
  { id: 'bulgur-dry', name: 'Bulgur (dry)', aisle: 'bakery-grains', per100g: n(342, 12.3, 75.9, 18.3, 0.4, 1.3, 0.2, 17), allergens: ['gluten'] },
  { id: 'rice-basmati-raw', name: 'Basmati rice (raw)', aisle: 'bakery-grains', per100g: n(360, 7.5, 79, 1.3, 0.1, 0.6, 0.2, 1), allergens: [] },
  { id: 'bread-whole-wheat', name: 'Whole-wheat bread', aisle: 'bakery-grains', per100g: n(252, 12.4, 42.7, 6, 4.4, 3.5, 0.7, 450), allergens: ['gluten'] },
  { id: 'oats-rolled', name: 'Rolled oats', aisle: 'bakery-grains', per100g: n(379, 13.2, 67.7, 10.1, 1, 6.5, 1.1, 6), allergens: ['gluten'] },
  { id: 'onion', name: 'Onion', aisle: 'produce', per100g: n(40, 1.1, 9.3, 1.7, 4.2, 0.1, 0, 4), allergens: [] },
  { id: 'tomato', name: 'Tomato', aisle: 'produce', per100g: n(18, 0.9, 3.9, 1.2, 2.6, 0.2, 0, 5), allergens: [] },
  { id: 'spinach', name: 'Spinach', aisle: 'produce', per100g: n(23, 2.9, 3.6, 2.2, 0.4, 0.4, 0.1, 79), allergens: [] },
  { id: 'apple', name: 'Apple', aisle: 'produce', per100g: n(52, 0.3, 13.8, 2.4, 10.4, 0.2, 0, 1), allergens: [] },
  { id: 'garlic', name: 'Garlic', aisle: 'produce', per100g: n(149, 6.4, 33, 2.1, 1, 0.5, 0.1, 17), allergens: [] },
  { id: 'parsley', name: 'Parsley', aisle: 'herbs', per100g: n(36, 3, 6.3, 3.3, 0.9, 0.8, 0.1, 56), allergens: [] },
  { id: 'walnuts', name: 'Walnuts', aisle: 'nuts-seeds', per100g: n(654, 15.2, 13.7, 6.7, 2.6, 65.2, 6.1, 2), allergens: ['tree-nut'] },
  { id: 'tahini', name: 'Tahini', aisle: 'nuts-seeds', per100g: n(595, 17, 21, 9.3, 0.5, 53.8, 7.5, 115), allergens: ['sesame'] },
  { id: 'olive-oil', name: 'Olive oil', aisle: 'oils-vinegars', per100g: n(884, 0, 0, 0, 0, 100, 13.8, 2), allergens: [] },
  { id: 'cumin-ground', name: 'Cumin, ground', aisle: 'spices', per100g: n(375, 17.8, 44.2, 10.5, 2.3, 22.3, 1.5, 168), allergens: [] },
  { id: 'salt', name: 'Salt', aisle: 'spices', per100g: n(0, 0, 0, 0, 0, 0, 0, 38758), allergens: [] },
  { id: 'honey', name: 'Honey', aisle: 'baking-sweeteners', per100g: n(304, 0.3, 82.4, 0.2, 82.1, 0, 0, 4), allergens: [], animal: 'honey', freeSugar: true },
  { id: 'water', name: 'Water', aisle: 'other', per100g: n(0, 0, 0, 0, 0, 0, 0, 4), allergens: [] },
];

export const FIXTURE_INDEX = indexIngredients(FIXTURE_INGREDIENTS);

type Line = [ingredientId: string, grams: number, qty?: number, unit?: Unit];

function line([ingredientId, grams, qty, unit]: Line): RecipeIngredient {
  return { ingredientId, grams, qty: qty ?? grams, unit: unit ?? 'g' };
}

function r(
  id: string,
  cuisine: Cuisine,
  slots: MealSlot[],
  servings: number,
  minutes: number,
  lines: Line[],
  extra: Partial<Recipe> = {},
): Recipe {
  const name = id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return {
    id,
    name,
    cuisine,
    slots,
    description: `${name}, a fixture recipe.`,
    servings,
    prepMinutes: Math.min(10, minutes),
    cookMinutes: Math.max(0, minutes - 10),
    ingredients: lines.map(line),
    steps: ['Prepare the ingredients.', 'Cook and serve.'],
    tags: [],
    ...extra,
  };
}

const B: MealSlot[] = ['breakfast'];
const L: MealSlot[] = ['lunch'];
const D: MealSlot[] = ['dinner'];
const LD: MealSlot[] = ['lunch', 'dinner'];
const S: MealSlot[] = ['snack'];
const BS: MealSlot[] = ['breakfast', 'snack'];

export const FIXTURE_RECIPES: Recipe[] = [
  // Breakfast (12 + 2 shared with snacks)
  r('yogurt-oat-bowl', 'western', B, 1, 5, [['greek-yogurt-2', 200, 1, 'cup'], ['oats-rolled', 40], ['walnuts', 15], ['honey', 8, 1, 'tsp']]),
  r('egg-spinach-toast', 'mediterranean', B, 1, 15, [['egg-whole-raw', 100, 2, 'piece'], ['spinach', 60], ['bread-whole-wheat', 60, 2, 'slice'], ['olive-oil', 5], ['salt', 1]]),
  r('tofu-scramble-toast', 'western', B, 1, 15, [['tofu-firm', 150], ['spinach', 60], ['tomato', 100, 1, 'medium'], ['olive-oil', 5], ['bread-whole-wheat', 50, 2, 'slice']]),
  r('breakfast-lentil-soup', 'kurdish', B, 2, 35, [['lentils-red-dry', 120], ['onion', 110, 1, 'medium'], ['cumin-ground', 3, 1, 'tsp'], ['olive-oil', 10], ['salt', 2], ['water', 800]], { nativeName: 'Nîskê' }),
  r('chickpea-tahini-breakfast', 'levantine', B, 1, 10, [['chickpeas-canned-drained', 170], ['tahini', 15, 1, 'tbsp'], ['tomato', 80], ['olive-oil', 5], ['parsley', 10]], { nativeName: 'Msabbaha' }),
  r('salmon-egg-plate', 'western', B, 1, 15, [['salmon-raw', 60], ['egg-whole-raw', 50, 1, 'piece'], ['bread-whole-wheat', 40, 1, 'slice']]),
  r('chicken-egg-wrap', 'turkish', B, 1, 20, [['chicken-breast-raw', 80], ['egg-whole-raw', 50, 1, 'piece'], ['bread-whole-wheat', 60], ['tomato', 50]]),
  r('apple-oat-porridge', 'western', B, 1, 10, [['oats-rolled', 60], ['apple', 120, 1, 'medium'], ['walnuts', 10], ['water', 250]]),
  r('yogurt-apple-walnut', 'persian', B, 1, 5, [['greek-yogurt-2', 250], ['apple', 100], ['walnuts', 15]]),
  r('shakshuka', 'north-african', B, 2, 25, [['egg-whole-raw', 200, 4, 'piece'], ['tomato', 480, 4, 'medium'], ['onion', 110, 1, 'medium'], ['olive-oil', 13.5, 1, 'tbsp'], ['cumin-ground', 2], ['salt', 2], ['garlic', 6, 2, 'clove']]),
  r('tofu-rice-breakfast', 'east-asian', B, 1, 25, [['tofu-firm', 150], ['rice-basmati-raw', 40], ['spinach', 50], ['olive-oil', 5], ['salt', 1]]),
  r('lamb-egg-hash', 'kurdish', B, 1, 25, [['lamb-lean-raw', 60], ['egg-whole-raw', 50, 1, 'piece'], ['onion', 55, 0.5, 'medium'], ['tomato', 80], ['olive-oil', 5]]),
  r('yogurt-honey-cup', 'gulf', BS, 1, 2, [['greek-yogurt-2', 170], ['honey', 8, 1, 'tsp']]),
  r('boiled-eggs', 'western', BS, 1, 12, [['egg-whole-raw', 100, 2, 'piece'], ['salt', 0.5]]),

  // Lunch and dinner (22)
  r('chicken-bulgur-pilaf', 'turkish', LD, 4, 40, [['chicken-breast-raw', 600], ['bulgur-dry', 240], ['onion', 220, 2, 'medium'], ['tomato', 360, 3, 'medium'], ['olive-oil', 27, 2, 'tbsp'], ['salt', 5], ['garlic', 12, 3, 'clove']]),
  r('lamb-rice-quzi', 'iraqi', LD, 4, 90, [['lamb-lean-raw', 480], ['rice-basmati-raw', 280], ['onion', 220, 2, 'medium'], ['olive-oil', 27], ['salt', 5]], { nativeName: 'Quzi' }),
  r('salmon-rice-plate', 'mediterranean', LD, 2, 30, [['salmon-raw', 260], ['rice-basmati-raw', 130], ['spinach', 150], ['olive-oil', 10], ['salt', 2]]),
  r('red-lentil-soup', 'iraqi', LD, 4, 40, [['lentils-red-dry', 380, 2, 'cup'], ['onion', 220, 2, 'medium'], ['tomato', 240, 2, 'medium'], ['olive-oil', 27, 2, 'tbsp'], ['cumin-ground', 5], ['salt', 5], ['water', 1500]], { nativeName: 'Shorbat Adas' }),
  r('chickpea-spinach-stew', 'levantine', LD, 2, 35, [['chickpeas-canned-drained', 480, 2, 'can'], ['tomato', 300], ['onion', 110, 1, 'medium'], ['spinach', 160], ['olive-oil', 16], ['rice-basmati-raw', 110]]),
  r('tofu-stir-fry', 'east-asian', LD, 2, 25, [['tofu-firm', 400], ['rice-basmati-raw', 130], ['spinach', 200], ['olive-oil', 16], ['garlic', 9, 3, 'clove']]),
  r('chicken-chickpea-salad', 'mediterranean', L, 2, 20, [['chicken-breast-raw', 300], ['tomato', 300], ['spinach', 160], ['olive-oil', 20], ['chickpeas-canned-drained', 160]]),
  r('lamb-bulgur-kofta', 'kurdish', LD, 4, 50, [['lamb-lean-raw', 520], ['bulgur-dry', 200], ['onion', 240], ['tomato', 400], ['parsley', 30]], { nativeName: 'Kutilk' }),
  r('mujaddara', 'levantine', LD, 4, 50, [['lentils-red-dry', 280], ['bulgur-dry', 200], ['onion', 440, 4, 'medium'], ['olive-oil', 40]]),
  r('egg-spinach-rice', 'persian', D, 2, 25, [['egg-whole-raw', 300, 6, 'piece'], ['spinach', 200], ['rice-basmati-raw', 120], ['olive-oil', 10]]),
  r('yogurt-chicken-rice', 'gulf', LD, 4, 45, [['chicken-breast-raw', 600], ['greek-yogurt-2', 400], ['rice-basmati-raw', 240], ['onion', 110], ['salt', 4]]),
  r('salmon-bulgur-salad', 'mediterranean', L, 2, 25, [['salmon-raw', 240], ['bulgur-dry', 100], ['tomato', 200], ['spinach', 100], ['parsley', 20]]),
  r('chickpea-tahini-rice', 'egyptian', LD, 2, 30, [['chickpeas-canned-drained', 400], ['tahini', 40], ['rice-basmati-raw', 100], ['tomato', 200]]),
  r('tofu-lentil-curry', 'south-asian', LD, 4, 40, [['tofu-firm', 480], ['lentils-red-dry', 200], ['tomato', 600], ['onion', 240], ['cumin-ground', 6]]),
  r('lamb-chickpea-stew', 'iraqi', D, 4, 80, [['lamb-lean-raw', 400], ['chickpeas-canned-drained', 600], ['tomato', 600], ['onion', 240], ['rice-basmati-raw', 160]], { nativeName: 'Marga' }),
  r('chicken-lentil-soup', 'kurdish', LD, 4, 45, [['chicken-breast-raw', 400], ['lentils-red-dry', 200], ['onion', 220], ['tomato', 240], ['water', 1500], ['olive-oil', 13.5]]),
  r('vegetable-bulgur-pilaf', 'turkish', LD, 4, 40, [['bulgur-dry', 320], ['tomato', 800], ['onion', 330], ['spinach', 400], ['olive-oil', 40], ['chickpeas-canned-drained', 400]]),
  r('egg-yogurt-fatteh', 'levantine', D, 2, 25, [['egg-whole-raw', 200], ['greek-yogurt-2', 300], ['bread-whole-wheat', 120], ['chickpeas-canned-drained', 200]]),
  r('walnut-lentil-salad', 'persian', LD, 2, 30, [['lentils-red-dry', 140], ['walnuts', 40], ['tomato', 200], ['spinach', 120], ['olive-oil', 10]]),
  r('salmon-chickpea-bowl', 'western', D, 2, 30, [['salmon-raw', 200], ['chickpeas-canned-drained', 300], ['spinach', 160], ['rice-basmati-raw', 60]]),
  r('chicken-tahini-wrap', 'levantine', L, 2, 20, [['chicken-breast-raw', 260], ['bread-whole-wheat', 160], ['tahini', 30], ['tomato', 160]]),
  r('tofu-bulgur-bowl', 'western', LD, 2, 30, [['tofu-firm', 300], ['bulgur-dry', 120], ['tomato', 200], ['olive-oil', 10]]),

  // Snacks (9 + 2 shared with breakfast)
  r('apple-walnuts', 'western', S, 1, 2, [['apple', 150, 1, 'medium'], ['walnuts', 15]]),
  r('hummus-tomato', 'levantine', S, 2, 10, [['chickpeas-canned-drained', 200], ['tahini', 20], ['tomato', 160], ['garlic', 3, 1, 'clove']]),
  r('roasted-chickpeas', 'north-african', S, 2, 35, [['chickpeas-canned-drained', 240], ['olive-oil', 10], ['cumin-ground', 2], ['salt', 1]]),
  r('oat-apple-bites', 'western', S, 2, 25, [['oats-rolled', 80], ['apple', 120], ['walnuts', 20]]),
  r('yogurt-spinach-dip', 'persian', S, 2, 10, [['greek-yogurt-2', 300], ['spinach', 80], ['bread-whole-wheat', 60]], { nativeName: 'Borani' }),
  r('tofu-bites', 'east-asian', S, 1, 20, [['tofu-firm', 100], ['olive-oil', 3]]),
  r('salmon-toast-snack', 'western', S, 1, 10, [['salmon-raw', 40], ['bread-whole-wheat', 30, 1, 'slice']]),
  r('chicken-bites', 'gulf', S, 1, 20, [['chicken-breast-raw', 80], ['olive-oil', 3]]),
  r('tomato-bread-snack', 'mediterranean', S, 1, 5, [['bread-whole-wheat', 40], ['tomato', 120, 1, 'medium'], ['olive-oil', 5]]),
];

export const FIXTURE_CATALOG: CatalogRecipe[] = buildCatalog(FIXTURE_RECIPES, FIXTURE_INDEX);
export const FIXTURE_BY_ID: ReadonlyMap<string, CatalogRecipe> = new Map(FIXTURE_CATALOG.map((c) => [c.id, c]));

/**
 * A bigger catalog built from the fixtures: `copies` variants of every recipe, each with a new id, a slightly
 * different size and a rotated cuisine. Used for greedy-mode pools and the performance test.
 */
export function expandedCatalog(copies: number): CatalogRecipe[] {
  const cuisines: Cuisine[] = ['kurdish', 'iraqi', 'levantine', 'turkish', 'persian', 'gulf', 'mediterranean', 'western'];
  const out: Recipe[] = [];
  for (let c = 0; c < copies; c++) {
    for (const [i, base] of FIXTURE_RECIPES.entries()) {
      const scale = 0.85 + ((c * 7 + i) % 7) * 0.05;
      out.push({
        ...base,
        id: c === 0 ? base.id : `${base.id}-v${c}`,
        name: c === 0 ? base.name : `${base.name} ${c}`,
        cuisine: c === 0 ? base.cuisine : (cuisines[(i + c) % cuisines.length] as Cuisine),
        ingredients: base.ingredients.map((ri) => ({ ...ri, grams: ri.grams * (c === 0 ? 1 : scale), qty: ri.unit === 'g' ? ri.grams * (c === 0 ? 1 : scale) : ri.qty })),
      });
    }
  }
  return buildCatalog(out, FIXTURE_INDEX);
}

/** A profile with SPEC defaults, overridable. */
export function makeProfile(patch: Partial<Profile> = {}): Profile {
  return {
    kcalTarget: 2000,
    proteinTarget: 90,
    snacksPerDay: 1,
    diet: 'omnivore',
    excludeAllergens: [],
    dislikedIngredients: [],
    maxTotalMinutes: null,
    weekStart: 'saturday',
    householdSize: 1,
    ...patch,
  };
}

/**
 * A one-serving recipe for structural tests: listed for `slots`, about `kcal` per serving (red lentils, a little
 * onion and oil), in `cuisine`.
 */
export function syntheticRecipe(id: string, slots: MealSlot[], kcal: number, cuisine: Cuisine = 'western', extra: Partial<Recipe> = {}): CatalogRecipe {
  const lentils = Math.max(5, (kcal - 40) / 3.58);
  return toCatalogRecipe(r(id, cuisine, slots, 1, 20, [['lentils-red-dry', lentils], ['onion', 55, 0.5, 'medium'], ['olive-oil', 2]], extra), FIXTURE_INDEX);
}
