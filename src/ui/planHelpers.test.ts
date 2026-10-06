import { describe, expect, it } from 'vitest';
import type { DayPlan } from '../types.ts';
import { FIXTURE_BY_ID, FIXTURE_CATALOG, makeProfile, syntheticRecipe } from '../lib/test-fixtures.ts';
import { planDay, PORTIONS } from '../lib/planner.ts';
import {
  addOptions,
  conflictingOverrides,
  dayMealName,
  explainUnfilled,
  isAddedMeal,
  planningWeek,
  portionForMeal,
  recipeConflict,
  snackCount,
} from './planHelpers.ts';

describe('explainUnfilled', () => {
  it('says how many recipes each filter excludes and what relaxing it alone would allow', () => {
    const profile = makeProfile({ diet: 'vegan', maxTotalMinutes: 5 });
    const why = explainUnfilled(FIXTURE_CATALOG, profile, 'breakfast');
    const inSlot = FIXTURE_CATALOG.filter((r) => r.slots.includes('breakfast')).length;
    expect(why.inSlot).toBe(inSlot);
    const time = why.reasons.find((r) => r.reason === 'time');
    const diet = why.reasons.find((r) => r.reason === 'diet');
    expect(time && time.excluded).toBeGreaterThan(0);
    expect(diet && diet.excluded).toBeGreaterThan(0);
    // Sorted by what relaxing one filter unlocks.
    for (let i = 1; i < why.reasons.length; i++) expect(why.reasons[i - 1]!.unlocks).toBeGreaterThanOrEqual(why.reasons[i]!.unlocks);
  });

  it('reports an empty library slot', () => {
    expect(explainUnfilled([], makeProfile(), 'lunch')).toEqual({ inSlot: 0, reasons: [], usedToday: [] });
  });

  it('names the eligible recipe another meal of the day already uses (not "your settings exclude all")', () => {
    const quick = syntheticRecipe('quick-salad', ['lunch', 'dinner'], 500, 'western', { prepMinutes: 10, cookMinutes: 0 });
    const slow = syntheticRecipe('slow-stew', ['dinner'], 600, 'iraqi', { prepMinutes: 20, cookMinutes: 60 });
    const profile = makeProfile({ maxTotalMinutes: 15 });
    const why = explainUnfilled([quick, slow], profile, 'dinner', [{ slot: 'lunch', index: 0, recipeId: 'quick-salad', portion: 1 }]);
    expect(why.inSlot).toBe(2);
    expect(why.usedToday).toEqual([{ recipeId: 'quick-salad', slot: 'lunch', index: 0 }]);
    expect(why.reasons).toEqual([{ reason: 'time', excluded: 1, unlocks: 1 }]);
  });
});

describe('addOptions', () => {
  const ctx = { profile: makeProfile({ snacksPerDay: 1 }), catalog: FIXTURE_CATALOG };
  const plan = planDay('2026-09-24', ctx);

  it('offers to replace each planned meal of the recipe’s slots, plus another snack', () => {
    const snack = FIXTURE_BY_ID.get('yogurt-honey-cup')!; // breakfast and snack
    const opts = addOptions(plan, snack);
    expect(opts.map((o) => `${o.slot}#${o.index}:${o.kind}`)).toEqual(['breakfast#0:replace', 'snack#0:replace', 'snack#1:add']);
    expect(opts[0]!.replaces).toBe(plan.meals.find((m) => m.slot === 'breakfast')!.recipeId);
  });

  it('fills an unfilled meal and adds a meal to an empty slot', () => {
    const day: DayPlan = { date: '2026-09-24', meals: [], totals: plan.totals, unfilled: [{ slot: 'lunch', index: 0 }] };
    const opts = addOptions(day, FIXTURE_BY_ID.get('mujaddara')!);
    expect(opts).toEqual([
      { slot: 'lunch', index: 0, kind: 'fill' },
      { slot: 'dinner', index: 0, kind: 'add' },
    ]);
  });

  it('counts snacks', () => {
    expect(snackCount(plan)).toBe(1);
  });
});

describe('portionForMeal', () => {
  it('picks an allowed portion that fits what the day leaves', () => {
    const profile = makeProfile();
    const plan = planDay('2026-09-24', { profile, catalog: FIXTURE_CATALOG });
    const recipe = FIXTURE_BY_ID.get('red-lentil-soup')!;
    const p = portionForMeal(plan, 'dinner', 0, recipe, profile, FIXTURE_BY_ID);
    expect(PORTIONS).toContain(p);
    const others = plan.meals.filter((m) => m.slot !== 'dinner').reduce((s, m) => s + FIXTURE_BY_ID.get(m.recipeId)!.perServing.kcal * m.portion, 0);
    const withIt = others + recipe.perServing.kcal * p;
    // Never worse than the recipe at one serving.
    expect(Math.abs(withIt - profile.kcalTarget)).toBeLessThanOrEqual(Math.abs(others + recipe.perServing.kcal - profile.kcalTarget) + 1e-9);
  });
});

describe('conflicts with the profile', () => {
  const shakshuka = FIXTURE_BY_ID.get('shakshuka')!;

  it('names the allergens and disliked ingredients a recipe has, and diet and time misses', () => {
    expect(recipeConflict(shakshuka, makeProfile())).toBeNull();
    const c = recipeConflict(shakshuka, makeProfile({ excludeAllergens: ['egg', 'gluten'], dislikedIngredients: ['onion'], diet: 'vegan', maxTotalMinutes: 10 }));
    expect(c).toEqual({ allergens: ['egg'], disliked: ['onion'], diet: true, time: true });
  });

  it('finds picks from today on that no longer fit (an egg dish after Egg is excluded)', () => {
    const overrides = [
      { date: '2026-09-24', slot: 'lunch' as const, index: 0, recipeId: 'shakshuka', portion: 1 },
      { date: '2026-09-26', slot: 'lunch' as const, index: 0, recipeId: 'shakshuka', portion: 1 },
      { date: '2026-09-26', slot: 'dinner' as const, index: 0, recipeId: 'mujaddara', portion: 1 },
    ];
    const out = conflictingOverrides(overrides, FIXTURE_BY_ID, makeProfile({ excludeAllergens: ['egg'] }), '2026-09-25');
    expect(out).toEqual([overrides[1]]);
  });
});

describe('meal names on a day', () => {
  const day: DayPlan = {
    date: '2026-09-25',
    meals: [
      { slot: 'lunch', index: 0, recipeId: 'a', portion: 1 },
      { slot: 'snack', index: 0, recipeId: 'b', portion: 1 },
      { slot: 'snack', index: 3, recipeId: 'c', portion: 1 },
    ],
    totals: planDay('2026-09-25', { profile: makeProfile(), catalog: FIXTURE_CATALOG }).totals,
    unfilled: [],
  };

  it('numbers snacks by position, not by stored index', () => {
    expect(dayMealName(day, 'lunch', 0)).toBe('Lunch');
    expect(dayMealName(day, 'snack', 0)).toBe('Snack 1');
    expect(dayMealName(day, 'snack', 3)).toBe('Snack 2');
    expect(dayMealName(day, 'snack', 4)).toBe('Snack 3');
  });

  it('calls the first snack added to a day without snacks just "Snack"', () => {
    const none: DayPlan = { ...day, meals: day.meals.filter((m) => m.slot !== 'snack') };
    expect(dayMealName(none, 'snack', 0)).toBe('Snack');
  });

  it('tells an added meal from one the profile plans', () => {
    expect(isAddedMeal({ snacksPerDay: 0 }, 'snack', 0)).toBe(true);
    expect(isAddedMeal({ snacksPerDay: 1 }, 'snack', 0)).toBe(false);
    expect(isAddedMeal({ snacksPerDay: 1 }, 'snack', 1)).toBe(true);
    expect(isAddedMeal({ snacksPerDay: 0 }, 'dinner', 0)).toBe(false);
  });
});

describe('planningWeek', () => {
  it('is the current week early on, and next week in its last two days (as the shopping week rolls over)', () => {
    // Saturday start: Sat 19 - Fri 25 Sept 2026.
    expect(planningWeek('2026-09-22', 'saturday')).toEqual(['2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']);
    expect(planningWeek('2026-09-23', 'saturday')[0]).toBe('2026-09-19');
    expect(planningWeek('2026-09-24', 'saturday')[0]).toBe('2026-09-26');
    expect(planningWeek('2026-09-25', 'saturday')[0]).toBe('2026-09-26');
    expect(planningWeek('2026-09-26', 'saturday')[0]).toBe('2026-09-26');
  });
});
