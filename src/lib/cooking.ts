// Pure helpers for the recipe page and cooking mode: a timer length read from a step's text, a timer clock, the
// short highlight shown beside the cuisine ("High protein", "Vegan"), and where cooking mode starts.
import type { CatalogRecipe } from '../types.ts';
import { QUICK_MINUTES } from './filters.ts';

const FRACTIONS: Readonly<Record<string, number>> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

/** A number as recipe text writes it: "12", "1.5", "1½", "½", "1 1/2", "1/2". */
const NUM = String.raw`(?:\d+(?:[.,]\d+)?(?:\s?[½¼¾⅓⅔]|\s\d\/\d)?|[½¼¾⅓⅔]|\d\/\d)`;
const RANGE_SEP = String.raw`\s*(?:-|–|—|to)\s*`;
const UNIT = String.raw`(hours?|hrs?|minutes?|mins?|seconds?|secs?)`;
/** "10–12 minutes", "1 1/2-2 hours", "a 10-minute rest", optionally followed by "and 15 minutes" ("1 hour 15 minutes"). */
const DURATION = new RegExp(String.raw`(?<![\w.,/])(${NUM})(?:${RANGE_SEP}(${NUM}))?\s?-?\s?${UNIT}\b(?:,?\s(?:and\s)?(${NUM})\s?${UNIT}\b)?`, 'i');
const WORDS = /\b(half an hour|an hour|a minute)\b/i;

function parseNum(s: string): number {
  const t = s.trim();
  const mixed = /^(\d+)\s(\d)\/(\d)$/.exec(t);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = /^(\d)\/(\d)$/.exec(t);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const glyph = /^(\d*)\s?([½¼¾⅓⅔])$/.exec(t);
  if (glyph) return (glyph[1] ? Number(glyph[1]) : 0) + (FRACTIONS[glyph[2] ?? ''] ?? 0);
  return Number(t.replace(',', '.'));
}

function unitSeconds(unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith('h')) return 3600;
  if (u.startsWith('m')) return 60;
  return 1;
}

/**
 * The timer a step suggests, in seconds: the first duration in its text, taking the longer end of a range
 * ("grill for 10–12 minutes" → 720, "chill for at least 1 hour" → 3600). Null when the step names no time.
 */
export function stepTimerSeconds(text: string): number | null {
  const m = DURATION.exec(text);
  const w = WORDS.exec(text);
  // Whichever comes first in the sentence wins.
  if (w && (!m || w.index < m.index)) {
    const phrase = (w[1] ?? '').toLowerCase();
    return phrase === 'half an hour' ? 1800 : phrase === 'an hour' ? 3600 : 60;
  }
  if (!m) return null;
  const low = parseNum(m[1] ?? '');
  const high = m[2] ? parseNum(m[2]) : low;
  let seconds = Math.max(low, high) * unitSeconds(m[3] ?? '');
  if (m[4] && m[5]) seconds += parseNum(m[4]) * unitSeconds(m[5]);
  seconds = Math.round(seconds);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** "12:00", "0:45", "1:30:00": a countdown clock (Western digits, as kitchen timers show). */
export function timerClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export type RecipeHighlight = 'vegan' | 'vegetarian' | 'highProtein' | 'quick';

/** At least this share of a serving's energy from protein counts as high protein. */
export const HIGH_PROTEIN_SHARE = 0.3;

/** The one word shown beside the cuisine on the recipe page, most telling first. */
export function recipeHighlight(recipe: Pick<CatalogRecipe, 'flags' | 'tags' | 'perServing' | 'totalMinutes'>): RecipeHighlight | null {
  if (recipe.flags.vegan) return 'vegan';
  if (recipe.flags.vegetarian) return 'vegetarian';
  const { kcal, protein } = recipe.perServing;
  if (recipe.tags.includes('high-protein') || (kcal > 0 && (protein * 4) / kcal >= HIGH_PROTEIN_SHARE)) return 'highProtein';
  if (recipe.totalMinutes <= QUICK_MINUTES) return 'quick';
  return null;
}

/** Where cooking mode opens: the first step not ticked yet, or the first step when all are done. */
export function firstOpenStep(stepCount: number, done: readonly number[]): number {
  for (let i = 0; i < stepCount; i++) if (!done.includes(i)) return i;
  return 0;
}
