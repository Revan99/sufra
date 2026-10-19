// Glue between the plan and the tracker for Today: the order meals are shown in, a typical time for each, what a
// planned meal holds when it's ticked off, and which meal is next.
import type { CatalogRecipe, DayPlan, MealSlot, PlannedMeal } from '../types.ts';
import type { DayLog, MealLog, MealStatus } from '../lib/tracker.ts';
import { clockTime, mealLog } from '../lib/tracker.ts';

export const SLOT_ORDER: Readonly<Record<MealSlot, number>> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };

/** A typical local time for a meal, 'HH:MM' (shown as a hint: "Next up · Dinner · 19:00"). */
export function mealTime(slot: MealSlot, index: number): string {
  switch (slot) {
    case 'breakfast':
      return '08:00';
    case 'lunch':
      return '12:30';
    case 'dinner':
      return '19:00';
    case 'snack':
      return index === 0 ? '16:00' : '10:30';
  }
}

/** 'HH:MM' as people write it: "8:10", "19:00". */
export function shortTime(hhmm: string): string {
  const [h = '0', m = '00'] = hhmm.split(':');
  return `${Number(h)}:${m}`;
}

/** What a planned meal's portion holds, rounded for the log. */
export function mealSnapshot(meal: PlannedMeal, recipe: CatalogRecipe, status: MealStatus, now: Date = new Date()): MealLog {
  const p = meal.portion;
  const eaten = status === 'eaten';
  return {
    slot: meal.slot,
    index: meal.index,
    status,
    recipeId: recipe.id,
    kcal: eaten ? Math.round(recipe.perServing.kcal * p) : 0,
    protein: eaten ? Math.round(recipe.perServing.protein * p) : 0,
    fiber: eaten ? Math.round(recipe.perServing.fiber * p) : 0,
    at: clockTime(now),
  };
}

/** The status a planned meal shows: its log's, while the log is for the recipe planned now (or was eaten). */
export function statusOf(day: DayLog, meal: PlannedMeal): MealLog | undefined {
  const log = mealLog(day, meal.slot, meal.index);
  if (!log) return undefined;
  return log.status === 'eaten' || log.recipeId === meal.recipeId ? log : undefined;
}

/** Meals in the order Today lists them. */
export function orderedMeals(plan: DayPlan): PlannedMeal[] {
  return [...plan.meals].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] || a.index - b.index);
}

/** The meal to feature: the first one not yet logged, else the last (the day is done). */
export function featuredMeal(plan: DayPlan, day: DayLog): { meal: PlannedMeal; done: boolean } | null {
  const meals = orderedMeals(plan);
  const next = meals.find((m) => !statusOf(day, m));
  if (next) return { meal: next, done: false };
  const last = meals[meals.length - 1];
  return last ? { meal: last, done: true } : null;
}
