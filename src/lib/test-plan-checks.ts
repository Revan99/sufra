// Property checks over a run of generated day plans. Shared by the planner tests on the fixture catalog and on
// the real catalog. Pure: returns what it found, the tests decide what to assert.
import type { CatalogRecipe, DayPlan, MealSlot, Profile } from '../types.ts';
import { diffDays } from './dates.ts';
import { isEligible } from './filters.ts';
import { dayTotals } from './planner.ts';
import { KCAL_TOLERANCE, PORTIONS, PROTEIN_FLOOR, reachableTier } from './planner-balance.ts';
import { slotEnergySplit } from './targets.ts';

export interface SlotRepeatStats {
  slot: MealSlot;
  mealsPerDay: number;
  /** Recipes the profile may eat in this slot. */
  eligible: number;
  /** Smallest distance in days between two uses of one recipe in this slot (Infinity when nothing repeats). */
  minGap: number;
  /** Distinct recipes used in the slot. */
  distinct: number;
}

export interface PlanCheckReport {
  /** Human-readable violations of hard rules (empty = all good). */
  errors: string[];
  slots: SlotRepeatStats[];
  days: number;
  /** Days whose kcal is within ±10% of the target. */
  kcalInBand: number;
  /** Days whose protein reaches 90% of the target. */
  proteinOk: number;
  /** Days where some portion choice for the day's recipes reaches kcal band and 90% protein together. */
  proteinAchievable: number;
  /** Mean protein / target over the days. */
  meanProteinRatio: number;
  /**
   * Days checked for a rule-keeping swap (those with 6 planned days on both sides; see checkPlans). A day in this
   * set that misses the kcal band or the protein floor although one swap would fix it is an error.
   */
  swapChecked: number;
}

export interface SwapFix {
  slot: MealSlot;
  index: number;
  from: string;
  to: string;
}

export interface CheckOptions {
  /**
   * The recipes a slot's rotation table schedules on a date (planner.ts tableRecipes). When given, a swap that takes
   * a recipe its slot's table schedules within 6 days doesn't count as rule-keeping: the planner never takes one
   * while that day is still to be planned, since the day will serve it.
   */
  scheduled?: (date: string, slot: MealSlot) => readonly string[];
}

/**
 * Best (kcal in band, protein ratio) reachable by any portion choice for these per-serving values, by brute force
 * over every combination. `stop` ends the search at the first combination that meets it.
 */
export function bestReachable(
  items: readonly { kcal: number; protein: number }[],
  kcalTarget: number,
  proteinTarget: number,
  stop: 'kcal' | 'both' = 'both',
): { kcal: boolean; both: boolean } {
  const lo = kcalTarget * (1 - KCAL_TOLERANCE) - 1e-6;
  const hi = kcalTarget * (1 + KCAL_TOLERANCE) + 1e-6;
  let kcal = false;
  let both = false;
  const n = items.length;
  const idx = new Array<number>(n).fill(0);
  for (;;) {
    let k = 0;
    let p = 0;
    for (let i = 0; i < n; i++) {
      const portion = PORTIONS[idx[i] as number] as number;
      k += (items[i] as { kcal: number }).kcal * portion;
      p += (items[i] as { protein: number }).protein * portion;
    }
    if (k >= lo && k <= hi) {
      kcal = true;
      if (stop === 'kcal') break;
      if (p >= proteinTarget * PROTEIN_FLOOR - 1e-6) {
        both = true;
        break;
      }
    }
    let i = 0;
    while (i < n) {
      idx[i] = (idx[i] as number) + 1;
      if ((idx[i] as number) < PORTIONS.length) break;
      idx[i] = 0;
      i++;
    }
    if (i === n) break;
  }
  return { kcal, both };
}

/**
 * A single swap on day `i` that keeps every hard rule and reaches `want` (kcal band, or kcal band and 90% protein
 * together), or null. Rule-keeping: the meal's slot has at least 7 eligible recipes per daily meal (so the 7-day rule
 * applies; small pools trade spacing, not kcal), the new recipe is eligible there, not on the day, and not served in
 * that slot on any of the 6 days before or after (all of which must be in `plans`).
 */
export function findRuleKeepingSwap(
  plans: readonly DayPlan[],
  i: number,
  profile: Profile,
  catalog: readonly CatalogRecipe[],
  want: 'kcal' | 'both',
  opts: CheckOptions = {},
): SwapFix | null {
  const plan = plans[i];
  if (!plan || i < 6 || i + 6 >= plans.length) return null;
  const byId = new Map(catalog.map((r) => [r.id, r]));
  const k = new Map<MealSlot, number>();
  for (const l of slotEnergySplit(profile.snacksPerDay)) k.set(l.slot, (k.get(l.slot) ?? 0) + 1);
  const onDay = new Set(plan.meals.map((m) => m.recipeId));
  const items = plan.meals.map((m) => byId.get(m.recipeId)?.perServing ?? { kcal: 0, protein: 0 });
  for (const [mi, meal] of plan.meals.entries()) {
    const eligible = catalog.filter((r) => isEligible(r, profile, meal.slot));
    if (eligible.length < 7 * (k.get(meal.slot) ?? 1)) continue;
    const near = new Set<string>();
    for (let j = i - 6; j <= i + 6; j++) {
      if (j === i) continue;
      for (const m of (plans[j] as DayPlan).meals) if (m.slot === meal.slot) near.add(m.recipeId);
      for (const id of opts.scheduled?.((plans[j] as DayPlan).date, meal.slot) ?? []) near.add(id);
    }
    for (const r of eligible) {
      if (onDay.has(r.id) || near.has(r.id)) continue;
      const swapped = items.slice();
      swapped[mi] = r.perServing;
      // reachableTier is never pessimistic, so it only skips hopeless swaps; the brute force decides.
      if (reachableTier(swapped, profile.kcalTarget, profile.proteinTarget) < (want === 'kcal' ? 1 : 2)) continue;
      const reach = bestReachable(swapped, profile.kcalTarget, profile.proteinTarget, want);
      if (want === 'kcal' ? reach.kcal : reach.both) return { slot: meal.slot, index: meal.index, from: meal.recipeId, to: r.id };
    }
  }
  return null;
}

/**
 * Checks generated plans (no overrides) for consecutive dates against SPEC "Planner": eligibility (R2), no
 * recipe twice a day and no same-slot repeat within 7 days when the slot has ≥ 7 recipes per daily meal (R3),
 * portions from the allowed set, and kcal/protein landing whenever the pool allows (R4): whenever the day's recipes
 * allow it, and, on days with 6 planned days on both sides, whenever one rule-keeping swap (findRuleKeepingSwap)
 * would. Also that meals plus unfilled cover the profile's meals exactly, with a meal unfilled only when nothing
 * eligible is left (R8).
 */
export function checkPlans(plans: readonly DayPlan[], profile: Profile, catalog: readonly CatalogRecipe[], opts: CheckOptions = {}): PlanCheckReport {
  const byId = new Map(catalog.map((r) => [r.id, r]));
  const lanes = slotEnergySplit(profile.snacksPerDay);
  const kOf = new Map<MealSlot, number>();
  for (const l of lanes) kOf.set(l.slot, (kOf.get(l.slot) ?? 0) + 1);
  const errors: string[] = [];
  const uses = new Map<MealSlot, Map<string, number[]>>();
  let kcalInBand = 0;
  let proteinOk = 0;
  let proteinAchievable = 0;
  let ratioSum = 0;
  let swapChecked = 0;
  const first = plans[0]?.date;

  plans.forEach((plan, i) => {
    if (first && diffDays(first, plan.date) !== i) errors.push(`${plan.date}: plans are not consecutive`);
    const seen = new Set<string>();
    const lanesSeen = new Set<string>();
    for (const meal of plan.meals) {
      const r = byId.get(meal.recipeId);
      const key = `${meal.slot}#${meal.index}`;
      if (lanesSeen.has(key)) errors.push(`${plan.date}: two meals for ${key}`);
      lanesSeen.add(key);
      if (!r) {
        errors.push(`${plan.date}: unknown recipe ${meal.recipeId}`);
        continue;
      }
      if (!r.slots.includes(meal.slot)) errors.push(`${plan.date}: ${r.id} is not a ${meal.slot} recipe`);
      if (!isEligible(r, profile, meal.slot)) errors.push(`${plan.date}: ${r.id} is not eligible for the profile`);
      if (!PORTIONS.includes(meal.portion)) errors.push(`${plan.date}: portion ${meal.portion} for ${r.id}`);
      if (seen.has(r.id)) errors.push(`${plan.date}: ${r.id} twice on the day`);
      seen.add(r.id);
      const bySlot = uses.get(meal.slot) ?? new Map<string, number[]>();
      bySlot.set(r.id, [...(bySlot.get(r.id) ?? []), i]);
      uses.set(meal.slot, bySlot);
    }
    for (const u of plan.unfilled) {
      const key = `${u.slot}#${u.index}`;
      if (lanesSeen.has(key)) errors.push(`${plan.date}: ${key} is both planned and unfilled`);
      lanesSeen.add(key);
      // R8: a meal is only unfilled when every recipe the profile may eat there is already on the day.
      const spare = catalog.find((r) => isEligible(r, profile, u.slot) && !seen.has(r.id));
      if (spare) errors.push(`${plan.date}: ${key} unfilled although ${spare.id} was free`);
    }
    for (const l of lanes) if (!lanesSeen.has(`${l.slot}#${l.index}`)) errors.push(`${plan.date}: ${l.slot}#${l.index} missing`);
    if (lanesSeen.size !== lanes.length) errors.push(`${plan.date}: ${lanesSeen.size} lanes, expected ${lanes.length}`);

    const totals = dayTotals(plan.meals, byId);
    if (Math.abs(totals.kcal - plan.totals.kcal) > 1e-6 || Math.abs(totals.protein - plan.totals.protein) > 1e-6) {
      errors.push(`${plan.date}: totals do not match the meals`);
    }
    const inBand = Math.abs(plan.totals.kcal - profile.kcalTarget) <= profile.kcalTarget * KCAL_TOLERANCE + 1e-6;
    const pOk = plan.totals.protein >= profile.proteinTarget * PROTEIN_FLOOR - 1e-6;
    if (inBand) kcalInBand++;
    if (pOk) proteinOk++;
    ratioSum += profile.proteinTarget > 0 ? plan.totals.protein / profile.proteinTarget : 1;
    const items = plan.meals.map((m) => byId.get(m.recipeId)?.perServing ?? { kcal: 0, protein: 0 });
    if (items.length) {
      const reach = bestReachable(items, profile.kcalTarget, profile.proteinTarget);
      if (reach.both) proteinAchievable++;
      if (reach.kcal && !inBand) errors.push(`${plan.date}: kcal ${Math.round(plan.totals.kcal)} out of band although reachable`);
      if (reach.both && !(inBand && pOk)) errors.push(`${plan.date}: protein ${Math.round(plan.totals.protein)} g below 90% although reachable`);
      if (i >= 6 && i + 6 < plans.length) {
        swapChecked++;
        const show = (f: SwapFix) => `swapping ${f.slot}#${f.index} ${f.from} for ${f.to}`;
        const kcalFix = !inBand && !reach.kcal ? findRuleKeepingSwap(plans, i, profile, catalog, 'kcal', opts) : null;
        if (kcalFix) errors.push(`${plan.date}: kcal ${Math.round(plan.totals.kcal)} out of band although ${show(kcalFix)} reaches it`);
        const bothFix = !kcalFix && !(inBand && pOk) && !reach.both ? findRuleKeepingSwap(plans, i, profile, catalog, 'both', opts) : null;
        if (bothFix) errors.push(`${plan.date}: protein ${Math.round(plan.totals.protein)} g below 90% although ${show(bothFix)} reaches it`);
      }
    }
  });

  const slots: SlotRepeatStats[] = [];
  for (const [slot, k] of kOf) {
    const eligible = catalog.filter((r) => isEligible(r, profile, slot)).length;
    let minGap = Infinity;
    const bySlot = uses.get(slot) ?? new Map<string, number[]>();
    for (const [id, days] of bySlot) {
      for (let j = 1; j < days.length; j++) {
        const gap = (days[j] as number) - (days[j - 1] as number);
        minGap = Math.min(minGap, gap);
        if (eligible >= 7 * k && gap < 7) errors.push(`${slot}: ${id} again after ${gap} days (pool ${eligible})`);
      }
    }
    slots.push({ slot, mealsPerDay: k, eligible, minGap, distinct: bySlot.size });
  }
  return {
    errors,
    slots,
    days: plans.length,
    kcalInBand,
    proteinOk,
    proteinAchievable,
    meanProteinRatio: plans.length ? ratioSum / plans.length : 0,
    swapChecked,
  };
}
