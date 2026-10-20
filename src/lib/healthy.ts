// Food-group measures behind Sufra's stricter health rules (docs/HEALTH.md): fruit and vegetables, refined grains
// and red meat per serving. They read the ingredient list, so the rules check what a recipe is made of as well as
// its nutrients.
//
// Fruit and vegetables follow the UK "5 A Day" portion rules (NHS): potatoes, yams, cassava and plantain don't count;
// beans and lentils count once, up to one 80 g portion; dried fruit counts at 30 g for an 80 g portion, once; fresh
// herbs, canned tomatoes and frozen vegetables count.
import type { Ingredient, Recipe } from '../types.ts';

type Index = { get(id: string): Ingredient | undefined };

const STARCHY = /^(potato-|cassava-|yam-|plantain-|taro-)/;
const DRIED_FRUIT = /^(dates-|apricots-dried|raisins|figs-dried|barberries-dried|mulberries-dried|prunes|cranberries-dried|sultanas|currants)/;
/** Canned and frozen ingredients that count as vegetables or fruit. */
const PACKED_FRUIT_VEG = new Set([
  'tomatoes-canned-crushed',
  'tomatoes-canned-diced',
  'applesauce-unsweetened',
  'green-peas-frozen',
  'spinach-frozen',
  'okra-frozen',
  'fava-beans-green-frozen',
  'jute-leaves-frozen',
  'sweet-corn-frozen',
  'mixed-vegetables-frozen',
  'mixed-berries-frozen',
  'sour-cherries-frozen',
]);

/** One portion of fruit or vegetables, and the cap for pulses and for dried fruit (each counts once). */
export const PORTION_G = 80;
/** Dried legumes roughly 2.5x their weight once cooked. */
const COOKED_PER_DRY_LEGUME = 2.5;
/** 30 g of dried fruit counts as an 80 g portion. */
const DRIED_FRUIT_FACTOR = PORTION_G / 30;

/**
 * Refined grains: white rice of every kind, white flour, semolina, white pasta and noodles, filo, pearled barley.
 * Whole grains (brown and wild rice, bulgur, freekeh, oats, whole-wheat flour, bread and pasta, quinoa...) are not.
 * Starches used to thicken (cornstarch) are measured separately and small.
 */
const REFINED_GRAIN = /^(rice-basmati-|rice-short-grain-|rice-glutinous-|rice-noodles-|rice-paper|flour-all-purpose|flour-rice-white|filo-dough|noodles-egg-|noodles-cellophane-|pearl-couscous-|semolina-|vermicelli-|puffed-rice|barley-pearled-)/;
/** Cooked white rice is roughly 2.7x its dry weight. */
const COOKED_PER_DRY_RICE = 2.7;

export function isRefinedGrain(id: string): boolean {
  return REFINED_GRAIN.test(id);
}

/** Grams of fruit and vegetables per serving, counted the 5 A Day way. */
export function fruitVegPerServing(recipe: Pick<Recipe, 'ingredients' | 'servings'>, index: Index): number {
  let fresh = 0;
  let pulses = 0;
  let dried = 0;
  for (const ri of recipe.ingredients) {
    const ing = index.get(ri.ingredientId);
    if (!ing) continue;
    const g = ri.grams;
    if (ing.aisle === 'legumes' && !/flour|paste|tofu|tempeh|natto|soy-milk|soy-mince|miso/.test(ing.id)) {
      pulses += /-dried$/.test(ing.id) ? g * COOKED_PER_DRY_LEGUME : g;
    } else if (DRIED_FRUIT.test(ing.id)) {
      dried += g * DRIED_FRUIT_FACTOR;
    } else if ((ing.aisle === 'produce' && !STARCHY.test(ing.id)) || (ing.aisle === 'herbs' && !/dried/.test(ing.id)) || PACKED_FRUIT_VEG.has(ing.id)) {
      fresh += g;
    }
  }
  const s = recipe.servings;
  return fresh / s + Math.min(PORTION_G, pulses / s) + Math.min(PORTION_G, dried / s);
}

/** Refined grain per serving, in dry (uncooked) grams. */
export function refinedGrainPerServing(recipe: Pick<Recipe, 'ingredients' | 'servings'>): number {
  let g = 0;
  for (const ri of recipe.ingredients) {
    if (!isRefinedGrain(ri.ingredientId)) continue;
    g += /-cooked$/.test(ri.ingredientId) ? ri.grams / COOKED_PER_DRY_RICE : ri.grams;
  }
  return g / recipe.servings;
}

/** Raw red meat (beef, lamb, veal, goat) per serving, in grams. */
export function redMeatPerServing(recipe: Pick<Recipe, 'ingredients' | 'servings'>, index: Index): number {
  let g = 0;
  for (const ri of recipe.ingredients) if (index.get(ri.ingredientId)?.animal === 'meat') g += ri.grams;
  return g / recipe.servings;
}

/** Deep- or shallow-frying in a step ("a deep frying pan" is just a pan). */
export const FRYING = /\bdeep[- ]?fr(?:y|ied|ying)\b(?!\s+pan)|\bshallow[- ]?fr(?:y|ied|ying)\b|\b\d+\s*cm (?:deep )?of (?:hot )?oil\b/i;
