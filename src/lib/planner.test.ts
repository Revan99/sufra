import { describe, expect, it, vi } from 'vitest';
import type { CatalogRecipe, DayPlan, MealOverride, MealSlot, Profile } from '../types.ts';
import { ALLERGENS } from '../types.ts';
import { addDays, dateRange, dayNumber } from './dates.ts';
import { isEligible } from './filters.ts';
import {
  EPOCH_DAYS,
  PORTIONS,
  RED_MEAT_WEEK_G,
  SODIUM_BUDGET,
  TAIL_DAYS,
  bestPortion,
  describePools,
  greedyMinPool,
  nextFreeIndex,
  planDay,
  planRange,
  profileKey,
  proteinSource,
  rotationMinPool,
  swapCandidates,
  tableRecipes,
} from './planner.ts';
import type { PlanContext } from './planner.ts';
import { mulberry32 } from './random.ts';
import { slotEnergySplit } from './targets.ts';
import { FIXTURE_BY_ID, FIXTURE_CATALOG, FIXTURE_INDEX, expandedCatalog, makeProfile, syntheticRecipe } from './test-fixtures.ts';
import { checkPlans, findRuleKeepingSwap } from './test-plan-checks.ts';

// 90 days from mid-November: crosses week, month, year and 28-day epoch boundaries.
const START = '2026-11-14';
const DAYS = 90;

const PROFILES: Record<string, Profile> = {
  'omnivore 2000 kcal, 1 snack': makeProfile(),
  'vegan 1600 kcal, 2 snacks': makeProfile({ diet: 'vegan', kcalTarget: 1600, proteinTarget: 70, snacksPerDay: 2 }),
  'vegetarian gluten-free 2400 kcal, no snacks': makeProfile({ diet: 'vegetarian', excludeAllergens: ['gluten'], kcalTarget: 2400, proteinTarget: 100, snacksPerDay: 0 }),
  'tiny pool': makeProfile({ diet: 'vegan', excludeAllergens: ['gluten', 'soy'], maxTotalMinutes: 20 }),
  'empty pool': makeProfile({ diet: 'vegan', excludeAllergens: ['gluten', 'soy', 'sesame', 'tree-nut'], maxTotalMinutes: 5 }),
};
const MAIN_PROFILES = ['omnivore 2000 kcal, 1 snack', 'vegan 1600 kcal, 2 snacks', 'vegetarian gluten-free 2400 kcal, no snacks'];

const CATALOGS: Record<string, readonly CatalogRecipe[]> = {
  'fixture catalog (45)': FIXTURE_CATALOG,
  'expanded catalog (180)': expandedCatalog(4),
};

const ctxFor = (profile: Profile, catalog: readonly CatalogRecipe[], extra: Partial<PlanContext> = {}): PlanContext => ({
  profile,
  catalog,
  ingredientIndex: FIXTURE_INDEX,
  ...extra,
});

/** checkPlans with the planner's rotation schedule, so swaps into a recipe the table serves nearby don't count. */
const check = (plans: readonly DayPlan[], ctx: PlanContext) =>
  checkPlans(plans, ctx.profile, ctx.catalog, { scheduled: (date, slot) => tableRecipes(date, slot, ctx) });

/** A fresh copy of the catalog array: a cold planner cache, same recipes. */
const fresh = (catalog: readonly CatalogRecipe[]) => catalog.slice();

function slotRecipes(plans: readonly DayPlan[], slot: MealSlot): string[][] {
  return plans.map((p) => p.meals.filter((m) => m.slot === slot).map((m) => m.recipeId));
}

describe.each(Object.entries(CATALOGS))('planner properties on the %s', (_catName, catalog) => {
  describe.each(Object.entries(PROFILES))('%s', (name, profile) => {
    const plans = planRange(START, DAYS, ctxFor(profile, catalog));
    const report = check(plans, ctxFor(profile, catalog));

    it('meets the hard rules on every day (eligibility, no same-day duplicate, 7-day spacing, portions, lanes)', () => {
      expect(plans).toHaveLength(DAYS);
      expect(report.errors).toEqual([]);
    });

    it('is deterministic: a cold cache, any planning order and a reordered catalog give the same plans', () => {
      const reversed = dateRange(START, DAYS)
        .reverse()
        .map((d) => planDay(d, ctxFor(profile, fresh(catalog))))
        .reverse();
      expect(reversed).toEqual(plans);
      const shuffled = [...catalog].sort((a, b) => (a.id < b.id ? 1 : -1));
      expect(planRange(START, DAYS, ctxFor(profile, shuffled))).toEqual(plans);
      // Fields outside the profile key (week start, household, body stats) never change the plan.
      const other = { ...profile, weekStart: 'monday' as const, householdSize: 5 };
      expect(planRange(START, 14, ctxFor(other, fresh(catalog)))).toEqual(plans.slice(0, 14));
    });

    it('spreads repeats as far apart as the pool allows', () => {
      const lanes = slotEnergySplit(profile.snacksPerDay);
      for (const s of report.slots) {
        if (s.eligible >= 7 * s.mealsPerDay) expect(s.minGap, s.slot).toBeGreaterThanOrEqual(7);
        else if (s.eligible >= 2 * s.mealsPerDay) {
          // Small pool. Alone in its slot it keeps the widest spacing, ⌊n / k⌋ days; sharing recipes with another
          // of the day's meals it can still never serve the same recipe two days running.
          const mine = catalog.filter((r) => isEligible(r, profile, s.slot)).map((r) => r.id);
          const shared = lanes.some((l) => l.slot !== s.slot && catalog.some((r) => mine.includes(r.id) && isEligible(r, profile, l.slot)));
          expect(s.minGap, s.slot).toBeGreaterThanOrEqual(shared ? 2 : Math.floor(s.eligible / s.mealsPerDay));
        }
      }
    });

    it('fills every meal it can and reports the rest as unfilled', () => {
      const n = slotEnergySplit(profile.snacksPerDay).length;
      for (const p of plans) {
        expect(p.meals.length + p.unfilled.length).toBe(n);
        for (const u of p.unfilled) expect(catalog.filter((r) => isEligible(r, profile, u.slot)).length).toBeLessThanOrEqual(u.index);
      }
    });

    if (MAIN_PROFILES.includes(name)) {
      it('lands every day within ±10% of the kcal target and protein at 90% whenever the recipes allow', () => {
        expect(report.kcalInBand).toBe(DAYS);
        expect(report.proteinOk).toBeGreaterThanOrEqual(report.proteinAchievable);
        expect(report.meanProteinRatio).toBeGreaterThan(1);
      });

      it('gets round to (nearly) every eligible recipe within 90 days', () => {
        const slots = slotEnergySplit(profile.snacksPerDay).map((l) => l.slot);
        const eligible = catalog.filter((r) => slots.some((s) => isEligible(r, profile, s)));
        const used = new Set(plans.flatMap((p) => p.meals.map((m) => m.recipeId)));
        expect(used.size / eligible.length).toBeGreaterThanOrEqual(catalog.length <= 60 ? 1 : 0.9);
      });
    }
  });
});

describe('slot modes', () => {
  it('chooses greedy, rotation, small and empty by pool size', () => {
    expect(greedyMinPool(1)).toBe(17);
    expect(greedyMinPool(2)).toBe(29);
    expect(rotationMinPool(1)).toBe(7);
    expect(rotationMinPool(2)).toBe(14);
    const modes = (p: Profile, c: readonly CatalogRecipe[]) => Object.fromEntries(describePools(ctxFor(p, c)).map((s) => [s.slot, s.mode]));
    expect(modes(PROFILES['omnivore 2000 kcal, 1 snack'] as Profile, FIXTURE_CATALOG)).toEqual({ breakfast: 'rotation', lunch: 'greedy', dinner: 'greedy', snack: 'rotation' });
    expect(modes(PROFILES['vegan 1600 kcal, 2 snacks'] as Profile, FIXTURE_CATALOG)).toEqual({ breakfast: 'small', lunch: 'rotation', dinner: 'rotation', snack: 'small' });
    expect(modes(PROFILES['tiny pool'] as Profile, FIXTURE_CATALOG)).toEqual({ breakfast: 'small', lunch: 'empty', dinner: 'empty', snack: 'small' });
    expect(modes(PROFILES['omnivore 2000 kcal, 1 snack'] as Profile, CATALOGS['expanded catalog (180)'] as CatalogRecipe[])).toEqual({
      breakfast: 'greedy',
      lunch: 'greedy',
      dinner: 'greedy',
      snack: 'greedy',
    });
  });

  it('builds lunch and dinner together when they share a small pool, with one period', () => {
    const pools = describePools(ctxFor(PROFILES['vegan 1600 kcal, 2 snacks'] as Profile, FIXTURE_CATALOG));
    const lunch = pools.find((p) => p.slot === 'lunch');
    const dinner = pools.find((p) => p.slot === 'dinner');
    expect(lunch?.synced && dinner?.synced).toBe(true);
    expect(lunch?.period).toBe(dinner?.period);
    expect(lunch?.period).toBeGreaterThanOrEqual(7);
    // Lunch and dinner draw on the same 9 recipes; each still waits 9 days and they never meet on a day.
    const plans = planRange(START, 120, ctxFor(PROFILES['vegan 1600 kcal, 2 snacks'] as Profile, FIXTURE_CATALOG));
    const l = slotRecipes(plans, 'lunch').map((x) => x[0]);
    const d = slotRecipes(plans, 'dinner').map((x) => x[0]);
    for (let i = 0; i < plans.length; i++) {
      expect(l[i]).not.toBe(d[i]);
      if (i >= 9) expect(l[i]).toBe(l[i - 9]);
    }
  });
});

describe('variety across week and epoch boundaries', () => {
  it('never repeats a recipe in a slot within 7 days over 400 days, any week start', () => {
    for (const [catName, catalog] of Object.entries(CATALOGS)) {
      for (const pName of MAIN_PROFILES) {
        const profile = PROFILES[pName] as Profile;
        const plans = planRange('2025-12-20', 400, ctxFor(profile, catalog));
        const report = check(plans, ctxFor(profile, catalog));
        expect(report.errors, `${catName} / ${pName}`).toEqual([]);
      }
    }
  });

  it('works for dates before 1970 and far in the future', () => {
    const profile = PROFILES['omnivore 2000 kcal, 1 snack'] as Profile;
    for (const start of ['1969-12-10', '2099-12-20']) {
      const plans = planRange(start, 60, ctxFor(profile, CATALOGS['expanded catalog (180)'] as CatalogRecipe[]));
      expect(checkPlans(plans, profile, CATALOGS['expanded catalog (180)'] as CatalogRecipe[]).errors).toEqual([]);
    }
  });

  it('keeps every hard rule on random catalogs with overlapping slots and favorites (fuzz)', () => {
    const rng = mulberry32(31);
    const slotsSets: MealSlot[][] = [['breakfast'], ['lunch'], ['dinner'], ['snack'], ['lunch', 'dinner'], ['breakfast', 'snack'], ['breakfast', 'lunch', 'dinner'], ['lunch', 'dinner', 'snack'], ['breakfast', 'lunch', 'dinner', 'snack']];
    const cuisines = ['kurdish', 'iraqi', 'levantine', 'turkish', 'persian', 'western'] as const;
    for (let trial = 0; trial < 80; trial++) {
      const n = Math.floor(rng() * 70);
      const weights = slotsSets.map(() => rng());
      const catalog: CatalogRecipe[] = [];
      for (let i = 0; i < n; i++) {
        let x = rng() * weights.reduce((a, b) => a + b, 0);
        let k = 0;
        while (k < weights.length - 1 && x > (weights[k] as number)) x -= weights[k++] as number;
        const slots = slotsSets[k] as MealSlot[];
        const kcal = slots.includes('snack') && slots.length === 1 ? 120 + rng() * 200 : 280 + rng() * 450;
        catalog.push(syntheticRecipe(`r${trial}-${i}`, slots, kcal, cuisines[Math.floor(rng() * cuisines.length)]));
      }
      const profile = makeProfile({ snacksPerDay: Math.floor(rng() * 3) as 0 | 1 | 2, kcalTarget: 1400 + Math.round(rng() * 1400) });
      const start = addDays('2026-01-01', Math.floor(rng() * 400));
      const favorites = catalog.filter(() => rng() < 0.2).map((r) => r.id);
      const ctx = ctxFor(profile, catalog, { favorites });
      const plans = planRange(start, 70, ctx);
      const report = check(plans, ctx);
      expect(report.errors, `trial ${trial}: ${JSON.stringify(describePools(ctx).map((p) => [p.slot, p.mode, p.eligible, p.period]))}`).toEqual([]);
    }
  });
});

describe('balance, protein and favorites', () => {
  it('uses only the allowed portions and recomputes totals', () => {
    const plans = planRange(START, 30, ctxFor(PROFILES['omnivore 2000 kcal, 1 snack'] as Profile, FIXTURE_CATALOG));
    for (const p of plans) {
      for (const m of p.meals) expect(PORTIONS).toContain(m.portion);
      const kcal = p.meals.reduce((a, m) => a + (FIXTURE_BY_ID.get(m.recipeId)?.perServing.kcal ?? 0) * m.portion, 0);
      expect(p.totals.kcal).toBeCloseTo(kcal, 6);
    }
  });

  it('prefers higher-protein recipes: a high-protein target picks denser recipes, not just bigger portions', () => {
    // The seed doesn't depend on the targets, so both plans start from the same tables and queues and differ only in
    // what the planner chooses. Measure the recipes (protein per kcal at one serving), not the portions.
    const catalog = CATALOGS['expanded catalog (180)'] as CatalogRecipe[];
    const byId = new Map(catalog.map((r) => [r.id, r]));
    const density = (proteinTarget: number) => {
      const plans = planRange(START, 60, ctxFor(makeProfile({ proteinTarget }), catalog));
      const d = plans.flatMap((p) => p.meals.map((m) => ((byId.get(m.recipeId) as CatalogRecipe).perServing.protein / (byId.get(m.recipeId) as CatalogRecipe).perServing.kcal)));
      return d.reduce((a, b) => a + b, 0) / d.length;
    };
    expect(density(150)).toBeGreaterThan(density(60) * 1.05);
    const high = checkPlans(planRange(START, 60, ctxFor(makeProfile({ proteinTarget: 150 }), catalog)), makeProfile({ proteinTarget: 150 }), catalog);
    expect(high.errors).toEqual([]);
    expect(high.proteinOk).toBeGreaterThanOrEqual(high.proteinAchievable);
  });

  it('lands kcal every day, and protein on every day a rule-keeping swap could, for low, high-protein and weight-loss targets', () => {
    const catalog = CATALOGS['expanded catalog (180)'] as CatalogRecipe[];
    const profiles = [
      makeProfile({ kcalTarget: 1300, proteinTarget: 80, snacksPerDay: 2 }),
      // What the calculator suggests for a 90 kg man losing weight: 31% of energy from protein.
      makeProfile({ kcalTarget: 1850, proteinTarget: 145 }),
      makeProfile({ diet: 'vegetarian', kcalTarget: 1850, proteinTarget: 145 }),
      makeProfile({ diet: 'vegan', kcalTarget: 1850, proteinTarget: 145 }),
      makeProfile({ kcalTarget: 2000, proteinTarget: 150 }),
      makeProfile({ diet: 'vegan', kcalTarget: 2000, proteinTarget: 110 }),
    ];
    for (const profile of profiles) {
      const report = checkPlans(planRange(START, DAYS, ctxFor(profile, catalog)), profile, catalog);
      const label = `${profile.diet} ${profile.kcalTarget} kcal / ${profile.proteinTarget} g`;
      // errors include every day (with 6 planned days either side) that misses protein although one swap that keeps
      // the 7-day and same-day rules would reach it: the per-day form of "90% of target when achievable".
      expect(report.errors, label).toEqual([]);
      expect(report.swapChecked, label).toBe(DAYS - 12);
      expect(report.kcalInBand, label).toBe(DAYS);
    }
  });

  it('lands the kcal band on high targets without snacks (3000-3600 kcal, regression)', () => {
    // 3250/110 and 3550/145 are what the calculator gives a 30-year-old, 180 cm, 90 kg active man to maintain and
    // to gain. Every day needs big mains, so earlier meals must leave the later ones something that fits, and every
    // eligible recipe has to stay open to every slot.
    const catalog = CATALOGS['expanded catalog (180)'] as CatalogRecipe[];
    for (const [kcalTarget, proteinTarget] of [[3000, 130], [3250, 110], [3550, 145], [3600, 150]] as const) {
      const profile = makeProfile({ kcalTarget, proteinTarget, snacksPerDay: 0 });
      const report = checkPlans(planRange(START, DAYS, ctxFor(profile, catalog)), profile, catalog);
      expect(report.errors, `${kcalTarget}/${proteinTarget}`).toEqual([]);
      expect(report.kcalInBand, `${kcalTarget}/${proteinTarget}`).toBe(DAYS);
    }
    // Rotation tables too: a rotation day may depart from its table to repair the band.
    const pescatarian = makeProfile({ diet: 'pescatarian', kcalTarget: 2600, proteinTarget: 130, snacksPerDay: 0 });
    expect(describePools(ctxFor(pescatarian, FIXTURE_CATALOG)).map((p) => p.mode)).toEqual(['rotation', 'rotation', 'rotation']);
    const report = check(planRange(START, DAYS, ctxFor(pescatarian, FIXTURE_CATALOG)), ctxFor(pescatarian, FIXTURE_CATALOG));
    expect(report.errors).toEqual([]);
    expect(report.kcalInBand).toBe(DAYS);
  });

  it('keeps every rule and repairs every day it can on random catalogs at extreme targets (fuzz)', () => {
    // Rotation-heavy synthetic pools and 1200-3800 kcal targets: the days that need repairs most.
    const rng = mulberry32(5);
    const slotsSets: MealSlot[][] = [['breakfast'], ['lunch'], ['dinner'], ['snack'], ['lunch', 'dinner'], ['breakfast', 'snack'], ['breakfast', 'lunch', 'dinner', 'snack']];
    const cuisines = ['kurdish', 'iraqi', 'levantine', 'turkish', 'persian', 'western'] as const;
    for (let trial = 0; trial < 40; trial++) {
      const n = 20 + Math.floor(rng() * 60);
      const catalog = Array.from({ length: n }, (_, i) => {
        const slots = slotsSets[Math.floor(rng() * slotsSets.length)] as MealSlot[];
        const kcal = slots.length === 1 && slots[0] === 'snack' ? 100 + rng() * 250 : 250 + rng() * 550;
        return syntheticRecipe(`x${trial}-${i}`, slots, kcal, cuisines[Math.floor(rng() * cuisines.length)]);
      });
      const profile = makeProfile({ snacksPerDay: Math.floor(rng() * 3) as 0 | 1 | 2, kcalTarget: 50 * Math.round((1200 + rng() * 2600) / 50), proteinTarget: 5 * Math.round((50 + rng() * 130) / 5) });
      const ctx = ctxFor(profile, catalog);
      const report = check(planRange(addDays('2026-01-01', Math.floor(rng() * 400)), 60, ctx), ctx);
      expect(report.errors, `trial ${trial}: ${JSON.stringify(describePools(ctx).map((p) => [p.slot, p.mode, p.eligible, p.period]))}`).toEqual([]);
    }
  });

  it('tableRecipes gives the rotation and small tables for a date', () => {
    const vegan = PROFILES['vegan 1600 kcal, 2 snacks'] as Profile;
    const ctx = ctxFor(vegan, FIXTURE_CATALOG);
    const plans = planRange(START, 30, ctx);
    let same = 0;
    for (const p of plans) {
      const lunch = tableRecipes(p.date, 'lunch', ctx);
      expect(lunch).toHaveLength(1);
      if (lunch[0] === p.meals.find((m) => m.slot === 'lunch')?.recipeId) same++;
      expect(tableRecipes(p.date, 'snack', ctx)).toHaveLength(2);
    }
    expect(same).toBeGreaterThanOrEqual(28); // only a repair departs from the table
    const omnivore = ctxFor(PROFILES['omnivore 2000 kcal, 1 snack'] as Profile, CATALOGS['expanded catalog (180)'] as CatalogRecipe[]);
    expect(tableRecipes(START, 'lunch', omnivore)).toEqual([]); // greedy
    expect(tableRecipes('2026-02-30', 'lunch', ctx)).toEqual([]);
  });

  it('checkPlans flags a day that misses the band although one rule-keeping swap would reach it', () => {
    const catalog = CATALOGS['expanded catalog (180)'] as CatalogRecipe[];
    const profile = makeProfile({ kcalTarget: 3250, proteinTarget: 110, snacksPerDay: 0 });
    const plans = planRange(START, 30, ctxFor(profile, catalog));
    // Spoil day 15: its dinner becomes the lightest eligible dinner not used nearby, at the portion it had.
    const i = 15;
    const day = plans[i] as DayPlan;
    const near = new Set(plans.slice(i - 6, i + 7).flatMap((p) => p.meals.filter((m) => m.slot === 'dinner').map((m) => m.recipeId)));
    const light = catalog
      .filter((r) => isEligible(r, profile, 'dinner') && !near.has(r.id) && !day.meals.some((m) => m.recipeId === r.id))
      .sort((a, b) => a.perServing.kcal - b.perServing.kcal)[0] as CatalogRecipe;
    const byId = new Map(catalog.map((r) => [r.id, r]));
    const meals = day.meals.map((m) => (m.slot === 'dinner' ? { ...m, recipeId: light.id, portion: 0.5 } : m));
    const totals = meals.reduce((t, m) => ({ ...t, kcal: t.kcal + (byId.get(m.recipeId)?.perServing.kcal ?? 0) * m.portion, protein: t.protein + (byId.get(m.recipeId)?.perServing.protein ?? 0) * m.portion }), { ...day.totals, kcal: 0, protein: 0 });
    const spoiled = plans.map((p, j) => (j === i ? { ...p, meals, totals } : p));
    const report = checkPlans(spoiled, profile, catalog);
    expect(report.errors.some((e) => e.startsWith(`${day.date}: kcal`))).toBe(true);
    expect(findRuleKeepingSwap(spoiled, i, profile, catalog, 'kcal')).not.toBeNull();
    // Days without 6 planned days on both sides are not swap-checked.
    expect(findRuleKeepingSwap(spoiled, 3, profile, catalog, 'kcal')).toBeNull();
  });

  it('makes up a light meal later in the day', () => {
    // Breakfasts are all light (rotation: 8 recipes of ~250 kcal); lunch and dinner are greedy with a wide kcal
    // spread. A 2800 kcal day without snacks needs the mains to carry the difference.
    const breakfasts = Array.from({ length: 8 }, (_, i) => syntheticRecipe(`light-breakfast-${i}`, ['breakfast'], 240 + i * 5));
    const cuisines = ['kurdish', 'iraqi', 'levantine', 'turkish', 'persian', 'western'] as const;
    const mains = Array.from({ length: 60 }, (_, i) => syntheticRecipe(`main-${i}`, ['lunch', 'dinner'], 300 + (i % 12) * 40, cuisines[i % 6]));
    const catalog = [...breakfasts, ...mains];
    const profile = makeProfile({ kcalTarget: 2800, proteinTarget: 60, snacksPerDay: 0 });
    const report = checkPlans(planRange(START, DAYS, ctxFor(profile, catalog)), profile, catalog);
    expect(report.errors).toEqual([]);
    expect(report.kcalInBand).toBe(DAYS);
  });

  it('gives omnivores legume mains several times a week and varies cuisines', () => {
    for (const catalog of Object.values(CATALOGS)) {
      const plans = planRange(START, DAYS, ctxFor(PROFILES['omnivore 2000 kcal, 1 snack'] as Profile, catalog));
      const byId = new Map(catalog.map((r) => [r.id, r]));
      const legumes = plans.map((p) => p.meals.filter((m) => (m.slot === 'lunch' || m.slot === 'dinner') && proteinSource(byId.get(m.recipeId) as CatalogRecipe, FIXTURE_INDEX) === 'legume').length);
      for (let i = 0; i + 7 <= legumes.length; i++) expect(legumes.slice(i, i + 7).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(2);
      for (const slot of ['lunch', 'dinner'] as const) {
        const cuisine = slotRecipes(plans, slot).map((x) => byId.get(x[0] as string)?.cuisine);
        for (let i = 2; i < cuisine.length; i++) expect(cuisine[i] === cuisine[i - 1] && cuisine[i] === cuisine[i - 2]).toBe(false);
      }
      for (const p of plans) {
        const [l, d] = (['lunch', 'dinner'] as const).map((s) => byId.get(p.meals.find((m) => m.slot === s)?.recipeId as string));
        expect(l?.cuisine).not.toBe(d?.cuisine);
      }
    }
  });

  it('gives favorites a mild preference without breaking the rules', () => {
    for (const catalog of Object.values(CATALOGS)) {
      const profile = PROFILES['omnivore 2000 kcal, 1 snack'] as Profile;
      const favorites = catalog.filter((r) => r.slots.includes('dinner')).slice(0, 5).map((r) => r.id);
      const count = (plans: DayPlan[]) => plans.reduce((a, p) => a + p.meals.filter((m) => favorites.includes(m.recipeId)).length, 0);
      const without = planRange(START, DAYS, ctxFor(profile, catalog));
      const withFavs = planRange(START, DAYS, ctxFor(profile, catalog, { favorites }));
      expect(count(withFavs)).toBeGreaterThan(count(without));
      expect(checkPlans(withFavs, profile, catalog).errors).toEqual([]);
    }
  });
});

describe('small pools', () => {
  it('keep the widest spacing a pool allows, across epoch seams, for one or two meals a day (regression)', () => {
    // Snack-only recipes, all 180 kcal like every other meal, so kcal plays no part: only spacing decides.
    const mains = (['breakfast', 'lunch', 'dinner'] as const).flatMap((slot) => Array.from({ length: 20 }, (_, i) => syntheticRecipe(`${slot}-${i}`, [slot], 180)));
    for (const [snacksPerDay, sizes] of [[2, [7, 8, 9, 10, 11, 12, 13]], [1, [2, 3, 4, 5, 6]]] as const) {
      for (const n of sizes) {
        const catalog = [...mains, ...Array.from({ length: n }, (_, i) => syntheticRecipe(`s${i}`, ['snack'], 180))];
        for (const kcalTarget of [1800, 2200]) {
          const profile = makeProfile({ snacksPerDay, kcalTarget });
          const plans = planRange(START, 365, ctxFor(profile, catalog));
          const lastSeen = new Map<string, number>();
          let minGap = Infinity;
          slotRecipes(plans, 'snack').forEach((ids, day) => {
            for (const id of ids) {
              const prev = lastSeen.get(id);
              if (prev !== undefined) minGap = Math.min(minGap, day - prev);
              lastSeen.set(id, day);
            }
          });
          expect(minGap, `${snacksPerDay} snacks, n = ${n}, ${kcalTarget} kcal`).toBeGreaterThanOrEqual(Math.floor(n / snacksPerDay));
          if (kcalTarget === 1800) expect(checkPlans(plans, profile, catalog).errors).toEqual([]);
        }
      }
    }
  });
});

describe('stability', () => {
  const catalog = CATALOGS['expanded catalog (180)'] as CatalogRecipe[];
  const changed = (a: DayPlan[], b: DayPlan[]) =>
    a.reduce((n, day, i) => n + day.meals.filter((m) => b[i]?.meals.find((x) => x.slot === m.slot && x.index === m.index)?.recipeId !== m.recipeId).length, 0);

  it('keeps most meals when a target moves a little: the seed ignores the targets (regression)', () => {
    const base = planRange(START, 14, ctxFor(makeProfile(), catalog));
    const meals = base.reduce((n, d) => n + d.meals.length, 0);
    for (const patch of [{ proteinTarget: 95 }, { kcalTarget: 2050 }, { kcalTarget: 1950 }] as Partial<Profile>[]) {
      const moved = planRange(START, 14, ctxFor(makeProfile(patch), catalog));
      expect(changed(base, moved), JSON.stringify(patch)).toBeLessThanOrEqual(meals / 4);
    }
    // Rotation tables stay put.
    const pools = (kcalTarget: number) => describePools(ctxFor(makeProfile({ kcalTarget }), FIXTURE_CATALOG));
    expect(pools(2050)).toEqual(pools(2000));
  });

  it('plans an out-of-range target at the nearest limit, never at the default (regression)', () => {
    const p = makeProfile();
    expect(profileKey({ ...p, kcalTarget: 6600 })).toBe(profileKey({ ...p, kcalTarget: 6000 }));
    expect(profileKey({ ...p, kcalTarget: 6600 })).not.toBe(profileKey(p));
    expect(profileKey({ ...p, proteinTarget: 415 })).toBe(profileKey({ ...p, proteinTarget: 400 }));
    expect(profileKey({ ...p, kcalTarget: 500 })).toBe(profileKey({ ...p, kcalTarget: 800 }));
    const date = '2026-11-20';
    const over = planDay(date, ctxFor({ ...p, kcalTarget: 6600, snacksPerDay: 2 }, catalog));
    expect(over).toEqual(planDay(date, ctxFor({ ...p, kcalTarget: 6000, snacksPerDay: 2 }, catalog)));
    expect(over.totals.kcal).toBeGreaterThan(planDay(date, ctxFor({ ...p, snacksPerDay: 2 }, catalog)).totals.kcal * 1.5);
    const protein = (proteinTarget: number) => planRange(START, 14, ctxFor({ ...p, proteinTarget }, catalog)).reduce((a, d) => a + d.totals.protein, 0);
    expect(protein(415)).toBeGreaterThanOrEqual(protein(150));
  });
});

describe('stability of the plan', () => {
  const catalog = CATALOGS['expanded catalog (180)'] as CatalogRecipe[];
  const profile = makeProfile();
  const base = planRange(START, 28, ctxFor(profile, catalog));
  const meals = base.reduce((n, d) => n + d.meals.length, 0);
  const changed = (a: DayPlan[], b: DayPlan[]) =>
    a.reduce((n, day, i) => n + day.meals.filter((m) => b[i]?.meals.find((x) => x.slot === m.slot && x.index === m.index)?.recipeId !== m.recipeId).length, 0);

  it('changes nothing when a setting leaves every pool alone (regression)', () => {
    // The seed used to hash the settings, so excluding an allergen no recipe has reshuffled nearly every meal.
    const absent = ALLERGENS.filter((a) => !catalog.some((r) => r.allergens.includes(a)));
    expect(absent.length).toBeGreaterThan(0);
    const longest = Math.max(...catalog.map((r) => r.totalMinutes));
    for (const patch of [{ excludeAllergens: absent }, { dislikedIngredients: ['no-such-ingredient'] }, { maxTotalMinutes: longest }] as Partial<Profile>[]) {
      expect(planRange(START, 28, ctxFor({ ...profile, ...patch }, fresh(catalog))), JSON.stringify(patch)).toEqual(base);
    }
  });

  it('moves few meals when a recipe it had not planned leaves the pool (regression)', () => {
    const planned = new Set(base.flatMap((d) => d.meals.map((m) => m.recipeId)));
    const unplanned = catalog.filter((r) => !planned.has(r.id)).slice(0, 6);
    let total = 0;
    for (const r of unplanned) {
      const moved = changed(base, planRange(START, 28, ctxFor(profile, catalog.filter((x) => x.id !== r.id))));
      expect(moved, r.id).toBeLessThanOrEqual(meals / 3);
      total += moved;
    }
    expect(total / unplanned.length).toBeLessThanOrEqual(meals / 6);
  });

  it('never changes a day, or the days before it in its block, by favoriting its meals (regression)', () => {
    // Favoriting a meal used to reorder tables and queues, so the hearted meals left their day and past days changed.
    // Now a favorite only comes back sooner once a block's middle part has served it: the days of a block before
    // that service, and every tail, stay as they were.
    const long = planRange(START, 90, ctxFor(profile, catalog));
    const blockDay = (p: DayPlan) => dayNumber(p.date) % EPOCH_DAYS;
    let checked = 0;
    for (let d = 28; d < 90; d += 5) {
      const day = long[d] as DayPlan;
      const hearts = day.meals.filter((m) => m.slot === 'lunch' || m.slot === 'dinner').map((m) => m.recipeId);
      // Only recipes not served in the 28 days before: otherwise the earlier service is where the change starts.
      if (long.slice(d - 28, d).some((p) => p.meals.some((m) => hearts.includes(m.recipeId)))) continue;
      checked++;
      const withFavs = planRange(START, d + 1, ctxFor(profile, fresh(catalog), { favorites: hearts }));
      const from = d - blockDay(day);
      expect(withFavs.slice(from), day.date).toEqual(long.slice(from, d + 1));
      for (const [i, p] of withFavs.entries()) if (blockDay(p) >= EPOCH_DAYS - TAIL_DAYS) expect(p, p.date).toEqual(long[i]);
    }
    expect(checked).toBeGreaterThanOrEqual(4);
  });
});

describe('health: sodium and red meat', () => {
  const cuisines = ['kurdish', 'iraqi', 'levantine', 'turkish', 'persian', 'western'] as const;
  const withSodium = (r: CatalogRecipe, sodium: number): CatalogRecipe => ({ ...r, perServing: { ...r.perServing, sodium } });

  it('keeps days within the sodium budget by choosing less salty recipes, and still serves the salty ones (fixtures)', () => {
    // Half of every slot is salty: without a sodium budget, days averaged 2,040 mg and reached 3,250 mg.
    const catalog: CatalogRecipe[] = [
      ...Array.from({ length: 40 }, (_, i) => withSodium(syntheticRecipe(`main-${i}`, ['lunch', 'dinner'], 500 + (i % 8) * 25, cuisines[i % 6]), i % 2 ? 1000 : 250)),
      ...Array.from({ length: 20 }, (_, i) => withSodium(syntheticRecipe(`bf-${i}`, ['breakfast'], 420 + (i % 5) * 20, cuisines[i % 6]), i % 2 ? 700 : 150)),
      ...Array.from({ length: 20 }, (_, i) => withSodium(syntheticRecipe(`sn-${i}`, ['snack'], 180 + (i % 4) * 15, cuisines[i % 6]), i % 2 ? 300 : 40)),
    ];
    const profile = makeProfile();
    const plans = planRange(START, DAYS, ctxFor(profile, catalog));
    const report = checkPlans(plans, profile, catalog);
    expect(report.errors).toEqual([]);
    expect(report.kcalInBand).toBe(DAYS);
    const sodium = plans.map((p) => p.totals.sodium);
    expect(sodium.reduce((a, b) => a + b, 0) / DAYS).toBeLessThanOrEqual(SODIUM_BUDGET * 0.9);
    expect(Math.max(...sodium)).toBeLessThanOrEqual(SODIUM_BUDGET * 1.1);
    // The cap on the sodium score lets a salty recipe that has waited long enough take its turn.
    const used = new Set(plans.flatMap((p) => p.meals.map((m) => m.recipeId)));
    const salty = catalog.filter((r) => r.perServing.sodium >= 300);
    expect(salty.filter((r) => used.has(r.id)).length).toBeGreaterThanOrEqual(salty.length * 0.75);
  });

  it('ranks a salty swap below an equally good one when the day is already salty', () => {
    const catalog = [
      ...Array.from({ length: 30 }, (_, i) => withSodium(syntheticRecipe(`main-${i}`, ['lunch', 'dinner'], 520 + (i % 6) * 20, cuisines[i % 6]), 900)),
      ...Array.from({ length: 20 }, (_, i) => withSodium(syntheticRecipe(`bf-${i}`, ['breakfast'], 450 + (i % 5) * 20, cuisines[i % 6]), 600)),
      ...Array.from({ length: 20 }, (_, i) => withSodium(syntheticRecipe(`sn-${i}`, ['snack'], 190 + (i % 4) * 10, cuisines[i % 6]), 200)),
      withSodium(syntheticRecipe('twin-low', ['dinner'], 600, 'gulf'), 150),
      withSodium(syntheticRecipe('twin-salty', ['dinner'], 600, 'gulf'), 1400),
    ];
    const ctx = ctxFor(makeProfile(), catalog);
    const list = swapCandidates('2026-11-20', 'dinner', 0, ctx, 100);
    const low = list.find((c) => c.recipe.id === 'twin-low');
    const salty = list.find((c) => c.recipe.id === 'twin-salty');
    expect(low && salty).toBeTruthy();
    expect(low?.portion).toBe(salty?.portion);
    expect((low?.score ?? 0) - (salty?.score ?? 0)).toBeGreaterThan(0.5);
  });

  it('lands weight-loss days at or under the target more often, with the same recipes', () => {
    const catalog = CATALOGS['expanded catalog (180)'] as CatalogRecipe[];
    const profile = makeProfile({ kcalTarget: 1800, proteinTarget: 100 });
    const lose = { ...profile, body: { sex: 'female', age: 35, heightCm: 165, weightKg: 80, activity: 'light', goal: 'lose' } } as const;
    const plain = planRange(START, 60, ctxFor(profile, catalog));
    const losing = planRange(START, 60, ctxFor(lose, catalog));
    // Portions only: the recipes stay the same.
    expect(losing.map((d) => d.meals.map((m) => m.recipeId))).toEqual(plain.map((d) => d.meals.map((m) => m.recipeId)));
    const excess = (plans: DayPlan[]) => plans.reduce((a, d) => a + Math.max(0, d.totals.kcal - 1800), 0);
    expect(excess(losing)).toBeLessThan(excess(plain));
    expect(checkPlans(losing, lose, catalog).errors).toEqual([]);
  });

  it('holds red meat near the weekly limit and never scales a red-meat main past 1.25 once protein is met (fixtures)', () => {
    // Half the mains are lamb (150 g raw a serving): without the limit a week had about 1.1 kg raw.
    const lambMain = (id: string, kcal: number, cuisine: (typeof cuisines)[number]) =>
      syntheticRecipe(id, ['lunch', 'dinner'], kcal, cuisine, {
        ingredients: [
          { ingredientId: 'lamb-lean-raw', grams: 150, qty: 150, unit: 'g' },
          { ingredientId: 'lentils-red-dry', grams: (kcal - 280) / 3.58, qty: 1, unit: 'g' },
          { ingredientId: 'onion', grams: 55, qty: 0.5, unit: 'medium' },
          { ingredientId: 'olive-oil', grams: 2, qty: 2, unit: 'g' },
        ],
      });
    const catalog: CatalogRecipe[] = [
      ...Array.from({ length: 40 }, (_, i) => (i % 2 ? lambMain(`m-${i}`, 550 + (i % 6) * 20, cuisines[i % 6] as (typeof cuisines)[number]) : syntheticRecipe(`m-${i}`, ['lunch', 'dinner'], 550 + (i % 6) * 20, cuisines[i % 6]))),
      ...Array.from({ length: 20 }, (_, i) => syntheticRecipe(`b-${i}`, ['breakfast'], 450 + (i % 5) * 20, cuisines[i % 6])),
      ...Array.from({ length: 20 }, (_, i) => syntheticRecipe(`s-${i}`, ['snack'], 190 + (i % 4) * 10, cuisines[i % 6])),
    ];
    const lamb = new Set(catalog.filter((r) => r.ingredients.some((x) => x.ingredientId === 'lamb-lean-raw')).map((r) => r.id));
    expect(lamb.size).toBe(20);
    const profile = makeProfile();
    const plans = planRange(START, DAYS, ctxFor(profile, catalog));
    expect(checkPlans(plans, profile, catalog).errors).toEqual([]);
    const grams = plans.map((p) => p.meals.reduce((a, m) => a + (lamb.has(m.recipeId) ? 150 * m.portion : 0), 0));
    const weeks = grams.slice(6).map((_, i) => grams.slice(i, i + 7).reduce((a, b) => a + b, 0));
    expect(weeks.reduce((a, b) => a + b, 0) / weeks.length).toBeLessThanOrEqual(RED_MEAT_WEEK_G * 1.35);
    expect(Math.max(...weeks)).toBeLessThanOrEqual(1000);
    for (const p of plans) for (const m of p.meals) if (lamb.has(m.recipeId) && p.totals.protein >= profile.proteinTarget * 0.9) expect(m.portion).toBeLessThanOrEqual(1.25);
  });
});

describe('overrides', () => {
  const profile = PROFILES['omnivore 2000 kcal, 1 snack'] as Profile;
  const date = '2026-11-20';
  const base = planDay(date, ctxFor(profile, FIXTURE_CATALOG));
  const lunch = base.meals.find((m) => m.slot === 'lunch');
  const replacement = FIXTURE_CATALOG.find((r) => r.slots.includes('lunch') && !base.meals.some((m) => m.recipeId === r.id)) as CatalogRecipe;

  it('replaces the meal for its date, slot and index and leaves the others as generated', () => {
    const o: MealOverride = { date, slot: 'lunch', index: 0, recipeId: replacement.id, portion: 1.5 };
    const plan = planDay(date, ctxFor(profile, FIXTURE_CATALOG, { overrides: [o] }));
    expect(plan.meals.find((m) => m.slot === 'lunch')).toEqual({ slot: 'lunch', index: 0, recipeId: replacement.id, portion: 1.5 });
    expect(plan.meals.filter((m) => m.slot !== 'lunch')).toEqual(base.meals.filter((m) => m.slot !== 'lunch'));
    const expectedKcal = base.totals.kcal - (FIXTURE_BY_ID.get(lunch?.recipeId as string)?.perServing.kcal ?? 0) * (lunch?.portion ?? 0) + replacement.perServing.kcal * 1.5;
    expect(plan.totals.kcal).toBeCloseTo(expectedKcal, 6);
    // Other dates are untouched.
    expect(planDay(addDays(date, 1), ctxFor(profile, FIXTURE_CATALOG, { overrides: [o] }))).toEqual(planDay(addDays(date, 1), ctxFor(profile, FIXTURE_CATALOG)));
  });

  it('adds meals, snaps portions, lets the last override win and ignores bad ones', () => {
    const overrides: MealOverride[] = [
      { date, slot: 'snack', index: 1, recipeId: 'apple-walnuts', portion: 1.1 },
      { date, slot: 'lunch', index: 0, recipeId: replacement.id, portion: 1 },
      { date, slot: 'lunch', index: 0, recipeId: 'mujaddara', portion: 0.75 },
      { date, slot: 'dinner', index: 0, recipeId: 'no-such-recipe', portion: 1 },
      { date, slot: 'brunch' as MealSlot, index: 0, recipeId: 'shakshuka', portion: 1 },
      { date, slot: 'breakfast', index: 9, recipeId: 'shakshuka', portion: 1 },
      { date, slot: 'breakfast', index: -1, recipeId: 'shakshuka', portion: 1 },
    ];
    const plan = planDay(date, ctxFor(profile, FIXTURE_CATALOG, { overrides }));
    expect(plan.meals.map((m) => `${m.slot}#${m.index}`)).toEqual(['breakfast#0', 'lunch#0', 'dinner#0', 'snack#0', 'snack#1']);
    expect(plan.meals.find((m) => m.slot === 'snack' && m.index === 1)).toEqual({ slot: 'snack', index: 1, recipeId: 'apple-walnuts', portion: 1 });
    expect(plan.meals.find((m) => m.slot === 'lunch')?.recipeId).toBe('mujaddara');
    expect(plan.meals.find((m) => m.slot === 'dinner')).toEqual(base.meals.find((m) => m.slot === 'dinner'));
    expect(plan.meals.find((m) => m.slot === 'breakfast')).toEqual(base.meals.find((m) => m.slot === 'breakfast'));
  });

  it('fills an unfilled meal', () => {
    const tiny = PROFILES['tiny pool'] as Profile;
    const before = planDay(date, ctxFor(tiny, FIXTURE_CATALOG));
    expect(before.unfilled).toEqual([
      { slot: 'lunch', index: 0 },
      { slot: 'dinner', index: 0 },
    ]);
    expect(nextFreeIndex(before, 'lunch')).toBe(0);
    const after = planDay(date, ctxFor(tiny, FIXTURE_CATALOG, { overrides: [{ date, slot: 'lunch', index: 0, recipeId: 'red-lentil-soup', portion: 1 }] }));
    expect(after.unfilled).toEqual([{ slot: 'dinner', index: 0 }]);
    expect(after.meals.map((m) => m.slot)).toEqual(['breakfast', 'lunch', 'snack']);
    expect(after.totals.kcal).toBeCloseTo(before.totals.kcal + (FIXTURE_BY_ID.get('red-lentil-soup')?.perServing.kcal ?? 0), 6);
  });

  it('finds the next free index for "add to day"', () => {
    expect(nextFreeIndex(base, 'snack')).toBe(1);
    expect(nextFreeIndex(base, 'breakfast')).toBe(1);
    const full: DayPlan = { ...base, meals: [0, 1, 2, 3, 4].map((index) => ({ slot: 'snack' as const, index, recipeId: 'apple-walnuts', portion: 1 })) };
    expect(nextFreeIndex(full, 'snack')).toBeNull();
  });
});

describe('swapCandidates', () => {
  const profile = PROFILES['omnivore 2000 kcal, 1 snack'] as Profile;
  const catalog = CATALOGS['expanded catalog (180)'] as CatalogRecipe[];
  const date = '2026-11-20';

  it('returns eligible alternatives, never a recipe already on the day, best first', () => {
    const ctx = ctxFor(profile, catalog);
    const plan = planDay(date, ctx);
    for (const slot of ['breakfast', 'lunch', 'dinner', 'snack'] as const) {
      const list = swapCandidates(date, slot, 0, ctx, 10);
      expect(list).toHaveLength(10);
      for (const c of list) {
        expect(plan.meals.some((m) => m.recipeId === c.recipe.id)).toBe(false);
        expect(isEligible(c.recipe, profile, slot)).toBe(true);
        expect(PORTIONS).toContain(c.portion);
        expect(c.kcal).toBeCloseTo(c.recipe.perServing.kcal * c.portion, 6);
      }
      for (let i = 1; i < list.length; i++) expect((list[i - 1] as { score: number }).score).toBeGreaterThanOrEqual((list[i] as { score: number }).score);
    }
    expect(swapCandidates(date, 'lunch', 0, ctx, 3)).toHaveLength(3);
    expect(swapCandidates('2026-02-30', 'lunch', 0, ctx)).toEqual([]);
    expect(swapCandidates(date, 'lunch', 0, ctx, 0)).toEqual([]);
  });

  it('ranks by fit to the meal budget, then by variety', () => {
    const snackProfile = makeProfile({ kcalTarget: 2000, snacksPerDay: 1 });
    const mains = ['breakfast', 'lunch', 'dinner'].flatMap((slot, i) =>
      Array.from({ length: 20 }, (_, j) => syntheticRecipe(`${slot}-${j}`, [slot as MealSlot], 450 + i * 60 + j * 3, (['kurdish', 'iraqi', 'turkish'] as const)[j % 3])),
    );
    // Snack budget is ~200 kcal after the day's other meals. Only the 200 kcal snacks can fit it with a portion.
    const snacks = [
      syntheticRecipe('snack-fit-a', ['snack'], 200),
      syntheticRecipe('snack-fit-b', ['snack'], 205),
      syntheticRecipe('snack-too-big', ['snack'], 1400),
      syntheticRecipe('snack-too-small', ['snack'], 40),
      ...Array.from({ length: 16 }, (_, j) => syntheticRecipe(`snack-${j}`, ['snack'], 180 + j * 4)),
    ];
    const ctx = ctxFor(snackProfile, [...mains, ...snacks]);
    const list = swapCandidates(date, 'snack', 0, ctx, 30);
    const rank = (id: string) => list.findIndex((c) => c.recipe.id === id);
    expect(rank('snack-too-big')).toBeGreaterThan(rank('snack-fit-a'));
    expect(rank('snack-too-small')).toBeGreaterThan(rank('snack-fit-b'));
    expect(list.slice(-2).map((c) => c.recipe.id).sort()).toEqual(['snack-too-big', 'snack-too-small']);
    expect(list.find((c) => c.recipe.id === 'snack-too-big')?.portion).toBe(0.5);
    // Variety: what this slot serves in the days around ranks below equally good alternatives.
    const around = new Set<string>();
    for (let d = -3; d <= 3; d++) if (d) planDay(addDays(date, d), ctx).meals.filter((m) => m.slot === 'snack').forEach((m) => around.add(m.recipeId));
    const top = list.slice(0, 3).map((c) => c.recipe.id);
    for (const id of top) expect(around.has(id), id).toBe(false);
  });

  it('uses the best portion for what the rest of the day leaves', () => {
    const ctx = ctxFor(profile, catalog);
    const plan = planDay(date, ctx);
    const others = plan.meals.filter((m) => m.slot !== 'dinner').reduce((a, m) => a + (catalog.find((r) => r.id === m.recipeId)?.perServing.kcal ?? 0) * m.portion, 0);
    const share = slotEnergySplit(1)[2]?.share ?? 0;
    const budget = Math.min(Math.max(2000 - others, 2000 * share * 0.6), 2000 * share * 1.6);
    for (const c of swapCandidates(date, 'dinner', 0, ctx)) expect(c.portion).toBe(bestPortion(c.recipe.perServing.kcal, budget));
  });

  it('respects the profile filters', () => {
    const vegan = PROFILES['vegan 1600 kcal, 2 snacks'] as Profile;
    for (const c of swapCandidates(date, 'lunch', 0, ctxFor(vegan, FIXTURE_CATALOG), 50)) expect(c.recipe.flags.vegan).toBe(true);
    expect(swapCandidates(date, 'lunch', 0, ctxFor(PROFILES['empty pool'] as Profile, FIXTURE_CATALOG))).toEqual([]);
  });
});

describe('purity', () => {
  it('never calls Math.random or Date.now while planning', () => {
    const random = vi.spyOn(Math, 'random');
    const now = vi.spyOn(Date, 'now');
    try {
      const catalog = expandedCatalog(3);
      for (const profile of Object.values(PROFILES)) {
        planRange('2027-03-01', 40, ctxFor(profile, catalog, { favorites: ['shakshuka'] }));
        swapCandidates('2027-03-05', 'lunch', 0, ctxFor(profile, catalog));
        describePools(ctxFor(profile, catalog));
      }
      expect(random).not.toHaveBeenCalled();
      expect(now).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
      now.mockRestore();
    }
  });
});

describe('robustness', () => {
  it('never throws on empty, tiny or odd input', () => {
    const empty = planDay('2026-11-20', ctxFor(makeProfile(), []));
    expect(empty.meals).toEqual([]);
    expect(empty.unfilled).toHaveLength(4);
    expect(empty.totals.kcal).toBe(0);

    const one = [syntheticRecipe('only', ['breakfast', 'lunch', 'dinner', 'snack'], 400)];
    const plans = planRange('2026-11-20', 10, ctxFor(makeProfile({ snacksPerDay: 2 }), one));
    for (const p of plans) {
      expect(p.meals).toHaveLength(1);
      expect(p.unfilled).toHaveLength(4);
    }

    const odd = { ...makeProfile(), snacksPerDay: 7, diet: 'carnivore', kcalTarget: Number.NaN, proteinTarget: -3, excludeAllergens: undefined } as unknown as Profile;
    expect(() => planRange('2026-11-20', 7, ctxFor(odd, FIXTURE_CATALOG))).not.toThrow();
    expect(planDay('2026-11-20', ctxFor(odd, FIXTURE_CATALOG)).meals.length).toBeGreaterThan(0);

    const broken = [{ ...(FIXTURE_CATALOG[0] as CatalogRecipe), id: 'broken', perServing: undefined }] as unknown as CatalogRecipe[];
    expect(() => planRange('2026-11-20', 7, ctxFor(makeProfile(), broken))).not.toThrow();

    expect(planDay('not a date', ctxFor(makeProfile(), FIXTURE_CATALOG)).unfilled).toHaveLength(4);
    expect(planRange('2026-02-30', 7, ctxFor(makeProfile(), FIXTURE_CATALOG))).toEqual([]);
    expect(planRange('2026-11-20', 0, ctxFor(makeProfile(), FIXTURE_CATALOG))).toEqual([]);
    expect(planRange('2026-11-20', -3, ctxFor(makeProfile(), FIXTURE_CATALOG))).toEqual([]);
  });

  it('keys the plan on eligibility and target fields, and a weight-loss goal, only', () => {
    const p = makeProfile();
    const body = { sex: 'male', age: 30, heightCm: 180, weightKg: 80, activity: 'active', goal: 'gain' } as const;
    expect(profileKey({ ...p, householdSize: 4, weekStart: 'monday' })).toBe(profileKey(p));
    expect(profileKey({ ...p, body })).toBe(profileKey(p));
    expect(profileKey({ ...p, body: { ...body, goal: 'maintain' } })).toBe(profileKey(p));
    // Losing weight moves portions (at or under the target), so it is part of the key; other body stats are not.
    expect(profileKey({ ...p, body: { ...body, goal: 'lose' } })).not.toBe(profileKey(p));
    expect(profileKey({ ...p, body: { ...body, goal: 'lose', weightKg: 95 } })).toBe(profileKey({ ...p, body: { ...body, goal: 'lose' } }));
    expect(profileKey({ ...p, excludeAllergens: ['egg', 'dairy'] })).toBe(profileKey({ ...p, excludeAllergens: ['dairy', 'egg'] }));
    for (const patch of [{ diet: 'vegan' }, { kcalTarget: 2100 }, { proteinTarget: 100 }, { snacksPerDay: 2 }, { maxTotalMinutes: 30 }, { dislikedIngredients: ['onion'] }] as Partial<Profile>[]) {
      expect(profileKey({ ...p, ...patch })).not.toBe(profileKey(p));
    }
  });
});

describe('performance', () => {
  it('plans 7 days over 150 recipes well under 20 ms, cold', () => {
    const base = expandedCatalog(4).slice(0, 150);
    // Warm up the JIT on a different catalog so the measurement is of the planner, not the compiler.
    planRange('2026-01-01', 28, ctxFor(makeProfile(), expandedCatalog(3)));
    const times: number[] = [];
    for (const [i, profile] of MAIN_PROFILES.map((n) => PROFILES[n] as Profile).entries()) {
      const catalog = base.slice(); // cold cache
      const t0 = performance.now();
      planRange(addDays('2026-11-14', i * 11), 7, ctxFor(profile, catalog));
      times.push(performance.now() - t0);
    }
    expect(Math.max(...times)).toBeLessThan(20);
  });
});
