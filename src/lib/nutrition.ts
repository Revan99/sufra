import type {
  Allergen,
  CatalogRecipe,
  DietFlags,
  Ingredient,
  Nutrients,
  Recipe,
} from '../types.ts';
import { ALLERGENS, NUTRIENT_KEYS } from '../types.ts';

export type IngredientIndex = ReadonlyMap<string, Ingredient>;

export function zeroNutrients(): Nutrients {
  return { kcal: 0, protein: 0, carbs: 0, fiber: 0, sugars: 0, fat: 0, satFat: 0, sodium: 0 };
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  const out = zeroNutrients();
  for (const k of NUTRIENT_KEYS) out[k] = a[k] + b[k];
  return out;
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const out = zeroNutrients();
  for (const k of NUTRIENT_KEYS) out[k] = n[k] * factor;
  return out;
}

export function sumNutrients(list: readonly Nutrients[]): Nutrients {
  return list.reduce(addNutrients, zeroNutrients());
}

/** Rounds for display: kcal and sodium to whole numbers, grams to one decimal. */
export function roundNutrients(n: Nutrients): Nutrients {
  const out = zeroNutrients();
  for (const k of NUTRIENT_KEYS) {
    out[k] = k === 'kcal' || k === 'sodium' ? Math.round(n[k]) : Math.round(n[k] * 10) / 10;
  }
  return out;
}

export function indexIngredients(list: readonly Ingredient[]): IngredientIndex {
  return new Map(list.map((i) => [i.id, i]));
}

function lookup(recipe: Recipe, id: string, index: IngredientIndex): Ingredient {
  const ing = index.get(id);
  if (!ing) throw new Error(`Recipe "${recipe.id}" uses unknown ingredient "${id}"`);
  return ing;
}

/** Whole-recipe nutrition from raw ingredient weights (standard recipe-analysis method). */
export function recipeTotalNutrients(recipe: Recipe, index: IngredientIndex): Nutrients {
  return sumNutrients(
    recipe.ingredients.map((ri) => scaleNutrients(lookup(recipe, ri.ingredientId, index).per100g, ri.grams / 100)),
  );
}

export function recipePerServing(recipe: Recipe, index: IngredientIndex): Nutrients {
  return scaleNutrients(recipeTotalNutrients(recipe, index), 1 / recipe.servings);
}

export function recipeFreeSugarPerServing(recipe: Recipe, index: IngredientIndex): number {
  let grams = 0;
  for (const ri of recipe.ingredients) {
    const ing = lookup(recipe, ri.ingredientId, index);
    if (ing.freeSugar) grams += (ing.per100g.sugars * ri.grams) / 100;
  }
  return grams / recipe.servings;
}

export function recipeAllergens(recipe: Recipe, index: IngredientIndex): Allergen[] {
  const found = new Set<Allergen>();
  for (const ri of recipe.ingredients) {
    for (const a of lookup(recipe, ri.ingredientId, index).allergens) found.add(a);
  }
  return ALLERGENS.filter((a) => found.has(a));
}

export function dietFlags(recipe: Recipe, index: IngredientIndex): DietFlags {
  const animals = new Set(recipe.ingredients.map((ri) => lookup(recipe, ri.ingredientId, index).animal));
  const allergens = new Set(recipeAllergens(recipe, index));
  const hasMeat = animals.has('meat') || animals.has('poultry');
  const hasSeafood = animals.has('fish') || animals.has('shellfish');
  const vegetarian = !hasMeat && !hasSeafood;
  return {
    vegetarian,
    vegan: vegetarian && !animals.has('dairy') && !animals.has('egg') && !animals.has('honey'),
    pescatarian: !hasMeat,
    glutenFree: !allergens.has('gluten'),
    dairyFree: !allergens.has('dairy'),
    nutFree: !allergens.has('tree-nut') && !allergens.has('peanut'),
    eggFree: !allergens.has('egg'),
  };
}

export function halalNotes(recipe: Recipe, index: IngredientIndex): string[] {
  const notes = new Set<string>();
  for (const ri of recipe.ingredients) {
    const note = lookup(recipe, ri.ingredientId, index).halalNote;
    if (note) notes.add(note);
  }
  return [...notes];
}

export function toCatalogRecipe(recipe: Recipe, index: IngredientIndex): CatalogRecipe {
  return {
    ...recipe,
    perServing: recipePerServing(recipe, index),
    allergens: recipeAllergens(recipe, index),
    flags: dietFlags(recipe, index),
    totalMinutes: recipe.prepMinutes + recipe.cookMinutes,
    freeSugarPerServing: recipeFreeSugarPerServing(recipe, index),
    halalNotes: halalNotes(recipe, index),
  };
}

export function buildCatalog(recipes: readonly Recipe[], index: IngredientIndex): CatalogRecipe[] {
  return recipes.map((r) => toCatalogRecipe(r, index));
}

/** Atwater estimate of energy from macros: 4 kcal/g protein and digestible carbs, 2 kcal/g fiber, 9 kcal/g fat. */
export function atwaterKcal(n: Pick<Nutrients, 'protein' | 'carbs' | 'fiber' | 'fat'>): number {
  const fiber = Math.min(n.fiber, n.carbs);
  return 4 * n.protein + 4 * (n.carbs - fiber) + 2 * fiber + 9 * n.fat;
}
