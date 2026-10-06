// Shared contracts for Sufra. Data files, planner logic and UI all code against these.
// Changing a type here is a cross-cutting change: update SPEC.md alongside it.

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export type Allergen =
  | 'gluten'
  | 'dairy'
  | 'egg'
  | 'tree-nut'
  | 'peanut'
  | 'sesame'
  | 'soy'
  | 'fish'
  | 'shellfish';

export const ALLERGENS: readonly Allergen[] = [
  'gluten',
  'dairy',
  'egg',
  'tree-nut',
  'peanut',
  'sesame',
  'soy',
  'fish',
  'shellfish',
];

/** Where an animal-derived ingredient comes from. Drives the derived diet flags. */
export type AnimalSource = 'meat' | 'poultry' | 'fish' | 'shellfish' | 'dairy' | 'egg' | 'honey';

/** Shopping-list grouping. */
export type Aisle =
  | 'produce'
  | 'herbs'
  | 'meat-poultry'
  | 'seafood'
  | 'dairy-eggs'
  | 'bakery-grains'
  | 'legumes'
  | 'nuts-seeds'
  | 'oils-vinegars'
  | 'spices'
  | 'condiments-sauces'
  | 'canned-jarred'
  | 'frozen'
  | 'baking-sweeteners'
  | 'other';

export const AISLES: readonly Aisle[] = [
  'produce',
  'herbs',
  'meat-poultry',
  'seafood',
  'dairy-eggs',
  'bakery-grains',
  'legumes',
  'nuts-seeds',
  'oils-vinegars',
  'spices',
  'condiments-sauces',
  'canned-jarred',
  'frozen',
  'baking-sweeteners',
  'other',
];

/** Grams unless noted. kcal is kilocalories, sodium is milligrams. */
export interface Nutrients {
  kcal: number;
  protein: number;
  /** Total carbohydrate, including fiber (US label convention, as USDA reports it). */
  carbs: number;
  fiber: number;
  sugars: number;
  fat: number;
  satFat: number;
  /** Milligrams. */
  sodium: number;
}

export const NUTRIENT_KEYS: readonly (keyof Nutrients)[] = [
  'kcal',
  'protein',
  'carbs',
  'fiber',
  'sugars',
  'fat',
  'satFat',
  'sodium',
];

export interface Ingredient {
  /** kebab-case, unique, describes the state it's weighed in: 'chickpeas-canned-drained', 'rice-basmati-raw'. */
  id: string;
  /** Display name, singular or mass noun, sentence case: 'Onion', 'Chickpeas (canned, drained)'. */
  name: string;
  aisle: Aisle;
  /** Per 100 g edible portion, in the state the id names. Values from USDA FoodData Central. */
  per100g: Nutrients;
  allergens: Allergen[];
  animal?: AnimalSource;
  /** Counts toward free/added sugar (sugar, honey, syrups, date syrup, jam, fruit juice). */
  freeSugar?: boolean;
  /** Halal sourcing advice shown on recipes that use it, e.g. 'Buy halal (zabiha) lamb.' */
  halalNote?: string;
}

/**
 * Human-facing measure. Size words ('small' | 'medium' | 'large') read as "1 medium onion".
 * 'piece' renders as a bare count ("2 eggs"). 'to-taste' has qty 0 and still carries grams.
 */
export type Unit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'pinch'
  | 'clove'
  | 'slice'
  | 'piece'
  | 'small'
  | 'medium'
  | 'large'
  | 'bunch'
  | 'sprig'
  | 'handful'
  | 'can'
  | 'stalk'
  | 'leaf'
  | 'to-taste';

export interface RecipeIngredient {
  ingredientId: string;
  /** Grams for the whole recipe (all servings), in the state the ingredient id names. Drives nutrition and shopping. */
  grams: number;
  /** Display amount for the whole recipe. Must agree with grams (1 tbsp olive oil = 13.5 g, 1 medium onion ≈ 110 g). */
  qty: number;
  unit: Unit;
  /** Preparation note: 'finely chopped', 'rinsed', 'at room temperature'. */
  prep?: string;
  /** Garnish or optional extra. Still counted in nutrition. */
  optional?: boolean;
}

export type Cuisine =
  | 'kurdish'
  | 'iraqi'
  | 'levantine'
  | 'turkish'
  | 'persian'
  | 'gulf'
  | 'egyptian'
  | 'north-african'
  | 'mediterranean'
  | 'south-asian'
  | 'east-asian'
  | 'southeast-asian'
  | 'latin-american'
  | 'western';

/** Descriptive tags authors set. Diet and allergen flags are derived from ingredients, never tagged by hand. */
export type RecipeTag =
  | 'quick'
  | 'make-ahead'
  | 'one-pot'
  | 'no-cook'
  | 'meal-prep'
  | 'high-protein'
  | 'high-fiber'
  | 'family'
  | 'ramadan';

export interface Recipe {
  /** kebab-case, unique across the whole library. */
  id: string;
  /** English name, Title Case. */
  name: string;
  /** Local name, transliterated, when the dish has one: 'Shorbat Adas', 'Kfta Hamuth'. */
  nativeName?: string;
  cuisine: Cuisine;
  /** Meals this dish suits. The planner only places a recipe in these slots. */
  slots: MealSlot[];
  /** One or two sentences: what it is and why it's a good choice. */
  description: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  ingredients: RecipeIngredient[];
  /** Imperative, one action group per step, with temperatures in °C and times. */
  steps: string[];
  tips?: string[];
  tags: RecipeTag[];
  /** How to keep leftovers, e.g. 'Fridge 3 days in an airtight container.' */
  storage?: string;
}

export interface DietFlags {
  vegetarian: boolean;
  vegan: boolean;
  pescatarian: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
  nutFree: boolean;
  eggFree: boolean;
}

/** Where a recipe photo came from and how it may be used. Shown on the recipe page and in Photo credits. */
export interface PhotoCredit {
  title: string;
  author: string;
  authorUrl?: string;
  /** Short licence name, e.g. 'CC BY-SA 4.0', 'CC0 1.0', 'Public domain'. */
  license: string;
  licenseUrl?: string;
  /** The photo's page at its source (Commons file page, Flickr photo page). */
  sourceUrl: string;
  /** 'Wikimedia Commons', 'Flickr', ... */
  source: string;
  /** What we changed, for licences that require saying so, e.g. 'Resized and converted to WebP'. */
  changes: string;
}

/** A real photo of the dish. Paths are relative to the app root. */
export interface RecipePhoto {
  /** Large version, up to 960 px wide. */
  src: string;
  /** Small version, up to 400 px wide, for cards and lists. */
  thumb: string;
  /** Pixel size of `src`. */
  width: number;
  height: number;
  alt: string;
  /** Where the food is, as CSS object-position percentages [x, y], so crops keep it in frame. */
  focus: [number, number];
  credit: PhotoCredit;
}

/** Language a reference video is spoken in: English, Sorani or Kurmanji Kurdish, Arabic, Turkish, Persian. */
export type VideoLanguage = 'en' | 'ckb' | 'kmr' | 'ar' | 'tr' | 'fa';

/** A YouTube video that shows how the dish is made, checked by hand. Linked out of the app, never embedded. */
export interface RecipeVideo {
  /** The 11-character id in youtube.com/watch?v=<id>. */
  youtubeId: string;
  /** The video's title and channel as YouTube shows them. */
  title: string;
  channel: string;
  language: VideoLanguage;
  /** 'exact': the same dish and method (usually a richer traditional version). 'close': a related variant. */
  match: 'exact' | 'close';
}

/** A recipe plus everything derived from its ingredients. Built once at startup. */
export interface CatalogRecipe extends Recipe {
  perServing: Nutrients;
  allergens: Allergen[];
  flags: DietFlags;
  totalMinutes: number;
  /** Free sugar grams per serving (from ingredients with freeSugar). */
  freeSugarPerServing: number;
  /** Distinct halal notes from its ingredients. */
  halalNotes: string[];
  /** A real photo of the dish, when a properly licensed one exists. Otherwise the UI draws the plate motif. */
  photo?: RecipePhoto;
  /** A reference video of the dish being made, when a good one was found. Otherwise the UI offers a YouTube search. */
  video?: RecipeVideo;
}

export type Diet = 'omnivore' | 'pescatarian' | 'vegetarian' | 'vegan';

export type Sex = 'female' | 'male';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';

export type Goal = 'lose' | 'maintain' | 'gain';

export interface BodyStats {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
}

export type WeekStart = 'saturday' | 'sunday' | 'monday';

export interface Profile {
  /** Daily energy target, kcal. */
  kcalTarget: number;
  /** Daily protein target, grams. */
  proteinTarget: number;
  snacksPerDay: 0 | 1 | 2;
  diet: Diet;
  /** Recipes containing any of these allergens are never planned. */
  excludeAllergens: Allergen[];
  /** Ingredient ids the user dislikes. Recipes using them are never planned. */
  dislikedIngredients: string[];
  /** Upper bound on prep + cook minutes for any planned recipe, or null for no limit. */
  maxTotalMinutes: number | null;
  weekStart: WeekStart;
  /** People eating. Scales recipe amounts and the shopping list; nutrition stays per person. 1-8. */
  householdSize: number;
  /** Optional, used only to suggest kcalTarget/proteinTarget. */
  body?: BodyStats;
}

/** Portion is a multiple of one serving, in steps of 0.25, from 0.5 to 2. */
export interface PlannedMeal {
  slot: MealSlot;
  /** 0-based index among meals of the same slot (snacks can repeat: snack 0, snack 1). */
  index: number;
  recipeId: string;
  portion: number;
}

export interface DayPlan {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** In slot order: breakfast, lunch, dinner, then snacks by index. */
  meals: PlannedMeal[];
  /** Per person: sum of perServing x portion over meals. */
  totals: Nutrients;
  /** Meals that could not be filled because the profile's filters exclude every candidate. */
  unfilled: { slot: MealSlot; index: number }[];
}

/** A user's manual choice for one meal on one date. Wins over the generated plan. */
export interface MealOverride {
  date: string;
  slot: MealSlot;
  index: number;
  recipeId: string;
  portion: number;
}
