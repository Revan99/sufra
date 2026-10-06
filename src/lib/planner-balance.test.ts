import { describe, expect, it } from 'vitest';
import { KCAL_TOLERANCE, PORTIONS, PROTEIN_FLOOR, SODIUM_BUDGET, balancePortions, bestPortion, exactTier, reachableTier, snapPortion } from './planner-balance.ts';
import type { BalanceItem } from './planner-balance.ts';
import { mulberry32 } from './random.ts';
import { bestReachable } from './test-plan-checks.ts';

describe('bestPortion and snapPortion', () => {
  it('picks the allowed portion closest to the budget', () => {
    expect(bestPortion(400, 400)).toBe(1);
    expect(bestPortion(400, 600)).toBe(1.5);
    expect(bestPortion(400, 690)).toBe(1.75);
    expect(bestPortion(400, 5000)).toBe(2);
    expect(bestPortion(400, 50)).toBe(0.5);
    expect(bestPortion(0, 500)).toBe(1);
    expect(bestPortion(400, 0)).toBe(1);
    expect(bestPortion(Number.NaN, 500)).toBe(1);
  });

  it('snaps any number to the allowed set', () => {
    expect(snapPortion(1.1)).toBe(1);
    expect(snapPortion(1.2)).toBe(1.25);
    expect(snapPortion(0.1)).toBe(0.5);
    expect(snapPortion(9)).toBe(2);
    expect(snapPortion(Number.NaN)).toBe(1);
    expect(snapPortion(Number.POSITIVE_INFINITY)).toBe(1);
    for (const p of PORTIONS) expect(snapPortion(p)).toBe(p);
  });
});

describe('balancePortions', () => {
  it('returns [] for no meals and allowed portions otherwise', () => {
    expect(balancePortions([], 2000, 90)).toEqual([]);
    const out = balancePortions([{ kcal: 500, protein: 30, budget: 600 }], 600, 30);
    expect(out).toHaveLength(1);
    expect(PORTIONS).toContain(out[0]);
  });

  it('keeps whole servings when they already fit', () => {
    const items: BalanceItem[] = [
      { kcal: 500, protein: 25, budget: 500 },
      { kcal: 700, protein: 35, budget: 700 },
      { kcal: 600, protein: 30, budget: 600 },
      { kcal: 200, protein: 10, budget: 200 },
    ];
    expect(balancePortions(items, 2000, 90)).toEqual([1, 1, 1, 1]);
  });

  it('trades energy toward protein when the day is short of it', () => {
    const items: BalanceItem[] = [
      { kcal: 400, protein: 8, budget: 500 }, // low-protein breakfast
      { kcal: 450, protein: 45, budget: 700 }, // lean main
      { kcal: 600, protein: 12, budget: 600 },
      { kcal: 200, protein: 3, budget: 200 },
    ];
    const p = balancePortions(items, 2000, 90);
    const kcal = items.reduce((a, it, i) => a + it.kcal * (p[i] as number), 0);
    const protein = items.reduce((a, it, i) => a + it.protein * (p[i] as number), 0);
    expect(Math.abs(kcal - 2000)).toBeLessThanOrEqual(200);
    expect(protein).toBeGreaterThanOrEqual(81);
    expect(p[1]).toBeGreaterThan(1);
  });

  it('lands kcal and protein whenever some portion choice can (random days vs brute force)', () => {
    const rng = mulberry32(2026);
    let reachableKcal = 0;
    let reachableBoth = 0;
    for (let trial = 0; trial < 400; trial++) {
      const n = 3 + Math.floor(rng() * 3);
      const T = 1200 + Math.round(rng() * 2000);
      const PT = 50 + Math.round(rng() * 120);
      const shares = n === 3 ? [0.3, 0.4, 0.3] : n === 4 ? [0.25, 0.35, 0.3, 0.1] : [0.22, 0.32, 0.28, 0.09, 0.09];
      const items: BalanceItem[] = shares.map((s) => {
        const kcal = s < 0.15 ? 80 + rng() * 270 : 250 + rng() * 550;
        return { kcal, protein: kcal * (0.01 + rng() * 0.09), budget: T * s };
      });
      const p = balancePortions(items, T, PT);
      for (const x of p) expect(PORTIONS).toContain(x);
      const kcal = items.reduce((a, it, i) => a + it.kcal * (p[i] as number), 0);
      const protein = items.reduce((a, it, i) => a + it.protein * (p[i] as number), 0);
      const inBand = Math.abs(kcal - T) <= T * KCAL_TOLERANCE + 1e-6;
      const reach = bestReachable(items, T, PT);
      // reachableTier may be optimistic, never pessimistic.
      const tier = reachableTier(items, T, PT);
      if (reach.kcal) expect(tier, `trial ${trial}`).toBeGreaterThanOrEqual(1);
      if (reach.both) expect(tier, `trial ${trial}`).toBe(2);
      if (reach.kcal) {
        reachableKcal++;
        expect(inBand, `trial ${trial}`).toBe(true);
      }
      if (reach.both) {
        reachableBoth++;
        expect(protein, `trial ${trial}`).toBeGreaterThanOrEqual(PT * PROTEIN_FLOOR - 1e-6);
      }
    }
    // The random days must actually exercise both guarantees.
    expect(reachableKcal).toBeGreaterThan(300);
    expect(reachableBoth).toBeGreaterThan(100);
  });

  it('reachableTier reports what portions could do', () => {
    const day = [
      { kcal: 500, protein: 20 },
      { kcal: 700, protein: 50 },
    ];
    expect(reachableTier(day, 1200, 60)).toBe(2);
    expect(reachableTier(day, 1200, 150)).toBe(1); // kcal yes, 90% of 150 g no
    expect(reachableTier(day, 4000, 60)).toBe(0); // 2400 kcal at most
    expect(reachableTier(day, 400, 10)).toBe(0); // 600 kcal at least
    expect(reachableTier(day, 1200, 0)).toBe(2);
    expect(reachableTier([], 2000, 90)).toBe(0);
  });

  it('exactTier matches brute force, and balancePortions reaches it', () => {
    const rng = mulberry32(77);
    const seen = [0, 0, 0];
    for (let trial = 0; trial < 500; trial++) {
      const n = 1 + Math.floor(rng() * 5);
      const T = 1200 + Math.round(rng() * 2400);
      const PT = rng() < 0.05 ? 0 : 40 + Math.round(rng() * 140);
      const items = Array.from({ length: n }, () => {
        const kcal = 80 + rng() * 700;
        return { kcal, protein: kcal * (0.01 + rng() * 0.1), budget: T / n };
      });
      const reach = bestReachable(items, T, PT);
      const brute = reach.both ? 2 : reach.kcal ? 1 : 0;
      const tier = exactTier(items, T, PT);
      expect(tier, `trial ${trial}`).toBe(brute);
      seen[tier] = (seen[tier] as number) + 1;
      const p = balancePortions(items, T, PT);
      const kcal = items.reduce((a, it, i) => a + it.kcal * (p[i] as number), 0);
      const protein = items.reduce((a, it, i) => a + it.protein * (p[i] as number), 0);
      const got = Math.abs(kcal - T) <= T * KCAL_TOLERANCE + 1e-6 ? (protein >= PT * PROTEIN_FLOOR - 1e-6 ? 2 : 1) : 0;
      expect(got, `trial ${trial}`).toBe(tier);
    }
    // All three tiers were exercised.
    for (const count of seen) expect(count).toBeGreaterThan(40);
    expect(exactTier([], 2000, 90)).toBe(0);
  });

  it('is fast enough to run for every planned day', () => {
    const rng = mulberry32(9);
    const days = Array.from({ length: 300 }, () =>
      [0.22, 0.32, 0.28, 0.09, 0.09].map((s) => ({ kcal: 100 + rng() * 700, protein: 3 + rng() * 45, budget: 2400 * s })),
    );
    const t0 = performance.now();
    for (const items of days) balancePortions(items, 2400, 140);
    expect((performance.now() - t0) / days.length).toBeLessThan(1);
  });
});

describe('balancePortions: a sensible day within the tier', () => {
  const sum = (items: readonly BalanceItem[], p: readonly number[], key: 'kcal' | 'protein' | 'sodium') =>
    items.reduce((a, it, i) => a + (it[key] ?? 0) * (p[i] as number), 0);
  const tierOf = (items: readonly BalanceItem[], p: readonly number[], T: number, PT: number) => {
    const inBand = Math.abs(sum(items, p, 'kcal') - T) <= T * KCAL_TOLERANCE + 1e-6;
    return inBand ? (sum(items, p, 'protein') >= PT * PROTEIN_FLOOR - 1e-6 ? 2 : 1) : 0;
  };

  it('never gives up the kcal band or the protein floor for sodium, shape, plate size, red meat, counts or a weight-loss goal (fuzz)', () => {
    const rng = mulberry32(4242);
    for (let trial = 0; trial < 400; trial++) {
      const T = 1200 + Math.round(rng() * 2400);
      const PT = 40 + Math.round(rng() * 140);
      const shares = [0.22, 0.32, 0.28, 0.09, 0.09].slice(0, 3 + Math.floor(rng() * 3));
      const items: BalanceItem[] = shares.map((s) => {
        const kcal = s < 0.15 ? 80 + rng() * 270 : 250 + rng() * 550;
        return {
          kcal,
          protein: kcal * (0.01 + rng() * 0.09),
          budget: T * s,
          sodium: rng() * 1400,
          redMeat: rng() < 0.3 ? 60 + rng() * 120 : 0,
          counts: rng() < 0.3 ? [1 + Math.floor(rng() * 3) * 0.5] : [],
        };
      });
      const p = balancePortions(items, T, PT, { lose: rng() < 0.5 });
      expect(tierOf(items, p, T, PT), `trial ${trial}`).toBe(exactTier(items, T, PT));
    }
  });

  it('keeps the day under the sodium budget when portions allow, by eating less of the salty meal', () => {
    const items: BalanceItem[] = [
      { kcal: 500, protein: 25, budget: 500, sodium: 300 },
      { kcal: 700, protein: 35, budget: 700, sodium: 1500 }, // salty main
      { kcal: 600, protein: 30, budget: 600, sodium: 300 },
      { kcal: 200, protein: 10, budget: 200, sodium: 100 },
    ];
    expect(balancePortions(items.map(({ sodium: _, ...it }) => it), 2000, 90)).toEqual([1, 1, 1, 1]); // 2,200 mg without the budget
    const p = balancePortions(items, 2000, 90);
    expect(sum(items, p, 'sodium')).toBeLessThanOrEqual(SODIUM_BUDGET);
    expect(p[1]).toBeLessThan(1);
    expect(tierOf(items, p, 2000, 90)).toBe(2);
  });

  it('spreads the day rather than pairing a tiny meal with a huge one', () => {
    // Protein is easy to reach; the old cost happily shrank breakfast to 0.5 and doubled lunch.
    const items: BalanceItem[] = [
      { kcal: 520, protein: 12, budget: 450 },
      { kcal: 480, protein: 48, budget: 630 },
      { kcal: 400, protein: 14, budget: 540 },
      { kcal: 200, protein: 12, budget: 180 },
    ];
    const p = balancePortions(items, 1800, 130);
    for (const [i, it] of items.entries()) {
      const ratio = (it.kcal * (p[i] as number)) / it.budget;
      expect(ratio, `meal ${i}`).toBeGreaterThanOrEqual(0.65 - 1e-9);
      expect(ratio, `meal ${i}`).toBeLessThanOrEqual(1.5 + 1e-9);
    }
    expect(tierOf(items, p, 1800, 130)).toBe(exactTier(items, 1800, 130));
  });

  it('holds a red-meat main at 1.25 servings once protein is met, and prefers whole or half eggs', () => {
    const meat: BalanceItem[] = [
      { kcal: 450, protein: 20, budget: 500 },
      { kcal: 480, protein: 40, budget: 700, redMeat: 150 },
      { kcal: 450, protein: 18, budget: 600 },
      { kcal: 150, protein: 5, budget: 200 },
    ];
    const without = balancePortions(meat.map(({ redMeat: _, ...it }) => it), 2000, 90);
    expect(without[1]).toBeGreaterThan(1.25);
    const p = balancePortions(meat, 2000, 90);
    expect(p[1]).toBeLessThanOrEqual(1.25);
    expect(tierOf(meat, p, 2000, 90)).toBe(2);
    // 1.5 eggs a serving: 1.25 servings would be 1.88 eggs.
    const eggs: BalanceItem[] = [
      { kcal: 400, protein: 20, budget: 500, counts: [1.5] },
      { kcal: 700, protein: 35, budget: 700 },
      { kcal: 600, protein: 30, budget: 600 },
      { kcal: 200, protein: 10, budget: 200 },
    ];
    const e = balancePortions(eggs, 2000, 90);
    expect(Number.isInteger((e[0] as number) * 1.5 * 2)).toBe(true);
  });

  it('avoids a double plate when the other meals can take the energy, and lands at or under target for a weight-loss goal', () => {
    const soup: BalanceItem[] = [
      { kcal: 500, protein: 20, budget: 500 },
      { kcal: 330, protein: 18, budget: 700 }, // a light soup: 2 servings are closest to its budget
      { kcal: 550, protein: 25, budget: 600 },
      { kcal: 200, protein: 8, budget: 200 },
    ];
    expect(bestPortion(330, 700)).toBe(2);
    const p = balancePortions(soup, 2000, 70);
    expect(p[1]).toBeLessThan(2);
    expect(tierOf(soup, p, 2000, 70)).toBe(2);
    const rng = mulberry32(11);
    let over = 0;
    let overLose = 0;
    let excess = 0;
    let excessLose = 0;
    for (let trial = 0; trial < 200; trial++) {
      const items: BalanceItem[] = [0.25, 0.35, 0.3, 0.1].map((s) => {
        const kcal = s < 0.15 ? 100 + rng() * 200 : 300 + rng() * 400;
        return { kcal, protein: kcal * 0.06, budget: 1800 * s };
      });
      const k = sum(items, balancePortions(items, 1800, 90), 'kcal');
      const pLose = balancePortions(items, 1800, 90, { lose: true });
      const kLose = sum(items, pLose, 'kcal');
      if (k > 1800) over++;
      if (kLose > 1800) overLose++;
      excess += Math.max(0, k - 1800);
      excessLose += Math.max(0, kLose - 1800);
      expect(tierOf(items, pLose, 1800, 90)).toBe(exactTier(items, 1800, 90));
    }
    expect(overLose).toBeLessThan(over);
    expect(excessLose).toBeLessThan(excess * 0.8);
  });
});
