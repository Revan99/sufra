import { describe, expect, it } from 'vitest';
import type { CatalogRecipe, DayPlan, PlannedMeal } from '../types.ts';
import { emptyDay } from '../lib/tracker.ts';
import { featuredMeal, mealSnapshot, mealTime, orderedMeals, shortTime, statusOf } from './tracking.ts';

const meal = (slot: PlannedMeal['slot'], recipeId: string, index = 0): PlannedMeal => ({ slot, index, recipeId, portion: 1.25 }) as PlannedMeal;
const plan = (meals: PlannedMeal[]): DayPlan => ({ date: '2026-10-18', meals, unfilled: [] }) as unknown as DayPlan;

describe('tracking helpers', () => {
  it('orders meals breakfast, lunch, dinner, snack', () => {
    const p = plan([meal('snack', 's'), meal('dinner', 'd'), meal('breakfast', 'b'), meal('lunch', 'l')]);
    expect(orderedMeals(p).map((m) => m.recipeId)).toEqual(['b', 'l', 'd', 's']);
  });

  it('features the first meal not yet logged, or the last one when all are', () => {
    const p = plan([meal('breakfast', 'b'), meal('lunch', 'l'), meal('dinner', 'd')]);
    const day = { ...emptyDay(), meals: [{ slot: 'breakfast' as const, index: 0, status: 'eaten' as const, recipeId: 'b', kcal: 1, protein: 0, fiber: 0, at: '08:10' }] };
    expect(featuredMeal(p, day)).toEqual({ meal: p.meals[1], done: false });
    const all = { ...day, meals: [...day.meals, { ...day.meals[0]!, slot: 'lunch' as const, recipeId: 'l' }, { ...day.meals[0]!, slot: 'dinner' as const, recipeId: 'd', status: 'skipped' as const }] };
    expect(featuredMeal(p, all)).toEqual({ meal: p.meals[2], done: true });
    expect(featuredMeal(plan([]), emptyDay())).toBeNull();
  });

  it('ignores a skip logged for a recipe that is no longer planned, but keeps an eaten one', () => {
    const m = meal('lunch', 'new');
    const skipped = { ...emptyDay(), meals: [{ slot: 'lunch' as const, index: 0, status: 'skipped' as const, recipeId: 'old', kcal: 0, protein: 0, fiber: 0, at: '12:00' }] };
    expect(statusOf(skipped, m)).toBeUndefined();
    const eaten = { ...skipped, meals: [{ ...skipped.meals[0]!, status: 'eaten' as const }] };
    expect(statusOf(eaten, m)?.status).toBe('eaten');
  });

  it('snapshots the portion and formats times', () => {
    const recipe = { id: 'r', perServing: { kcal: 400, protein: 30, fiber: 6 } } as unknown as CatalogRecipe;
    expect(mealSnapshot(meal('lunch', 'r'), recipe, 'eaten', new Date(2026, 9, 18, 8, 10))).toEqual({ slot: 'lunch', index: 0, status: 'eaten', recipeId: 'r', kcal: 500, protein: 38, fiber: 8, at: '08:10' });
    expect(mealSnapshot(meal('lunch', 'r'), recipe, 'skipped').kcal).toBe(0);
    expect(shortTime('08:10')).toBe('8:10');
    expect(mealTime('dinner', 0)).toBe('19:00');
  });
});
