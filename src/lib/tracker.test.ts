import { describe, expect, it } from 'vitest';
import {
  addFood,
  clockTime,
  dayLog,
  dayStatus,
  dayTotals,
  defaultTracker,
  fiberTarget,
  fromUnit,
  logWeight,
  mealLog,
  parseTracker,
  pruneTracker,
  rangeStats,
  recentFoods,
  removeFood,
  removeWeight,
  setMealStatus,
  setWater,
  streak,
  toUnit,
  weightChange,
} from './tracker.ts';
import type { MealLog, Tracker } from './tracker.ts';
import { addDays } from './dates.ts';

const eaten = (slot: MealLog['slot'], kcal: number, extra: Partial<MealLog> = {}): MealLog => ({ slot, index: 0, status: 'eaten', recipeId: `r-${slot}`, kcal, protein: 30, fiber: 8, at: '08:10', ...extra });

/** A tracker with one eaten meal of `kcal` on each date. */
function withDays(entries: Record<string, number>): Tracker {
  let t = defaultTracker();
  for (const [date, kcal] of Object.entries(entries)) t = setMealStatus(t, date, eaten('lunch', kcal));
  return t;
}

describe('parseTracker', () => {
  it('gives defaults for anything that is not a tracker', () => {
    for (const junk of [undefined, null, 42, 'x', [1]]) expect(parseTracker(junk)).toEqual(defaultTracker());
  });

  it('keeps valid logs, clamps numbers and drops bad entries', () => {
    const t = parseTracker({
      days: {
        '2026-10-18': {
          meals: [eaten('breakfast', 9000), { slot: 'brunch', index: 0, status: 'eaten', recipeId: 'x' }, { ...eaten('dinner', 500), status: 'skipped' }],
          foods: [{ id: 'f1', slot: 'snack', name: '  Apple ', kcal: 95, protein: 0.4, at: '25:00' }, { id: 'f2', slot: 'snack', name: '', kcal: 10 }],
          water: 99,
        },
        'not-a-date': { water: 2 },
        '2026-10-17': { meals: [], foods: [], water: 0 },
      },
      weights: [{ date: '2026-10-18', at: '09:41', kg: 72.44 }, { date: '2026-10-18', at: '10:00', kg: 72.2 }, { date: 'x', kg: 70 }, { date: '2026-10-10', kg: 5 }],
      unit: 'stone',
      waterGoal: 0,
    });
    const day = t.days['2026-10-18']!;
    expect(day.meals.map((m) => [m.slot, m.status, m.kcal])).toEqual([
      ['breakfast', 'eaten', 5000],
      ['dinner', 'skipped', 0],
    ]);
    expect(day.foods).toEqual([{ id: 'f1', slot: 'snack', name: 'Apple', kcal: 95, protein: 0, fiber: 0, at: '12:00' }]);
    expect(day.water).toBe(30);
    // Empty days are not kept.
    expect(Object.keys(t.days)).toEqual(['2026-10-18']);
    // One weight per date, the last one wins; out-of-range weights are clamped to the limit.
    expect(t.weights).toEqual([
      { date: '2026-10-10', at: '12:00', kg: 20 },
      { date: '2026-10-18', at: '10:00', kg: 72.2 },
    ]);
    expect(t.unit).toBe('kg');
    expect(t.waterGoal).toBe(1);
  });
});

describe('updates', () => {
  it('logs, changes and clears a planned meal without touching the input', () => {
    const t0 = defaultTracker();
    const t1 = setMealStatus(t0, '2026-10-18', eaten('lunch', 764));
    expect(t0.days).toEqual({});
    expect(mealLog(dayLog(t1, '2026-10-18'), 'lunch', 0)?.kcal).toBe(764);
    const t2 = setMealStatus(t1, '2026-10-18', { ...eaten('lunch', 764), status: 'skipped' });
    expect(dayLog(t2, '2026-10-18').meals).toHaveLength(1);
    expect(mealLog(dayLog(t2, '2026-10-18'), 'lunch', 0)).toMatchObject({ status: 'skipped', kcal: 0 });
    const t3 = setMealStatus(t2, '2026-10-18', { slot: 'lunch', index: 0, status: null });
    expect(t3.days).toEqual({});
    expect(setMealStatus(t3, 'nope', eaten('lunch', 1))).toBe(t3);
  });

  it('adds and removes foods, and sets water', () => {
    let t = addFood(defaultTracker(), '2026-10-18', { id: 'a', slot: 'snack', name: 'Apple', kcal: 95, protein: 0, fiber: 4, at: '10:30' });
    t = setWater(t, '2026-10-18', 6);
    expect(dayTotals(t.days['2026-10-18'])).toEqual({ kcal: 95, protein: 0, fiber: 4, water: 6, logged: true });
    t = removeFood(t, '2026-10-18', 'a');
    expect(dayTotals(t.days['2026-10-18'])).toEqual({ kcal: 0, protein: 0, fiber: 0, water: 6, logged: false });
    expect(setWater(t, '2026-10-18', -3).days['2026-10-18']).toBeUndefined();
    expect(addFood(t, '2026-10-18', { id: 'b', slot: 'snack', name: '', kcal: 1, protein: 0, fiber: 0, at: '10:00' })).toBe(t);
  });

  it('keeps one weight per date in date order', () => {
    let t = logWeight(defaultTracker(), { date: '2026-10-16', at: '08:00', kg: 72.5 });
    t = logWeight(t, { date: '2026-10-10', at: '08:00', kg: 73 });
    t = logWeight(t, { date: '2026-10-16', at: '09:00', kg: 72.4 });
    expect(t.weights.map((w) => [w.date, w.kg])).toEqual([
      ['2026-10-10', 73],
      ['2026-10-16', 72.4],
    ]);
    expect(removeWeight(t, '2026-10-10').weights).toHaveLength(1);
  });

  it('prunes day logs older than the limit', () => {
    const t = withDays({ '2025-01-01': 2000, '2026-10-18': 2000 });
    expect(Object.keys(pruneTracker(t, '2026-10-18').days)).toEqual(['2026-10-18']);
    const kept = withDays({ '2026-10-18': 2000 });
    expect(pruneTracker(kept, '2026-10-18')).toBe(kept);
  });
});

describe('status and streaks', () => {
  it('rates a day against the target: on within 10%, close within 20%', () => {
    const t = (kcal: number) => ({ kcal, protein: 0, fiber: 0, water: 0, logged: true });
    expect(dayStatus(t(1850), 2000)).toBe('on');
    expect(dayStatus(t(2200), 2000)).toBe('on');
    expect(dayStatus(t(1650), 2000)).toBe('close');
    expect(dayStatus(t(1500), 2000)).toBe('missed');
    expect(dayStatus({ ...t(0), logged: false }, 2000)).toBe('empty');
  });

  it('counts the current run up to today without breaking it before today is done', () => {
    const today = '2026-10-18';
    const days: Record<string, number> = {};
    for (let i = 1; i <= 12; i++) days[addDays(today, -i)] = 2000;
    days[addDays(today, -13)] = 1200;
    for (let i = 14; i <= 32; i++) days[addDays(today, -i)] = 1980;
    const t = withDays(days);
    expect(streak(t, today, 2000)).toEqual({ current: 12, since: '2026-10-06', best: 19 });
    // Once today is on target it joins the run.
    const t2 = setMealStatus(t, today, eaten('lunch', 2000));
    expect(streak(t2, today, 2000).current).toBe(13);
    expect(streak(defaultTracker(), today, 2000)).toEqual({ current: 0, since: null, best: 0 });
  });

  it('averages over logged days only', () => {
    let t = withDays({ '2026-10-16': 2000, '2026-10-17': 1600 });
    t = setWater(t, '2026-10-17', 6);
    t = setWater(t, '2026-10-18', 8);
    const s = rangeStats(t, ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'], 2000);
    expect(s).toEqual({ days: 4, loggedDays: 2, avgKcal: 1800, avgProtein: 30, avgWater: 7, onTarget: 1 });
  });
});

describe('weight and helpers', () => {
  it('measures the change over the last 30 days', () => {
    let t = defaultTracker();
    t = logWeight(t, { date: '2026-08-01', at: '08:00', kg: 80 });
    expect(weightChange(t)).toBeNull();
    t = logWeight(t, { date: '2026-09-18', at: '08:00', kg: 74 });
    t = logWeight(t, { date: '2026-10-18', at: '08:00', kg: 72.4 });
    expect(weightChange(t)).toBe(-1.6);
  });

  it('converts units, sets a fiber target and formats the clock', () => {
    expect(toUnit(72.4, 'lb')).toBeCloseTo(159.6, 1);
    expect(fromUnit(toUnit(72.4, 'lb'), 'lb')).toBeCloseTo(72.4, 6);
    expect(toUnit(72.4, 'kg')).toBe(72.4);
    expect(fiberTarget(2000)).toBe(28);
    expect(clockTime(new Date(2026, 9, 18, 8, 5))).toBe('08:05');
  });

  it('lists recent foods newest first, once each', () => {
    let t = addFood(defaultTracker(), '2026-10-16', { id: 'a', slot: 'snack', name: 'Apple', kcal: 95, protein: 0, fiber: 0, at: '10:00' });
    t = addFood(t, '2026-10-17', { id: 'b', slot: 'snack', name: 'Dates', kcal: 240, protein: 2, fiber: 0, recipeId: 'dates', at: '16:00' });
    t = addFood(t, '2026-10-18', { id: 'c', slot: 'snack', name: 'apple', kcal: 95, protein: 0, fiber: 0, at: '10:30' });
    expect(recentFoods(t).map((f) => f.id)).toEqual(['c', 'b']);
  });
});
