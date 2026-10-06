// Single entry point for app code: the ingredient table and the enriched recipe catalog.
import type { CatalogRecipe } from '../types.ts';
import { buildCatalog, indexIngredients } from '../lib/nutrition.ts';
import { INGREDIENTS } from './ingredients/index.ts';
import { RECIPES } from './recipes/index.ts';
import { PHOTOS } from './photos.ts';
import { VIDEOS } from './videos.ts';

export { INGREDIENTS, RECIPES };

export const ingredientIndex = indexIngredients(INGREDIENTS);

// A recipe that references a missing ingredient is left out rather than crashing the app.
// `pnpm test` fails on it, so this only matters while the library is being edited.
const usable = RECIPES.filter((r) => {
  const missing = r.ingredients.filter((ri) => !ingredientIndex.has(ri.ingredientId));
  if (missing.length && import.meta.env?.DEV) {
    console.warn(`Recipe "${r.id}" skipped, unknown ingredients: ${missing.map((m) => m.ingredientId).join(', ')}`);
  }
  return missing.length === 0;
});

export const CATALOG: readonly CatalogRecipe[] = buildCatalog(usable, ingredientIndex).map((r) => {
  const photo = PHOTOS[r.id];
  const video = VIDEOS[r.id];
  return { ...r, ...(photo ? { photo } : {}), ...(video ? { video } : {}) };
});

export const catalogById: ReadonlyMap<string, CatalogRecipe> = new Map(CATALOG.map((r) => [r.id, r]));
