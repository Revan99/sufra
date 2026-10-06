// Option lists shared by Settings and onboarding. (lib/storage.ts keeps its own copies for validation; it has no
// exports for them.)
import type { Diet, WeekStart } from '../../types.ts';
import { ALLERGENS } from '../../types.ts';
import type { ThemeChoice } from '../../lib/storage.ts';
import { allergenName, dietDescription, dietName } from '../../i18n/labels.ts';

export const DIETS: readonly Diet[] = ['omnivore', 'pescatarian', 'vegetarian', 'vegan'];
export const WEEK_STARTS: readonly WeekStart[] = ['saturday', 'sunday', 'monday'];
export const THEMES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

export function dietOptions() {
  return DIETS.map((d) => ({ value: d, label: dietName(d), description: dietDescription(d) }));
}

export function allergenOptions() {
  return ALLERGENS.map((a) => ({ value: a, label: allergenName(a) }));
}

/** `list` with `v` added, or removed when it was there. */
export function toggleIn<T>(list: readonly T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}
