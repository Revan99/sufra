// Daily targets from body stats, and how the day's energy splits across meals.
import type { ActivityLevel, BodyStats, Goal, MealSlot, Profile, Sex } from '../types.ts';

export const ACTIVITY_FACTORS: Readonly<Record<ActivityLevel, number>> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  'very-active': 1.9,
};

export const GOAL_FACTORS: Readonly<Record<Goal, number>> = { lose: 0.85, maintain: 1, gain: 1.1 };

/** Protein grams per kg of body weight, by goal. */
export const PROTEIN_PER_KG: Readonly<Record<Goal, number>> = { lose: 1.6, maintain: 1.2, gain: 1.6 };

export const KCAL_FLOOR: Readonly<Record<Sex, number>> = { female: 1200, male: 1500 };

/** Accepted input ranges for the calculator (inclusive). */
export const BODY_LIMITS = {
  age: [15, 100],
  heightCm: [120, 230],
  weightKg: [30, 300],
} as const;

/**
 * The daily targets the app accepts (inclusive), used everywhere: the calculator's output, storage and the planner.
 * A finite value outside is clamped to the nearest limit, never replaced by a default.
 */
export const TARGET_LIMITS = {
  kcalTarget: [800, 6000],
  proteinTarget: [10, 400],
} as const;

export type TargetKey = keyof typeof TARGET_LIMITS;

/**
 * A target inside TARGET_LIMITS: a finite number is clamped to the nearest limit and rounded to a whole number;
 * anything else (NaN, a string, undefined) gives `fallback`.
 */
export function clampTarget(key: TargetKey, value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const [lo, hi] = TARGET_LIMITS[key];
  return Math.round(Math.min(hi, Math.max(lo, value)));
}

export interface TargetSuggestion {
  kcalTarget: number;
  proteinTarget: number;
  /** Unrounded Mifflin-St Jeor BMR, kcal/day. */
  bmr: number;
  /** BMR x activity factor, before the goal adjustment. */
  tdee: number;
  /** True when the kcal floor for the user's sex raised the target. */
  floored: boolean;
  /** True when a target was lowered to its TARGET_LIMITS maximum (very large bodies). */
  capped: boolean;
}

/** Mifflin-St Jeor resting energy: 10 kg + 6.25 cm - 5 age + 5 (male) or - 161 (female). */
export function mifflinStJeor(body: Pick<BodyStats, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  return 10 * body.weightKg + 6.25 * body.heightCm - 5 * body.age + (body.sex === 'male' ? 5 : -161);
}

/** Body fields that are missing or outside BODY_LIMITS (empty when valid). */
export function invalidBodyFields(body: BodyStats): (keyof typeof BODY_LIMITS | 'sex' | 'activity' | 'goal')[] {
  const bad: (keyof typeof BODY_LIMITS | 'sex' | 'activity' | 'goal')[] = [];
  for (const key of ['age', 'heightCm', 'weightKg'] as const) {
    const v = body[key];
    const [lo, hi] = BODY_LIMITS[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) bad.push(key);
  }
  if (body.sex !== 'female' && body.sex !== 'male') bad.push('sex');
  // Own keys only: 'toString' or '__proto__' must not pass as an activity or goal.
  if (typeof body.activity !== 'string' || !Object.hasOwn(ACTIVITY_FACTORS, body.activity)) bad.push('activity');
  if (typeof body.goal !== 'string' || !Object.hasOwn(GOAL_FACTORS, body.goal)) bad.push('goal');
  return bad;
}

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

/**
 * Suggested daily kcal and protein, or null when the body stats are out of range.
 * kcal = BMR x activity x goal (lose -15%, gain +10%), rounded to 50, floored at 1200 (women) / 1500 (men).
 * protein = weight x 1.6 (lose, gain) or 1.2 (maintain) g/kg, rounded to 5 g.
 * Both are then kept inside TARGET_LIMITS (6000 kcal, 400 g at most; `capped` says so), so a suggestion is always
 * a value the profile accepts as is.
 */
export function suggestTargets(body: BodyStats): TargetSuggestion | null {
  if (invalidBodyFields(body).length) return null;
  const bmr = mifflinStJeor(body);
  const tdee = bmr * ACTIVITY_FACTORS[body.activity];
  const raw = roundTo(tdee * GOAL_FACTORS[body.goal], 50);
  const floor = KCAL_FLOOR[body.sex];
  const kcal = Math.max(raw, floor);
  const protein = roundTo(body.weightKg * PROTEIN_PER_KG[body.goal], 5);
  // The limits are multiples of 50 and 5, so clamping keeps the rounding.
  const kcalTarget = clampTarget('kcalTarget', kcal, kcal);
  const proteinTarget = clampTarget('proteinTarget', protein, protein);
  return {
    kcalTarget,
    proteinTarget,
    bmr,
    tdee,
    floored: raw < floor,
    capped: kcalTarget !== kcal || proteinTarget !== protein,
  };
}

/** One meal of the day and its share of the daily energy target. */
export interface MealShare {
  slot: MealSlot;
  /** 0-based among meals of the same slot. */
  index: number;
  /** Fraction of daily kcal, 0-1. The shares of a day sum to 1. */
  share: number;
}

const SPLITS: Readonly<Record<0 | 1 | 2, readonly number[]>> = {
  0: [0.3, 0.4, 0.3],
  1: [0.25, 0.35, 0.3, 0.1],
  2: [0.22, 0.32, 0.28, 0.09, 0.09],
};

/**
 * The day's meals in display order with their energy shares:
 * no snacks 30/40/30, one snack 25/35/30 + 10, two snacks 22/32/28 + 9 + 9.
 */
export function slotEnergySplit(snacksPerDay: Profile['snacksPerDay'] | number): MealShare[] {
  const n: 0 | 1 | 2 = snacksPerDay >= 2 ? 2 : snacksPerDay >= 1 ? 1 : 0;
  const shares = SPLITS[n];
  const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner'];
  const out: MealShare[] = slots.map((slot, i) => ({ slot, index: 0, share: shares[i] as number }));
  for (let i = 0; i < n; i++) out.push({ slot: 'snack', index: i, share: shares[3 + i] as number });
  return out;
}
