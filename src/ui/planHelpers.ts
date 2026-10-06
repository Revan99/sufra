// Small planning helpers the screens need on top of lib/planner.ts. Pure, tested in planHelpers.test.ts.
import type { Allergen, CatalogRecipe, DayPlan, MealOverride, MealSlot, PlannedMeal, Profile, WeekStart } from '../types.ts';
import { MEAL_SLOTS } from '../types.ts';
import { ineligibleReasons, isEligible } from '../lib/filters.ts';
import type { IneligibleReason } from '../lib/filters.ts';
import { bestPortion, dayTotals, nextFreeIndex } from '../lib/planner.ts';
import { clampTarget, slotEnergySplit } from '../lib/targets.ts';
import { shoppingDates } from '../lib/shopping.ts';
import { weekDates } from '../lib/dates.ts';
import type { ISODate } from '../lib/dates.ts';
import { mealName } from '../i18n/labels.ts';

export type FilterReason = Exclude<IneligibleReason, 'slot'>;

export interface UnfilledExplanation {
  /** Recipes listed for the slot in the whole library. */
  inSlot: number;
  /** Each filter that excludes something, most helpful to relax first. */
  reasons: { reason: FilterReason; excluded: number; unlocks: number }[];
  /** Recipes that fit the settings for this slot but are already planned on the day, with the meal they fill. */
  usedToday: { recipeId: string; slot: MealSlot; index: number }[];
}

/**
 * Why a slot has no candidate: how many of the slot's recipes each filter excludes, how many relaxing that filter
 * alone would allow (recipes excluded by it and nothing else), and which eligible recipes are already taken by
 * another meal of the day (a recipe is never planned twice on a day).
 */
export function explainUnfilled(catalog: readonly CatalogRecipe[], profile: Profile, slot: MealSlot, dayMeals: readonly PlannedMeal[] = []): UnfilledExplanation {
  const counts = new Map<FilterReason, { excluded: number; unlocks: number }>();
  const onDay = new Map(dayMeals.map((m) => [m.recipeId, m]));
  const usedToday: UnfilledExplanation['usedToday'] = [];
  let inSlot = 0;
  for (const r of catalog) {
    if (!r.slots.includes(slot)) continue;
    inSlot++;
    const reasons = ineligibleReasons(r, profile).filter((x): x is FilterReason => x !== 'slot');
    if (!reasons.length) {
      const m = onDay.get(r.id);
      if (m) usedToday.push({ recipeId: r.id, slot: m.slot, index: m.index });
    }
    for (const reason of reasons) {
      const c = counts.get(reason) ?? { excluded: 0, unlocks: 0 };
      c.excluded++;
      if (reasons.length === 1) c.unlocks++;
      counts.set(reason, c);
    }
  }
  const reasons = [...counts.entries()]
    .map(([reason, c]) => ({ reason, ...c }))
    .sort((a, b) => b.unlocks - a.unlocks || b.excluded - a.excluded);
  return { inSlot, reasons, usedToday };
}

/** What in a recipe goes against the profile (empty when it fits). The slot is not checked. */
export interface Conflict {
  allergens: Allergen[];
  disliked: string[];
  diet: boolean;
  time: boolean;
}

export function recipeConflict(recipe: CatalogRecipe, profile: Profile): Conflict | null {
  const reasons = ineligibleReasons(recipe, profile);
  if (!reasons.length) return null;
  const disliked = new Set(profile.dislikedIngredients);
  return {
    allergens: recipe.allergens.filter((a) => profile.excludeAllergens.includes(a)),
    disliked: [...new Set(recipe.ingredients.map((ri) => ri.ingredientId).filter((id) => disliked.has(id)))],
    diet: reasons.includes('diet'),
    time: reasons.includes('time'),
  };
}

/** Overrides from `from` on whose recipe no longer fits the profile (after the user tightened a setting). */
export function conflictingOverrides(overrides: readonly MealOverride[], byId: ReadonlyMap<string, CatalogRecipe>, profile: Profile, from: ISODate): MealOverride[] {
  return overrides.filter((o) => {
    if (o.date < from) return false;
    const r = byId.get(o.recipeId);
    return !!r && !isEligible(r, profile);
  });
}

/**
 * The portion for putting `recipe` in (slot, index) of `plan`: the allowed portion that best fills what the rest of
 * the day leaves for it, kept within 0.6-1.6 of the meal's usual share. Mirrors swapCandidates' budget in
 * lib/planner.ts (same shares and fallback), which has no export for one arbitrary recipe.
 */
export function portionForMeal(plan: DayPlan, slot: MealSlot, index: number, recipe: CatalogRecipe, profile: Profile, byId: ReadonlyMap<string, CatalogRecipe>): number {
  const T = clampTarget('kcalTarget', profile.kcalTarget, 2000);
  const split = slotEnergySplit(profile.snacksPerDay);
  const share = (split.find((m) => m.slot === slot && m.index === index)?.share ?? split.find((m) => m.slot === slot)?.share ?? 0.1) * T;
  const others = plan.meals.filter((m) => !(m.slot === slot && m.index === index));
  const left = T - dayTotals(others, byId).kcal;
  const budget = Math.min(Math.max(left, share * 0.6), share * 1.6);
  return bestPortion(recipe.perServing.kcal, budget);
}

/** True for a meal the profile doesn't plan (a snack added with "Add to a day"): removing it removes the meal. */
export function isAddedMeal(profile: Pick<Profile, 'snacksPerDay'>, slot: MealSlot, index: number): boolean {
  return !slotEnergySplit(profile.snacksPerDay).some((m) => m.slot === slot && m.index === index);
}

export type AddKind = 'replace' | 'fill' | 'add';

export interface AddOption {
  slot: MealSlot;
  index: number;
  kind: AddKind;
  /** The recipe it replaces (kind 'replace'). */
  replaces?: string;
}

/**
 * Where a recipe can go on a day: every meal of each slot it lists (replacing that meal, or filling it when it
 * is unfilled), plus one new snack when there is room. A slot with no meal gets index 0 added.
 */
export function addOptions(plan: DayPlan, recipe: CatalogRecipe): AddOption[] {
  const out: AddOption[] = [];
  for (const slot of MEAL_SLOTS) {
    if (!recipe.slots.includes(slot)) continue;
    const lanes = new Map<number, AddOption>();
    for (const m of plan.meals) if (m.slot === slot) lanes.set(m.index, { slot, index: m.index, kind: 'replace', replaces: m.recipeId });
    for (const u of plan.unfilled) if (u.slot === slot && !lanes.has(u.index)) lanes.set(u.index, { slot, index: u.index, kind: 'fill' });
    out.push(...[...lanes.values()].sort((a, b) => a.index - b.index));
    if (slot === 'snack' || lanes.size === 0) {
      const free = nextFreeIndex(plan, slot);
      if (free !== null && !lanes.has(free)) out.push({ slot, index: free, kind: 'add' });
    }
  }
  return out;
}

/** Snack indexes on a day (planned or unfilled), in order. */
function snackIndexes(plan: DayPlan): number[] {
  const idx = new Set<number>();
  for (const m of plan.meals) if (m.slot === 'snack') idx.add(m.index);
  for (const u of plan.unfilled) if (u.slot === 'snack') idx.add(u.index);
  return [...idx].sort((a, b) => a - b);
}

/** Snacks on a day (planned or unfilled). */
export function snackCount(plan: DayPlan): number {
  return snackIndexes(plan).length;
}

/**
 * A meal's name on a day: "Lunch", "Snack", or "Snack 1" / "Snack 2" numbered by position among the day's snacks
 * (so an added snack at index 3 next to snack 0 reads "Snack 2", not "Snack 4"). A snack index not on the day
 * yet is named as the next one ("Snack 2" when adding to a day with one snack; "Snack" when there were none).
 */
export function dayMealName(plan: DayPlan, slot: MealSlot, index: number): string {
  if (slot !== 'snack') return mealName(slot, index);
  const snacks = snackIndexes(plan);
  const at = snacks.indexOf(index);
  return at >= 0 ? mealName('snack', at, snacks.length) : mealName('snack', snacks.length, snacks.length + 1);
}

/**
 * The week the planning screens lead with: the week `today` is in, or the next one in its last days (when the
 * shopping list's "week" range rolls over to cover next week too, see shoppingDates in lib/shopping.ts).
 */
export function planningWeek(today: ISODate, weekStart: WeekStart): ISODate[] {
  const range = shoppingDates('week', today, weekStart);
  return weekDates(range[range.length - 1] ?? today, weekStart);
}
