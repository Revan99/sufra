// Portion selection for one day: fit the kcal target (±10%) and reach 90% of the protein target when the
// chosen recipes allow it. Pure and small (at most 5 meals), so an exact search is affordable when needed.
//
// Among portion choices of the same tier (see Scored), a cost decides. It stays close to the kcal target and each
// meal's budget, then keeps the day sensible: no meal far outside its share of the day, no plate above 1.5
// servings without need, sodium within the daily budget, red-meat mains not scaled past 1.25 once protein is met,
// whole or half eggs and breads, and for a weight-loss goal kcal at or under the target. None of these can cost a
// tier, so the kcal and protein guarantees hold.

/** Allowed portions, as multiples of one serving. */
export const PORTIONS: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/** The day's kcal must land within this fraction of the target. */
export const KCAL_TOLERANCE = 0.1;
/** Protein should reach this fraction of the target when achievable. */
export const PROTEIN_FLOOR = 0.9;
/** Daily sodium budget, mg (WHO: under 2,000 mg a day). Absolute, not scaled by the kcal target. */
export const SODIUM_BUDGET = 2000;
/** A meal may range from this fraction of its kcal budget... */
const SHAPE_LO = 0.65;
/** ...to this multiple of it without cost. */
const SHAPE_HI = 1.5;
/** Portions above this many servings cost a little: a double plate of soup is a lot of food. */
const LARGE_PORTION = 1.5;
/** Red-meat mains are not scaled past this portion once protein reaches the floor. */
export const RED_MEAT_PORTION = 1.25;
/** Raw red-meat grams per serving from which a meal counts as a red-meat main. */
export const RED_MEAT_MIN_G = 40;

export interface BalanceItem {
  /** kcal per serving */
  kcal: number;
  /** protein grams per serving */
  protein: number;
  /** kcal this meal should ideally supply */
  budget: number;
  /** Sodium mg per serving. The day's sodium above SODIUM_BUDGET costs extra once kcal lands in the band. */
  sodium?: number;
  /** Raw red-meat grams per serving. From RED_MEAT_MIN_G, portions above 1.25 cost extra once protein is met. */
  redMeat?: number;
  /**
   * Per-serving counts of things served whole: eggs, tortillas, flatbreads, bread slices (1.5 for 3 eggs in a
   * 2-serving recipe). A portion that gives other than whole or half units (1.88 eggs) costs a little.
   */
  counts?: readonly number[];
}

export interface BalanceOptions {
  /** Weight-loss goal: kcal above the target costs a little, so equally good days land at or under it. */
  lose?: boolean;
}

/** The allowed portion that brings `kcal` closest to `budget` (1 when either is not positive). */
export function bestPortion(kcal: number, budget: number): number {
  if (!(kcal > 0) || !(budget > 0)) return 1;
  let best = 1;
  let err = Infinity;
  for (const p of PORTIONS) {
    const e = Math.abs(kcal * p - budget);
    if (e < err - 1e-9) {
      err = e;
      best = p;
    }
  }
  return best;
}

/** Nearest allowed portion (1 for anything that isn't a finite number). */
export function snapPortion(portion: number): number {
  if (!Number.isFinite(portion)) return 1;
  let best = 1;
  let err = Infinity;
  for (const p of PORTIONS) {
    const e = Math.abs(p - portion);
    if (e < err - 1e-9) {
      err = e;
      best = p;
    }
  }
  return best;
}

interface Scored {
  /** 2 = kcal in band and protein ≥ floor, 1 = kcal in band, 0 = neither. */
  tier: number;
  cost: number;
}

function better(a: Scored, b: Scored): boolean {
  return a.tier > b.tier || (a.tier === b.tier && a.cost < b.cost - 1e-12);
}

/** True when `n` is a whole or half number (with a little slack). */
function halfUnits(n: number): boolean {
  return Math.abs(n * 2 - Math.round(n * 2)) < 0.02;
}

function evaluate(items: readonly BalanceItem[], idx: readonly number[], T: number, PT: number, opts: BalanceOptions): Scored {
  let k = 0;
  let r = 0;
  let na = 0;
  let budgetErr = 0;
  let portionDev = 0;
  let shapeErr = 0;
  let large = 0;
  let redMeat = 0;
  let awkward = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i] as BalanceItem;
    const p = PORTIONS[idx[i] as number] as number;
    const kc = it.kcal * p;
    k += kc;
    r += it.protein * p;
    na += (it.sodium ?? 0) * p;
    budgetErr += Math.abs(kc - it.budget);
    portionDev += Math.abs(p - 1);
    // A meal far from its share of the day (a 200 kcal dinner next to a 1,000 kcal lunch).
    if (it.budget > 0) shapeErr += Math.max(0, SHAPE_LO - kc / it.budget) + Math.max(0, kc / it.budget - SHAPE_HI);
    large += Math.max(0, p - LARGE_PORTION) ** 2;
    if ((it.redMeat ?? 0) >= RED_MEAT_MIN_G) redMeat += Math.max(0, p - RED_MEAT_PORTION);
    if (it.counts) for (const c of it.counts) if (!halfUnits(c * p)) awkward++;
  }
  const dev = Math.abs(k - T) / T;
  const pr = PT > 0 ? r / PT : 1;
  const kcalOk = dev <= KCAL_TOLERANCE + 1e-9;
  const tier = kcalOk ? (pr >= PROTEIN_FLOOR - 1e-9 ? 2 : 1) : 0;
  const cost =
    dev * 4 +
    Math.max(0, dev - 0.08) * 60 +
    Math.max(0, PROTEIN_FLOOR - pr) * 12 +
    Math.max(0, 1 - pr) * 1.5 +
    (budgetErr / T) * 0.6 +
    portionDev * 0.04 +
    shapeErr * 3 +
    large * 0.6 +
    awkward * 0.15 +
    (opts.lose ? Math.max(0, (k - T) / T) * 2 : 0) +
    // Sodium and red meat only weigh once the kcal band (sodium) or the protein floor (red meat) is met, so they
    // never trade against either.
    (tier >= 1 ? (Math.max(0, na - SODIUM_BUDGET) / SODIUM_BUDGET) * 2 : 0) +
    (tier >= 2 ? redMeat : 0);
  return { tier, cost };
}

function localSearch(items: readonly BalanceItem[], start: number[], T: number, PT: number, opts: BalanceOptions): { idx: number[]; s: Scored } {
  const n = items.length;
  const max = PORTIONS.length - 1;
  let idx = start.slice();
  let s = evaluate(items, idx, T, PT, opts);
  for (let iter = 0; iter < 60; iter++) {
    let bestIdx: number[] | null = null;
    let bestS = s;
    const tryMove = (cand: number[]) => {
      const cs = evaluate(items, cand, T, PT, opts);
      if (better(cs, bestS)) {
        bestS = cs;
        bestIdx = cand;
      }
    };
    for (let i = 0; i < n; i++) {
      const vi = idx[i] as number;
      for (const d of [-1, 1]) {
        if (vi + d < 0 || vi + d > max) continue;
        const c = idx.slice();
        c[i] = vi + d;
        tryMove(c);
        // Pair moves trade energy between meals (e.g. more of the high-protein main, less of the snack).
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          const vj = idx[j] as number;
          if (vj - d < 0 || vj - d > max) continue;
          const c2 = c.slice();
          c2[j] = vj - d;
          tryMove(c2);
        }
      }
    }
    if (!bestIdx) break;
    idx = bestIdx;
    s = bestS;
  }
  return { idx, s };
}

/**
 * The best a day's recipes could do with some portions: 0 = the kcal band is out of reach, 1 = kcal can land in
 * the band, 2 = kcal and 90% of the protein target together. It treats portions as continuous between 0.5 and 2,
 * so the tier can be optimistic but never pessimistic: a 0 or 1 is certain.
 */
export function reachableTier(items: readonly Pick<BalanceItem, 'kcal' | 'protein'>[], T: number, PT: number): 0 | 1 | 2 {
  const lo = items.reduce((a, it) => a + it.kcal * PORTIONS[0]!, 0);
  const hi = items.reduce((a, it) => a + it.kcal * PORTIONS[PORTIONS.length - 1]!, 0);
  const kmax = T * (1 + KCAL_TOLERANCE);
  if (lo > kmax || hi < T * (1 - KCAL_TOLERANCE)) return 0;
  if (PT <= 0) return 2;
  let k = lo;
  let r = items.reduce((a, it) => a + it.protein * PORTIONS[0]!, 0);
  const byDensity = items
    .filter((it) => it.kcal > 0)
    .slice()
    .sort((a, b) => b.protein / b.kcal - a.protein / a.kcal);
  for (const it of byDensity) {
    const add = Math.min(it.kcal * (PORTIONS[PORTIONS.length - 1]! - PORTIONS[0]!), kmax - k);
    if (add <= 0) break;
    k += add;
    r += (add * it.protein) / it.kcal;
  }
  return r >= PT * PROTEIN_FLOOR ? 2 : 1;
}

/**
 * The best a day's recipes can do with the allowed portions, exactly (the tier balancePortions will reach):
 * 0 = the kcal band is out of reach, 1 = kcal can land in the band, 2 = kcal and 90% of the protein target
 * together (2 whenever kcal can land and the protein target is 0). A depth-first search pruned on kcal and protein
 * bounds, run only when reachableTier (its optimistic, cheaper cousin) doesn't already rule a tier out.
 */
export function exactTier(items: readonly Pick<BalanceItem, 'kcal' | 'protein'>[], T: number, PT: number): 0 | 1 | 2 {
  const opt = reachableTier(items, T, PT);
  if (opt === 0) return 0;
  const n = items.length;
  const kmin = T * (1 - KCAL_TOLERANCE) - 1e-9;
  const kmax = T * (1 + KCAL_TOLERANCE) + 1e-9;
  const floor = PT > 0 ? PT * PROTEIN_FLOOR - 1e-9 : -Infinity;
  const lo = PORTIONS[0] as number;
  const hi = PORTIONS[PORTIONS.length - 1] as number;
  const minRest = new Array<number>(n + 1).fill(0);
  const maxRest = new Array<number>(n + 1).fill(0);
  const protRest = new Array<number>(n + 1).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    const it = items[i] as Pick<BalanceItem, 'kcal' | 'protein'>;
    const kc = Math.max(0, it.kcal);
    minRest[i] = (minRest[i + 1] as number) + kc * lo;
    maxRest[i] = (maxRest[i + 1] as number) + kc * hi;
    protRest[i] = (protRest[i + 1] as number) + Math.max(0, it.protein) * hi;
  }
  // wantProtein: search for tier 2 (prune when protein can't reach the floor); else for any in-band leaf.
  const visit = (i: number, k: number, r: number, wantProtein: boolean): boolean => {
    if (i === n) return !wantProtein || r >= floor;
    if (wantProtein && r + (protRest[i] as number) < floor) return false;
    const it = items[i] as Pick<BalanceItem, 'kcal' | 'protein'>;
    const kc = Math.max(0, it.kcal);
    const pr = Math.max(0, it.protein);
    // Largest portions first: they reach protein soonest.
    for (let p = PORTIONS.length - 1; p >= 0; p--) {
      const portion = PORTIONS[p] as number;
      const k2 = k + kc * portion;
      if (k2 + (minRest[i + 1] as number) > kmax || k2 + (maxRest[i + 1] as number) < kmin) continue;
      if (visit(i + 1, k2, r + pr * portion, wantProtein)) return true;
    }
    return false;
  };
  if (opt === 2 && visit(0, 0, 0, true)) return 2;
  return visit(0, 0, 0, false) ? 1 : 0;
}

/**
 * Exact search over every portion combination whose kcal can still land in the band (depth-first, pruned on the
 * kcal bounds of the remaining meals). Only called when local search fell short of a reachable tier, so it looks
 * for tier ≥ 1 solutions only; returns null when there are none.
 */
function exhaustive(items: readonly BalanceItem[], T: number, PT: number, opts: BalanceOptions): { idx: number[]; s: Scored } | null {
  const n = items.length;
  const lo = PORTIONS[0] as number;
  const hi = PORTIONS[PORTIONS.length - 1] as number;
  const kmin = T * (1 - KCAL_TOLERANCE) - 1e-9;
  const kmax = T * (1 + KCAL_TOLERANCE) + 1e-9;
  const minRest = new Array<number>(n + 1).fill(0);
  const maxRest = new Array<number>(n + 1).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    const kc = Math.max(0, (items[i] as BalanceItem).kcal);
    minRest[i] = (minRest[i + 1] as number) + kc * lo;
    maxRest[i] = (maxRest[i + 1] as number) + kc * hi;
  }
  const idx = new Array<number>(n).fill(0);
  let best: { idx: number[]; s: Scored } | null = null;
  const visit = (i: number, k: number): void => {
    if (i === n) {
      const s = evaluate(items, idx, T, PT, opts);
      if (!best || better(s, best.s)) best = { idx: idx.slice(), s };
      return;
    }
    const kc = Math.max(0, (items[i] as BalanceItem).kcal);
    for (let p = 0; p < PORTIONS.length; p++) {
      const k2 = k + kc * (PORTIONS[p] as number);
      if (k2 + (minRest[i + 1] as number) > kmax || k2 + (maxRest[i + 1] as number) < kmin) continue;
      idx[i] = p;
      visit(i + 1, k2);
    }
  };
  visit(0, 0);
  return best;
}

/**
 * Portions for the day's meals (values from PORTIONS, same order as `items`). Guarantees: when some combination
 * puts kcal within ±10% of the target, the result does; when some combination also reaches 90% of the protein
 * target, the result does too. Among those, it stays close to the target and each meal's budget, and keeps the
 * day sensible (see the notes at the top: shape, large plates, sodium, red meat, whole eggs and breads, and with
 * `opts.lose` kcal at or under the target).
 */
export function balancePortions(items: readonly BalanceItem[], kcalTarget: number, proteinTarget: number, opts: BalanceOptions = {}): number[] {
  if (!items.length) return [];
  const T = kcalTarget > 0 ? kcalTarget : 2000;
  const PT = proteinTarget > 0 ? proteinTarget : 0;
  const startBudget = items.map((it) => PORTIONS.indexOf(bestPortion(it.kcal, it.budget)));
  const startOne = items.map(() => PORTIONS.indexOf(1));
  let best = localSearch(items, startBudget, T, PT, opts);
  const alt = localSearch(items, startOne, T, PT, opts);
  if (better(alt.s, best.s)) best = alt;
  if (best.s.tier < reachableTier(items, T, PT)) {
    const ex = exhaustive(items, T, PT, opts);
    if (ex && better(ex.s, best.s)) best = ex;
  }
  return best.idx.map((i) => PORTIONS[i] as number);
}
