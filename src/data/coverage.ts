// How many recipes each slot needs under each filter so a week can be planned without repeats.
import type { CatalogRecipe, MealSlot } from '../types.ts';
import { MEAL_SLOTS } from '../types.ts';

export interface CoverageRule {
  label: string;
  matches: (r: CatalogRecipe) => boolean;
  min: Record<MealSlot, number>;
}

const all = (n: number): Record<MealSlot, number> => ({ breakfast: n, lunch: n, dinner: n, snack: n });

export const COVERAGE_RULES: readonly CoverageRule[] = [
  { label: 'any diet', matches: () => true, min: { breakfast: 20, lunch: 20, dinner: 20, snack: 18 } },
  { label: 'vegetarian', matches: (r) => r.flags.vegetarian, min: { breakfast: 12, lunch: 10, dinner: 10, snack: 12 } },
  { label: 'vegan', matches: (r) => r.flags.vegan, min: all(7) },
  { label: 'gluten-free', matches: (r) => r.flags.glutenFree, min: all(7) },
  { label: 'dairy-free', matches: (r) => r.flags.dairyFree, min: all(7) },
  { label: 'nut-free', matches: (r) => r.flags.nutFree, min: all(10) },
  { label: 'egg-free', matches: (r) => r.flags.eggFree, min: all(10) },
  { label: 'ready in 30 min', matches: (r) => r.totalMinutes <= 30, min: { breakfast: 10, lunch: 7, dinner: 7, snack: 10 } },
];

export interface CoverageRow {
  label: string;
  slot: MealSlot;
  count: number;
  min: number;
}

export function coverage(catalog: readonly CatalogRecipe[]): CoverageRow[] {
  const rows: CoverageRow[] = [];
  for (const rule of COVERAGE_RULES) {
    for (const slot of MEAL_SLOTS) {
      const count = catalog.filter((r) => r.slots.includes(slot) && rule.matches(r)).length;
      rows.push({ label: rule.label, slot, count, min: rule.min[slot] });
    }
  }
  return rows;
}
