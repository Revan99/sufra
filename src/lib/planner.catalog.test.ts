// The planner properties again, on the real recipe library. The library is written separately; until it has
// 100 recipes the properties are skipped, loudly: a warning names the count, and with SUFRA_REQUIRE_CATALOG=1 (CI,
// release) the gate fails instead. A data module that throws on import fails this file: it is never a silent skip.
import { describe, expect, it } from 'vitest';
import type { CatalogRecipe, DayPlan, Profile } from '../types.ts';
import { ALLERGENS } from '../types.ts';
import { addDays, dateRange, dayNumber } from './dates.ts';
import { isEligible } from './filters.ts';
import type { IngredientIndex } from './nutrition.ts';
import { EPOCH_DAYS, RED_MEAT_WEEK_G, SODIUM_BUDGET, describePools, planDay, planRange, swapCandidates, tableRecipes } from './planner.ts';
import { buildShoppingList } from './shopping.ts';
import { slotEnergySplit } from './targets.ts';
import { makeProfile } from './test-fixtures.ts';
import { checkPlans } from './test-plan-checks.ts';

const data = await import('../data/index.ts');
const CATALOG: readonly CatalogRecipe[] = data.CATALOG;
const catalogById: ReadonlyMap<string, CatalogRecipe> = data.catalogById;
const ingredientIndex: IngredientIndex = data.ingredientIndex;
const MIN_RECIPES = 100;
const READY = CATALOG.length >= MIN_RECIPES;
// Node's process.env, typed locally (the project has no @types/node).
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const REQUIRE_CATALOG = env.SUFRA_REQUIRE_CATALOG === '1';
const SKIP_NOTE = `SKIPPED: the library has ${CATALOG.length} of the ${MIN_RECIPES} recipes these properties need`;

const START = '2026-11-14';
const DAYS = 90;

const PROFILES: Record<string, Profile> = {
  'omnivore 2000 kcal, 1 snack': makeProfile(),
  'vegan 1600 kcal, 2 snacks': makeProfile({ diet: 'vegan', kcalTarget: 1600, proteinTarget: 70, snacksPerDay: 2 }),
  'vegetarian gluten-free 2400 kcal, no snacks': makeProfile({ diet: 'vegetarian', excludeAllergens: ['gluten'], kcalTarget: 2400, proteinTarget: 100, snacksPerDay: 0 }),
  'pescatarian dairy-free 1800 kcal, 1 snack': makeProfile({ diet: 'pescatarian', excludeAllergens: ['dairy'], kcalTarget: 1800, proteinTarget: 100 }),
  'omnivore 30 minutes, nut-free, 2 snacks': makeProfile({ maxTotalMinutes: 30, excludeAllergens: ['tree-nut', 'peanut'], snacksPerDay: 2, kcalTarget: 2300, proteinTarget: 120 }),
};

describe.skipIf(!READY)(`planner on the real catalog (${CATALOG.length} recipes)`, () => {
  describe.each(Object.entries(PROFILES))('%s', (_name, profile) => {
    const ctx = { profile, catalog: CATALOG, ingredientIndex };
    const plans = planRange(START, DAYS, ctx);
    const report = checkPlans(plans, profile, CATALOG, { scheduled: (date, slot) => tableRecipes(date, slot, ctx) });

    it('meets the hard rules on every day', () => {
      expect(report.errors).toEqual([]);
    });

    it('keeps 7 days between repeats when the pool allows, and spreads them otherwise', () => {
      for (const s of report.slots) {
        if (s.eligible >= 7 * s.mealsPerDay) expect(s.minGap, s.slot).toBeGreaterThanOrEqual(7);
        else if (s.eligible >= 2 * s.mealsPerDay) expect(s.minGap, s.slot).toBeGreaterThanOrEqual(2);
      }
    });

    it('lands the kcal target on nearly every day and protein whenever the recipes allow', () => {
      expect(report.kcalInBand / DAYS).toBeGreaterThanOrEqual(0.9);
      expect(report.proteinOk).toBeGreaterThanOrEqual(report.proteinAchievable);
    });

    it('is deterministic with a cold cache and in any order', () => {
      const again = dateRange(START, 21)
        .reverse()
        .map((d) => planDay(d, { ...ctx, catalog: CATALOG.slice() }))
        .reverse();
      expect(again).toEqual(plans.slice(0, 21));
    });

    it('offers swaps that fit the filters and are not already on the day', () => {
      const plan = plans[3];
      for (const lane of slotEnergySplit(profile.snacksPerDay)) {
        for (const c of swapCandidates(plan?.date as string, lane.slot, lane.index, ctx, 8)) {
          expect(isEligible(c.recipe, profile, lane.slot)).toBe(true);
          expect(plan?.meals.some((m) => m.recipeId === c.recipe.id)).toBe(false);
        }
      }
    });

    it('keeps sodium in check and red meat near the weekly limit', () => {
      // Before the daily sodium budget, the default profile averaged about 2,400 mg with most days over 2,300 mg,
      // and a week could hold over 1 kg of raw red meat.
      const sodium = plans.map((p) => p.totals.sodium);
      expect(sodium.filter((x) => x <= 2300).length / DAYS).toBeGreaterThanOrEqual(0.8);
      const redMeat = plans.map((p) =>
        p.meals.reduce((a, m) => {
          const r = catalogById.get(m.recipeId) as CatalogRecipe;
          return a + r.ingredients.reduce((g, ri) => g + (ingredientIndex.get(ri.ingredientId)?.animal === 'meat' ? (ri.grams * m.portion) / r.servings : 0), 0);
        }, 0),
      );
      for (let i = 0; i + 7 <= DAYS; i++) expect(redMeat.slice(i, i + 7).reduce((a, b) => a + b, 0), plans[i]?.date).toBeLessThanOrEqual(RED_MEAT_WEEK_G * 1.25);
      if (profile === PROFILES['omnivore 2000 kcal, 1 snack']) {
        expect(sodium.reduce((a, b) => a + b, 0) / DAYS).toBeLessThanOrEqual(SODIUM_BUDGET);
        expect(Math.max(...sodium)).toBeLessThanOrEqual(2300);
      }
    });

    it('builds a shopping list of known ingredients without water', () => {
      const list = buildShoppingList(plans.slice(0, 7), catalogById, ingredientIndex, 2);
      const items = [...list.groups.flatMap((g) => g.items), ...list.staples];
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(ingredientIndex.has(item.ingredientId)).toBe(true);
        expect(item.ingredientId).not.toBe('water');
        expect(item.grams).toBeGreaterThan(0);
      }
    });
  });

  it('keeps the plan when a setting changes no pool, and the days up to a favorited meal (stability)', () => {
    const profile = PROFILES['omnivore 2000 kcal, 1 snack'] as Profile;
    const ctx = { profile, catalog: CATALOG, ingredientIndex };
    const base = planRange(START, DAYS, ctx);
    const absent = ALLERGENS.filter((a) => !CATALOG.some((r) => r.allergens.includes(a)));
    const noop: Partial<Profile>[] = [{ dislikedIngredients: ['no-such-ingredient'] }, { maxTotalMinutes: Math.max(...CATALOG.map((r) => r.totalMinutes)) }];
    if (absent.length) noop.push({ excludeAllergens: absent });
    for (const patch of noop) expect(planRange(START, 56, { ...ctx, profile: { ...profile, ...patch } }), JSON.stringify(patch)).toEqual(base.slice(0, 56));
    let checked = 0;
    for (let d = 28; d < DAYS; d += 2) {
      const day = base[d] as DayPlan;
      const hearts = day.meals.filter((m) => m.slot === 'lunch' || m.slot === 'dinner').map((m) => m.recipeId);
      if (base.slice(d - 28, d).some((p) => p.meals.some((m) => hearts.includes(m.recipeId)))) continue;
      checked++;
      const from = d - (dayNumber(day.date) % EPOCH_DAYS);
      expect(planRange(START, d + 1, { ...ctx, favorites: hearts }).slice(from), day.date).toEqual(base.slice(from, d + 1));
    }
    expect(checked).toBeGreaterThanOrEqual(2);
  });

  it('describes its pools (diagnostics)', () => {
    for (const profile of Object.values(PROFILES)) {
      for (const info of describePools({ profile, catalog: CATALOG, ingredientIndex })) {
        expect(info.eligible).toBe(CATALOG.filter((r) => isEligible(r, profile, info.slot)).length);
      }
    }
  });

  it('plans 7 days well under 20 ms, cold', () => {
    planRange('2026-01-01', 28, { profile: makeProfile({ kcalTarget: 2100 }), catalog: CATALOG.slice(), ingredientIndex });
    for (const [i, profile] of Object.values(PROFILES).entries()) {
      const t0 = performance.now();
      planRange(addDays(START, i * 9), 7, { profile, catalog: CATALOG.slice(), ingredientIndex });
      expect(performance.now() - t0).toBeLessThan(20);
    }
  });
});

describe('real catalog gate', () => {
  it(`loads the library (an import error fails the run) and runs the properties above once it has 100 recipes${READY ? '' : ` (${SKIP_NOTE})`}`, () => {
    if (!READY) console.warn(`planner.catalog.test.ts: real-catalog planner properties ${SKIP_NOTE}.`);
    expect(Array.isArray(CATALOG)).toBe(true);
    expect(ingredientIndex).toBeInstanceOf(Map);
    expect(READY).toBe(CATALOG.length >= MIN_RECIPES);
  });

  it.runIf(REQUIRE_CATALOG)('SUFRA_REQUIRE_CATALOG=1: the library must be ready, not skipped', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(MIN_RECIPES);
  });
});
