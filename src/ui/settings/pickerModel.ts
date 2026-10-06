// The disliked-ingredient picker's search: plain matches plus a "family" (every ingredient whose name has the
// searched word, so "onion" finds Onion, Red onion, Scallion (green onion) and Onion powder at once). Pure.
import type { Ingredient } from '../../types.ts';
import { normalizeText } from '../../lib/filters.ts';

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Ingredients whose name contains `stem` as a whole word (singular or plural). */
function withWord(ingredients: readonly Ingredient[], stem: string): Ingredient[] {
  const re = new RegExp(`(^|[^\\p{L}])${escape(stem)}(s|es)?([^\\p{L}]|$)`, 'u');
  return ingredients.filter((i) => re.test(normalizeText(i.name)));
}

/**
 * The family a one-word query names: the ingredients with that word in their name, when there are at least two
 * (else null). Plurals are folded: "onions" and "tomatoes" find the onion and tomato families.
 */
export function ingredientFamily(query: string, ingredients: readonly Ingredient[]): { word: string; members: Ingredient[] } | null {
  const q = normalizeText(query);
  if (!q || q.includes(' ')) return null;
  const stems = [...new Set([q, q.replace(/es$/, ''), q.replace(/s$/, '')])].filter((w) => w.length >= 3);
  for (const word of stems) {
    const members = withWord(ingredients, word);
    if (members.length >= 2) return { word, members };
  }
  return null;
}

/** Ingredients whose name contains the query anywhere, in name order. */
export function ingredientMatches(query: string, ingredients: readonly Ingredient[]): Ingredient[] {
  const q = normalizeText(query);
  return q ? ingredients.filter((i) => normalizeText(i.name).includes(q)) : [];
}
