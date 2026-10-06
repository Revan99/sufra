// The recipe library the app plans from: src/data, built once when the module loads.
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { CatalogRecipe, Ingredient } from '../types.ts';
import type { IngredientIndex } from '../lib/nutrition.ts';
import { CATALOG, INGREDIENTS, catalogById, ingredientIndex } from '../data/index.ts';

export interface Library {
  catalog: readonly CatalogRecipe[];
  byId: ReadonlyMap<string, CatalogRecipe>;
  /** Ingredients recipes actually use, sorted by name (for the disliked-ingredient picker). */
  ingredients: readonly Ingredient[];
  ingredientIndex: IngredientIndex;
  /** Ingredient id -> ids of the recipes that use it. */
  usage: ReadonlyMap<string, ReadonlySet<string>>;
}

function usageIndex(catalog: readonly CatalogRecipe[]): Map<string, Set<string>> {
  const usage = new Map<string, Set<string>>();
  for (const r of catalog) {
    for (const ri of r.ingredients) {
      let set = usage.get(ri.ingredientId);
      if (!set) usage.set(ri.ingredientId, (set = new Set()));
      set.add(r.id);
    }
  }
  return usage;
}

/** A library over any catalog (the app uses LIBRARY; tests pass fixtures). */
export function makeLibrary(
  catalog: readonly CatalogRecipe[],
  ingredients: readonly Ingredient[],
  index: IngredientIndex,
  byId: ReadonlyMap<string, CatalogRecipe> = new Map(catalog.map((r) => [r.id, r])),
): Library {
  const usage = usageIndex(catalog);
  const used = ingredients.filter((i) => usage.has(i.id)).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return { catalog, byId, ingredients: used, ingredientIndex: index, usage };
}

/** The app's library. */
export const LIBRARY: Library = makeLibrary(CATALOG, INGREDIENTS, ingredientIndex, catalogById);

/** Recipes that use any of `ingredientIds`. */
export function recipesUsing(lib: Pick<Library, 'usage'>, ingredientIds: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const id of ingredientIds) for (const r of lib.usage.get(id) ?? []) out.add(r);
  return out;
}

const Ctx = createContext<Library>(LIBRARY);

export function LibraryProvider({ library, children }: { library: Library; children: ReactNode }) {
  return <Ctx.Provider value={library}>{children}</Ctx.Provider>;
}

export function useLibrary(): Library {
  return useContext(Ctx);
}
