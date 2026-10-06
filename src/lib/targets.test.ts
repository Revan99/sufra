import { describe, expect, it } from 'vitest';
import type { BodyStats } from '../types.ts';
import { ACTIVITY_FACTORS, BODY_LIMITS, TARGET_LIMITS, clampTarget, invalidBodyFields, mifflinStJeor, slotEnergySplit, suggestTargets } from './targets.ts';

const body = (patch: Partial<BodyStats>): BodyStats => ({
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  activity: 'moderate',
  goal: 'maintain',
  ...patch,
});

describe('suggestTargets (hand-computed)', () => {
  it('female, 30 y, 165 cm, 60 kg, moderate, maintain', () => {
    // BMR = 600 + 1031.25 - 150 - 161 = 1320.25; x1.55 = 2046.39 -> 2050. Protein 60 x 1.2 = 72 -> 70.
    const t = suggestTargets(body({}));
    expect(t?.bmr).toBeCloseTo(1320.25, 6);
    expect(t?.tdee).toBeCloseTo(2046.3875, 6);
    expect(t?.kcalTarget).toBe(2050);
    expect(t?.proteinTarget).toBe(70);
    expect(t?.floored).toBe(false);
  });

  it('male, 40 y, 180 cm, 90 kg, sedentary, lose', () => {
    // BMR = 900 + 1125 - 200 + 5 = 1830; x1.2 = 2196; x0.85 = 1866.6 -> 1850. Protein 90 x 1.6 = 144 -> 145.
    const t = suggestTargets(body({ sex: 'male', age: 40, heightCm: 180, weightKg: 90, activity: 'sedentary', goal: 'lose' }));
    expect(t?.bmr).toBe(1830);
    expect(t?.kcalTarget).toBe(1850);
    expect(t?.proteinTarget).toBe(145);
  });

  it('male, 25 y, 175 cm, 70 kg, very active, gain', () => {
    // BMR = 700 + 1093.75 - 125 + 5 = 1673.75; x1.9 = 3180.125; x1.1 = 3498.14 -> 3500. Protein 70 x 1.6 = 112 -> 110.
    const t = suggestTargets(body({ sex: 'male', age: 25, heightCm: 175, weightKg: 70, activity: 'very-active', goal: 'gain' }));
    expect(t?.kcalTarget).toBe(3500);
    expect(t?.proteinTarget).toBe(110);
  });

  it('female light and male active, maintain', () => {
    // 680 + 1062.5 - 175 - 161 = 1406.5; x1.375 = 1933.94 -> 1950. 68 x 1.2 = 81.6 -> 80.
    const f = suggestTargets(body({ age: 35, heightCm: 170, weightKg: 68, activity: 'light' }));
    expect([f?.kcalTarget, f?.proteinTarget]).toEqual([1950, 80]);
    // 800 + 1125 - 150 + 5 = 1780; x1.725 = 3070.5 -> 3050. 80 x 1.2 = 96 -> 95.
    const m = suggestTargets(body({ sex: 'male', age: 30, heightCm: 180, weightKg: 80, activity: 'active' }));
    expect([m?.kcalTarget, m?.proteinTarget]).toEqual([3050, 95]);
  });

  it('floors at 1200 kcal for women and 1500 for men', () => {
    // 450 + 937.5 - 350 - 161 = 876.5; x1.2 x0.85 = 894 -> 900 -> floored to 1200.
    const f = suggestTargets(body({ age: 70, heightCm: 150, weightKg: 45, activity: 'sedentary', goal: 'lose' }));
    expect(f?.kcalTarget).toBe(1200);
    expect(f?.floored).toBe(true);
    expect(f?.proteinTarget).toBe(70);
    // 450 + 937.5 - 450 + 5 = 942.5; x1.2 x0.85 = 961 -> 950 -> floored to 1500.
    const m = suggestTargets(body({ sex: 'male', age: 90, heightCm: 150, weightKg: 45, activity: 'sedentary', goal: 'lose' }));
    expect(m?.kcalTarget).toBe(1500);
    expect(m?.floored).toBe(true);
  });

  it('always rounds kcal to 50 and protein to 5', () => {
    for (const activity of Object.keys(ACTIVITY_FACTORS) as BodyStats['activity'][]) {
      for (const goal of ['lose', 'maintain', 'gain'] as const) {
        for (const weightKg of [48, 63.5, 77, 104]) {
          const t = suggestTargets(body({ activity, goal, weightKg }));
          expect(t && t.kcalTarget % 50).toBe(0);
          expect(t && t.proteinTarget % 5).toBe(0);
        }
      }
    }
  });

  it('returns null for missing or out-of-range stats', () => {
    expect(suggestTargets(body({ age: 10 }))).toBeNull();
    expect(suggestTargets(body({ weightKg: Number.NaN }))).toBeNull();
    expect(suggestTargets(body({ heightCm: 400 }))).toBeNull();
    expect(suggestTargets(body({ activity: 'couch' as BodyStats['activity'] }))).toBeNull();
    expect(invalidBodyFields(body({ age: 10, sex: 'x' as BodyStats['sex'], goal: 'bulk' as BodyStats['goal'] }))).toEqual(['age', 'sex', 'goal']);
    expect(mifflinStJeor({ sex: 'male', age: 0, heightCm: 0, weightKg: 0 })).toBe(5);
  });

  it('rejects inherited Object.prototype keys as activity or goal (regression)', () => {
    for (const key of ['toString', '__proto__', 'constructor', 'hasOwnProperty']) {
      expect(invalidBodyFields(body({ activity: key as BodyStats['activity'], goal: key as BodyStats['goal'] }))).toEqual(['activity', 'goal']);
      expect(suggestTargets(body({ activity: key as BodyStats['activity'] }))).toBeNull();
      expect(suggestTargets(body({ goal: key as BodyStats['goal'] }))).toBeNull();
    }
    expect(invalidBodyFields(body({ activity: 5 as unknown as BodyStats['activity'] }))).toEqual(['activity']);
  });

  it('keeps every suggestion inside the target limits the rest of the app accepts (regression)', () => {
    // 20 y, 200 cm, 200 kg, very active, gain: 6600 kcal raw; 260 kg losing: 415 g protein raw.
    const big = suggestTargets(body({ sex: 'male', age: 20, heightCm: 200, weightKg: 200, activity: 'very-active', goal: 'gain' }));
    expect(big).toMatchObject({ kcalTarget: 6000, capped: true });
    const heavy = suggestTargets(body({ age: 40, heightCm: 170, weightKg: 260, activity: 'sedentary', goal: 'lose' }));
    expect(heavy).toMatchObject({ proteinTarget: 400, capped: true });
    expect(suggestTargets(body({}))?.capped).toBe(false);
    // Over the whole calculator input space, the output is always accepted unchanged.
    for (const sex of ['female', 'male'] as const) {
      for (const weightKg of [BODY_LIMITS.weightKg[0], 120, BODY_LIMITS.weightKg[1]]) {
        for (const activity of Object.keys(ACTIVITY_FACTORS) as BodyStats['activity'][]) {
          for (const goal of ['lose', 'maintain', 'gain'] as const) {
            const t = suggestTargets(body({ sex, weightKg, activity, goal, age: 15, heightCm: 230 }));
            expect(t).not.toBeNull();
            expect(clampTarget('kcalTarget', t?.kcalTarget, -1)).toBe(t?.kcalTarget);
            expect(clampTarget('proteinTarget', t?.proteinTarget, -1)).toBe(t?.proteinTarget);
          }
        }
      }
    }
  });
});

describe('clampTarget', () => {
  it('clamps finite numbers to the limits, rounds, and falls back only for non-numbers', () => {
    expect(TARGET_LIMITS).toEqual({ kcalTarget: [800, 6000], proteinTarget: [10, 400] });
    expect(clampTarget('kcalTarget', 6600, 2000)).toBe(6000);
    expect(clampTarget('kcalTarget', 700, 2000)).toBe(800);
    expect(clampTarget('kcalTarget', 1850.4, 2000)).toBe(1850);
    expect(clampTarget('proteinTarget', 415, 90)).toBe(400);
    expect(clampTarget('proteinTarget', 3, 90)).toBe(10);
    expect(clampTarget('kcalTarget', Number.NaN, 2000)).toBe(2000);
    expect(clampTarget('kcalTarget', Number.POSITIVE_INFINITY, 2000)).toBe(2000);
    expect(clampTarget('kcalTarget', '2500', 2000)).toBe(2000);
    expect(clampTarget('proteinTarget', undefined, 90)).toBe(90);
  });
});

describe('slotEnergySplit', () => {
  it('uses the SPEC splits and sums to 1', () => {
    const shares = (n: number) => slotEnergySplit(n).map((m) => m.share);
    expect(shares(0)).toEqual([0.3, 0.4, 0.3]);
    expect(shares(1)).toEqual([0.25, 0.35, 0.3, 0.1]);
    expect(shares(2)).toEqual([0.22, 0.32, 0.28, 0.09, 0.09]);
    for (const n of [0, 1, 2]) expect(shares(n).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('lists meals in display order with snack indexes', () => {
    expect(slotEnergySplit(2).map((m) => `${m.slot}#${m.index}`)).toEqual(['breakfast#0', 'lunch#0', 'dinner#0', 'snack#0', 'snack#1']);
    expect(slotEnergySplit(5)).toHaveLength(5);
    expect(slotEnergySplit(-1)).toHaveLength(3);
  });
});
