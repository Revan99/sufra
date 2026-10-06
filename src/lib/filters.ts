// Which recipes a profile may eat, and the browse-screen filters.
import type { CatalogRecipe, Cuisine, Diet, DietFlags, MealSlot, Profile } from '../types.ts';
import type { IngredientIndex } from './nutrition.ts';

/** The profile fields that decide eligibility. */
export type EligibilityProfile = Pick<Profile, 'diet' | 'excludeAllergens' | 'dislikedIngredients' | 'maxTotalMinutes'>;

/** Why a recipe is excluded for a profile. */
export type IneligibleReason = 'slot' | 'diet' | 'allergen' | 'disliked' | 'time';

/** Recipes at or under this many minutes count as quick. */
export const QUICK_MINUTES = 30;

/** Diet hierarchy: vegan ⊂ vegetarian ⊂ pescatarian ⊂ omnivore. */
export function fitsDiet(recipe: CatalogRecipe, diet: Diet): boolean {
  switch (diet) {
    case 'vegan':
      return recipe.flags.vegan;
    case 'vegetarian':
      return recipe.flags.vegetarian;
    case 'pescatarian':
      return recipe.flags.pescatarian;
    default:
      return true;
  }
}

/** Every reason the recipe is excluded (empty when it's eligible). Pass a slot to also check the slot. */
export function ineligibleReasons(recipe: CatalogRecipe, profile: EligibilityProfile, slot?: MealSlot): IneligibleReason[] {
  const out: IneligibleReason[] = [];
  if (slot && !recipe.slots.includes(slot)) out.push('slot');
  if (!fitsDiet(recipe, profile.diet)) out.push('diet');
  if (profile.excludeAllergens.some((a) => recipe.allergens.includes(a))) out.push('allergen');
  if (profile.dislikedIngredients.length) {
    const disliked = new Set(profile.dislikedIngredients);
    if (recipe.ingredients.some((ri) => disliked.has(ri.ingredientId))) out.push('disliked');
  }
  if (profile.maxTotalMinutes !== null && profile.maxTotalMinutes !== undefined && recipe.totalMinutes > profile.maxTotalMinutes) {
    out.push('time');
  }
  return out;
}

/** True when the profile may be served this recipe (in `slot`, when given). */
export function isEligible(recipe: CatalogRecipe, profile: EligibilityProfile, slot?: MealSlot): boolean {
  return ineligibleReasons(recipe, profile, slot).length === 0;
}

/** Eligible recipes for a slot, in catalog order. */
export function eligibleRecipes(catalog: readonly CatalogRecipe[], profile: EligibilityProfile, slot: MealSlot): CatalogRecipe[] {
  return catalog.filter((r) => isEligible(r, profile, slot));
}

/** Lowercase, accents and apostrophes stripped ("za'atar" -> "zaatar"), whitespace collapsed: for forgiving search. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['\u2018\u2019\u02bc`]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * What people type (British, regional and transliterated names) -> the words the library uses. Keys and values are
 * normalized (see normalizeText). A query word matches when it or any of its alternatives does.
 */
export const SEARCH_SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  aubergine: ['eggplant'],
  brinjal: ['eggplant'],
  baytinjan: ['eggplant'],
  betinjan: ['eggplant'],
  yoghurt: ['yogurt'],
  yoghourt: ['yogurt'],
  laban: ['yogurt'],
  courgette: ['zucchini'],
  coriander: ['cilantro'],
  cilantro: ['coriander'],
  garbanzo: ['chickpea'],
  minced: ['ground beef', 'ground lamb', 'ground chicken', 'ground turkey'],
  mince: ['ground beef', 'ground lamb', 'ground chicken', 'ground turkey'],
  chilli: ['chili'],
  chile: ['chili'],
  capsicum: ['bell pepper'],
  prawn: ['shrimp'],
  rocket: ['arugula'],
  hummous: ['hummus'],
  houmous: ['hummus'],
  felafel: ['falafel'],
  tahina: ['tahini'],
  burghul: ['bulgur'],
  bulghur: ['bulgur'],
  bulgar: ['bulgur'],
  labne: ['labneh'],
  labna: ['labneh'],
  kofte: ['kofta'],
  kufta: ['kofta'],
  kafta: ['kofta'],
  sumak: ['sumac'],
  bamia: ['okra', 'bamya'],
  bamya: ['okra'],
  adas: ['lentil'],
  timman: ['rice'],
  dajaj: ['chicken'],
  samak: ['fish'],
};

/**
 * A query word and what it may also match: without a plural ending ("eggs" -> "egg", "tomatoes" -> "tomato",
 * "berries" -> "berry"), and the synonyms of each (SEARCH_SYNONYMS). Words of 3 letters or fewer keep their ending.
 */
export function queryWordForms(word: string): string[] {
  const forms = new Set([word]);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) {
    forms.add(word.slice(0, -1));
    if (word.length > 4 && word.endsWith('es')) forms.add(word.slice(0, -2));
    if (word.length > 4 && word.endsWith('ies')) forms.add(`${word.slice(0, -3)}y`);
  }
  for (const f of [...forms]) for (const alt of SEARCH_SYNONYMS[f] ?? []) forms.add(alt);
  return [...forms];
}

interface Haystack {
  name: string;
  native: string;
  ingredients: string;
  /** Ingredients without oils and vinegars: what a plural or a synonym matches ("olives" is not olive oil). */
  foods: string;
}

const haystacks = new WeakMap<IngredientIndex, WeakMap<CatalogRecipe, Haystack>>();

function haystack(recipe: CatalogRecipe, index: IngredientIndex) {
  let perIndex = haystacks.get(index);
  if (!perIndex) {
    perIndex = new WeakMap();
    haystacks.set(index, perIndex);
  }
  let h = perIndex.get(recipe);
  if (!h) {
    const text = (list: typeof recipe.ingredients) =>
      normalizeText(list.map((ri) => `${index.get(ri.ingredientId)?.name ?? ''} ${ri.ingredientId.replace(/-/g, ' ')}`).join(' | '));
    h = {
      name: normalizeText(recipe.name),
      native: normalizeText(recipe.nativeName ?? ''),
      ingredients: text(recipe.ingredients),
      foods: text(recipe.ingredients.filter((ri) => index.get(ri.ingredientId)?.aisle !== 'oils-vinegars')),
    };
    perIndex.set(recipe, h);
  }
  return h;
}

/** 4 = starts a word of the name, 3 = inside the name, 2 = native name, 1 = an ingredient, 0 = no match. */
function wordScore(h: Haystack, word: string, typed: boolean): number {
  if (h.name.startsWith(word) || h.name.includes(` ${word}`)) return 4;
  if (h.name.includes(word)) return 3;
  if (h.native.includes(word)) return 2;
  if ((typed ? h.ingredients : h.foods).includes(word)) return 1;
  return 0;
}

/**
 * Search relevance: 0 = no match. Every word of the query must appear, in one of its forms (queryWordForms: plural
 * endings dropped, synonyms), in the name, native name or an ingredient name. Name matches outrank native-name
 * matches, which outrank ingredient matches.
 */
export function searchScore(recipe: CatalogRecipe, query: string, index: IngredientIndex): number {
  const q = normalizeText(query);
  if (!q) return 1;
  const h = haystack(recipe, index);
  let score = 0;
  for (const word of q.split(' ')) {
    let best = 0;
    for (const form of queryWordForms(word)) best = Math.max(best, wordScore(h, form, form === word));
    if (!best) return 0;
    score += best;
  }
  return score;
}

/** True when every word of the query matches the recipe (see searchScore). */
export function matchesQuery(recipe: CatalogRecipe, query: string, index: IngredientIndex): boolean {
  return searchScore(recipe, query, index) > 0;
}

export interface BrowseFilters {
  /** Free-text search over name, native name and ingredient names. */
  query?: string;
  slot?: MealSlot | null;
  /** Only recipes that fit this diet (hierarchy applies). */
  diet?: Diet | null;
  /** Every flag listed must be true (e.g. ['glutenFree', 'dairyFree']). */
  flags?: readonly (keyof DietFlags)[];
  /** Only recipes ready in QUICK_MINUTES or less. */
  quick?: boolean;
  cuisine?: Cuisine | null;
  favoritesOnly?: boolean;
}

export interface BrowseContext {
  ingredientIndex: IngredientIndex;
  favorites: readonly string[];
}

/**
 * Applies browse filters. With a query, results are sorted by relevance (then name); without one they keep
 * catalog order.
 */
export function filterRecipes(catalog: readonly CatalogRecipe[], filters: BrowseFilters, ctx: BrowseContext): CatalogRecipe[] {
  const favs = new Set(ctx.favorites);
  const flags = filters.flags ?? [];
  const query = filters.query?.trim() ?? '';
  const scored: { r: CatalogRecipe; score: number }[] = [];
  for (const r of catalog) {
    if (filters.slot && !r.slots.includes(filters.slot)) continue;
    if (filters.diet && !fitsDiet(r, filters.diet)) continue;
    if (flags.some((f) => !r.flags[f])) continue;
    if (filters.quick && r.totalMinutes > QUICK_MINUTES) continue;
    if (filters.cuisine && r.cuisine !== filters.cuisine) continue;
    if (filters.favoritesOnly && !favs.has(r.id)) continue;
    const score = query ? searchScore(r, query, ctx.ingredientIndex) : 1;
    if (score > 0) scored.push({ r, score });
  }
  if (query) scored.sort((a, b) => b.score - a.score || a.r.name.localeCompare(b.r.name, 'en'));
  return scored.map((s) => s.r);
}

/** Distinct cuisines in the catalog, most recipes first (for filter chips). */
export function cuisinesIn(catalog: readonly CatalogRecipe[]): Cuisine[] {
  const counts = new Map<Cuisine, number>();
  for (const r of catalog) counts.set(r.cuisine, (counts.get(r.cuisine) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c);
}
