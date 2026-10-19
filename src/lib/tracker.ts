// The tracker: what was actually eaten (planned meals ticked off, extra foods), glasses of water, and body weight,
// kept per day in the persisted AppState (see lib/storage.ts). Everything here is pure: parsing a stored blob,
// updates that return a new tracker, and the day totals, streaks and averages the Progress screen draws.
//
// An eaten meal keeps a snapshot of what was eaten (recipe, kcal, protein, fiber), so history never changes when a
// plan does: a swap, a new target or a new recipe library re-plans days, but what was logged stays logged.
import type { MealSlot } from '../types.ts';
import { MEAL_SLOTS } from '../types.ts';
import { addDays, diffDays, isISODate } from './dates.ts';
import type { ISODate } from './dates.ts';
import { KCAL_TOLERANCE } from './planner-balance.ts';

export type MealStatus = 'eaten' | 'skipped';
export type WeightUnit = 'kg' | 'lb';

/** A planned meal ticked off as eaten or skipped. */
export interface MealLog {
  slot: MealSlot;
  index: number;
  status: MealStatus;
  /** The recipe that was planned (and eaten) when it was logged. */
  recipeId: string;
  /** What the portion held, for an eaten meal (0 for a skipped one). */
  kcal: number;
  protein: number;
  fiber: number;
  /** Local time it was logged, 'HH:MM'. */
  at: string;
}

/** Something eaten that wasn't planned: a recipe from the library, or a quick entry with a name and kcal. */
export interface FoodLog {
  id: string;
  slot: MealSlot;
  name: string;
  kcal: number;
  protein: number;
  fiber: number;
  /** Set when it came from the recipe library. */
  recipeId?: string;
  at: string;
}

export interface DayLog {
  meals: MealLog[];
  foods: FoodLog[];
  /** Glasses of water. */
  water: number;
}

export interface WeightLog {
  date: ISODate;
  at: string;
  kg: number;
}

export interface Tracker {
  /** Logs by date. A day with nothing logged has no entry. */
  days: Record<ISODate, DayLog>;
  /** One entry per date, oldest first. */
  weights: WeightLog[];
  unit: WeightUnit;
  /** Glasses of water a day. */
  waterGoal: number;
}

/** Days of logs kept: a year of history for the Year view, and a little more. */
export const TRACKER_MAX_AGE_DAYS = 400;
export const WATER_LIMITS = [0, 30] as const;
export const WATER_GOAL_LIMITS = [1, 20] as const;
export const WEIGHT_LIMITS_KG = [20, 400] as const;
export const KCAL_LOG_LIMITS = [0, 5000] as const;
export const DEFAULT_WATER_GOAL = 8;
/** A day within this share of the kcal target counts as close (on target is KCAL_TOLERANCE, 10%). */
export const CLOSE_TOLERANCE = 0.2;
/** Fiber to aim for: 14 g per 1,000 kcal (Dietary Guidelines for Americans). */
export const FIBER_PER_1000_KCAL = 14;
export const LB_PER_KG = 2.20462;
const MAX_FOODS_PER_DAY = 40;
const MAX_WEIGHTS = 1500;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function defaultTracker(): Tracker {
  return { days: {}, weights: [], unit: 'kg', waterGoal: DEFAULT_WATER_GOAL };
}

export function emptyDay(): DayLog {
  return { meals: [], foods: [], water: 0 };
}

// ---------------------------------------------------------------------------------------------------------------
// Parsing: a valid tracker from anything. Bad entries are dropped, numbers clamped, never throws.

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function clamp(x: unknown, lo: number, hi: number, digits = 0): number | undefined {
  if (typeof x !== 'number' || !Number.isFinite(x)) return undefined;
  const f = 10 ** digits;
  return Math.round(Math.min(hi, Math.max(lo, x)) * f) / f;
}

function time(x: unknown): string {
  return typeof x === 'string' && TIME_RE.test(x) ? x : '12:00';
}

function slotOf(x: unknown): MealSlot | undefined {
  return typeof x === 'string' && (MEAL_SLOTS as readonly string[]).includes(x) ? (x as MealSlot) : undefined;
}

function parseMeal(x: unknown): MealLog | undefined {
  if (!isRecord(x)) return undefined;
  const slot = slotOf(x.slot);
  const index = x.index;
  const status = x.status === 'eaten' || x.status === 'skipped' ? x.status : undefined;
  if (!slot || !status || typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > 4) return undefined;
  if (typeof x.recipeId !== 'string' || !x.recipeId || x.recipeId.length > 200) return undefined;
  const eaten = status === 'eaten';
  return {
    slot,
    index,
    status,
    recipeId: x.recipeId,
    kcal: eaten ? (clamp(x.kcal, ...KCAL_LOG_LIMITS) ?? 0) : 0,
    protein: eaten ? (clamp(x.protein, 0, 500) ?? 0) : 0,
    fiber: eaten ? (clamp(x.fiber, 0, 200) ?? 0) : 0,
    at: time(x.at),
  };
}

function parseFood(x: unknown): FoodLog | undefined {
  if (!isRecord(x)) return undefined;
  const slot = slotOf(x.slot);
  const name = typeof x.name === 'string' ? x.name.trim().slice(0, 80) : '';
  const kcal = clamp(x.kcal, ...KCAL_LOG_LIMITS);
  if (!slot || !name || kcal === undefined || typeof x.id !== 'string' || !x.id || x.id.length > 60) return undefined;
  const food: FoodLog = { id: x.id, slot, name, kcal, protein: clamp(x.protein, 0, 500) ?? 0, fiber: clamp(x.fiber, 0, 200) ?? 0, at: time(x.at) };
  if (typeof x.recipeId === 'string' && x.recipeId && x.recipeId.length <= 200) food.recipeId = x.recipeId;
  return food;
}

function parseDay(x: unknown): DayLog | undefined {
  if (!isRecord(x)) return undefined;
  const meals = new Map<string, MealLog>();
  if (Array.isArray(x.meals)) {
    for (const m of x.meals) {
      const meal = parseMeal(m);
      if (meal) meals.set(`${meal.slot}#${meal.index}`, meal);
    }
  }
  const foods: FoodLog[] = [];
  const ids = new Set<string>();
  if (Array.isArray(x.foods)) {
    for (const f of x.foods) {
      const food = parseFood(f);
      if (food && !ids.has(food.id) && foods.length < MAX_FOODS_PER_DAY) {
        ids.add(food.id);
        foods.push(food);
      }
    }
  }
  const day: DayLog = { meals: [...meals.values()], foods, water: clamp(x.water, ...WATER_LIMITS) ?? 0 };
  return isEmptyDay(day) ? undefined : day;
}

function parseWeights(x: unknown): WeightLog[] {
  if (!Array.isArray(x)) return [];
  const byDate = new Map<ISODate, WeightLog>();
  for (const w of x) {
    if (!isRecord(w) || !isISODate(w.date)) continue;
    const kg = clamp(w.kg, ...WEIGHT_LIMITS_KG, 1);
    if (kg === undefined) continue;
    byDate.set(w.date, { date: w.date, at: time(w.at), kg });
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-MAX_WEIGHTS);
}

export function parseTracker(x: unknown): Tracker {
  const d = defaultTracker();
  if (!isRecord(x)) return d;
  const days: Record<ISODate, DayLog> = {};
  if (isRecord(x.days)) {
    for (const [date, log] of Object.entries(x.days)) {
      if (!isISODate(date)) continue;
      const day = parseDay(log);
      if (day) days[date] = day;
    }
  }
  return {
    days,
    weights: parseWeights(x.weights),
    unit: x.unit === 'lb' ? 'lb' : 'kg',
    waterGoal: clamp(x.waterGoal, ...WATER_GOAL_LIMITS) ?? d.waterGoal,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Updates. Each returns a new tracker and leaves the input untouched; invalid input changes nothing.

export function isEmptyDay(day: DayLog): boolean {
  return day.meals.length === 0 && day.foods.length === 0 && day.water === 0;
}

export function dayLog(tracker: Tracker, date: ISODate): DayLog {
  return tracker.days[date] ?? emptyDay();
}

function withDay(tracker: Tracker, date: ISODate, day: DayLog): Tracker {
  const days = { ...tracker.days };
  if (isEmptyDay(day)) delete days[date];
  else days[date] = day;
  return { ...tracker, days };
}

/** The local time as 'HH:MM'. */
export function clockTime(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** The log for a planned meal, if it has one. */
export function mealLog(day: DayLog, slot: MealSlot, index: number): MealLog | undefined {
  return day.meals.find((m) => m.slot === slot && m.index === index);
}

/** Logs a planned meal as eaten or skipped (with what it held), or clears its log with `null`. */
export function setMealStatus(tracker: Tracker, date: ISODate, log: MealLog | { slot: MealSlot; index: number; status: null }): Tracker {
  if (!isISODate(date)) return tracker;
  const day = dayLog(tracker, date);
  const rest = day.meals.filter((m) => !(m.slot === log.slot && m.index === log.index));
  if (log.status === null) return rest.length === day.meals.length ? tracker : withDay(tracker, date, { ...day, meals: rest });
  const valid = parseMeal(log);
  return valid ? withDay(tracker, date, { ...day, meals: [...rest, valid] }) : tracker;
}

/** Forgets the log of a planned meal whose recipe changed (a swap): what's planned now hasn't been eaten. */
export function clearMealLog(tracker: Tracker, date: ISODate, slot: MealSlot, index: number): Tracker {
  return setMealStatus(tracker, date, { slot, index, status: null });
}

export function addFood(tracker: Tracker, date: ISODate, food: FoodLog): Tracker {
  if (!isISODate(date)) return tracker;
  const valid = parseFood(food);
  const day = dayLog(tracker, date);
  if (!valid || day.foods.length >= MAX_FOODS_PER_DAY) return tracker;
  return withDay(tracker, date, { ...day, foods: [...day.foods.filter((f) => f.id !== valid.id), valid] });
}

export function removeFood(tracker: Tracker, date: ISODate, id: string): Tracker {
  const day = dayLog(tracker, date);
  const foods = day.foods.filter((f) => f.id !== id);
  return foods.length === day.foods.length ? tracker : withDay(tracker, date, { ...day, foods });
}

export function setWater(tracker: Tracker, date: ISODate, glasses: number): Tracker {
  const water = clamp(glasses, ...WATER_LIMITS);
  if (!isISODate(date) || water === undefined) return tracker;
  const day = dayLog(tracker, date);
  return day.water === water ? tracker : withDay(tracker, date, { ...day, water });
}

/** Saves the weight for a date, replacing any earlier entry for that date. */
export function logWeight(tracker: Tracker, entry: WeightLog): Tracker {
  const [valid] = parseWeights([entry]);
  if (!valid) return tracker;
  return { ...tracker, weights: parseWeights([...tracker.weights.filter((w) => w.date !== valid.date), valid]) };
}

export function removeWeight(tracker: Tracker, date: ISODate): Tracker {
  const weights = tracker.weights.filter((w) => w.date !== date);
  return weights.length === tracker.weights.length ? tracker : { ...tracker, weights };
}

/** Drops day logs older than `maxAgeDays` before `today`. */
export function pruneTracker(tracker: Tracker, today: ISODate, maxAgeDays = TRACKER_MAX_AGE_DAYS): Tracker {
  if (!isISODate(today)) return tracker;
  const cutoff = addDays(today, -maxAgeDays);
  const old = Object.keys(tracker.days).filter((d) => d < cutoff);
  if (!old.length) return tracker;
  const days = { ...tracker.days };
  for (const d of old) delete days[d];
  return { ...tracker, days };
}

// ---------------------------------------------------------------------------------------------------------------
// Reading: totals, status, streaks, averages, weight trend.

export interface DayTotals {
  kcal: number;
  protein: number;
  fiber: number;
  water: number;
  /** Something was eaten or skipped (water alone doesn't count as a logged day of eating). */
  logged: boolean;
}

export function dayTotals(day: DayLog | undefined): DayTotals {
  if (!day) return { kcal: 0, protein: 0, fiber: 0, water: 0, logged: false };
  let kcal = 0;
  let protein = 0;
  let fiber = 0;
  for (const m of day.meals) {
    if (m.status !== 'eaten') continue;
    kcal += m.kcal;
    protein += m.protein;
    fiber += m.fiber;
  }
  for (const f of day.foods) {
    kcal += f.kcal;
    protein += f.protein;
    fiber += f.fiber;
  }
  return { kcal, protein, fiber, water: day.water, logged: day.meals.length > 0 || day.foods.length > 0 };
}

/** How a day's eating went against the kcal target: on target (±10%), close (±20%), missed, or nothing logged. */
export type DayStatus = 'on' | 'close' | 'missed' | 'empty';

export function dayStatus(totals: DayTotals, kcalTarget: number): DayStatus {
  if (!totals.logged || totals.kcal <= 0) return 'empty';
  const off = Math.abs(totals.kcal - kcalTarget) / kcalTarget;
  if (off <= KCAL_TOLERANCE) return 'on';
  if (off <= CLOSE_TOLERANCE) return 'close';
  return 'missed';
}

export function statusOn(tracker: Tracker, date: ISODate, kcalTarget: number): DayStatus {
  return dayStatus(dayTotals(tracker.days[date]), kcalTarget);
}

export interface Streak {
  /** Days on target in a row, up to today (today counts once it's on target, and doesn't break it before). */
  current: number;
  /** First day of the current run. */
  since: ISODate | null;
  /** The longest run on record. */
  best: number;
}

export function streak(tracker: Tracker, today: ISODate, kcalTarget: number): Streak {
  const on = (d: ISODate) => statusOn(tracker, d, kcalTarget) === 'on';
  let start = on(today) ? today : addDays(today, -1);
  let current = 0;
  while (on(start) && current <= TRACKER_MAX_AGE_DAYS) {
    current += 1;
    start = addDays(start, -1);
  }
  const since = current ? addDays(start, 1) : null;
  // The best run: walk the logged dates in order.
  let best = current;
  let run = 0;
  let prev: ISODate | null = null;
  for (const d of Object.keys(tracker.days).sort()) {
    if (!on(d)) {
      run = 0;
      prev = d;
      continue;
    }
    run = prev && run > 0 && diffDays(prev, d) === 1 ? run + 1 : 1;
    prev = d;
    if (run > best) best = run;
  }
  return { current, since, best };
}

export interface RangeStats {
  days: number;
  /** Days with meals or foods logged. */
  loggedDays: number;
  /** Averages over the logged days (water: over days with any water). */
  avgKcal: number;
  avgProtein: number;
  avgWater: number;
  onTarget: number;
}

/** Averages over `dates` (only days with something logged count toward the averages). */
export function rangeStats(tracker: Tracker, dates: readonly ISODate[], kcalTarget: number): RangeStats {
  let logged = 0;
  let kcal = 0;
  let protein = 0;
  let waterDays = 0;
  let water = 0;
  let onTarget = 0;
  for (const d of dates) {
    const t = dayTotals(tracker.days[d]);
    if (t.water > 0) {
      waterDays += 1;
      water += t.water;
    }
    if (!t.logged) continue;
    logged += 1;
    kcal += t.kcal;
    protein += t.protein;
    if (dayStatus(t, kcalTarget) === 'on') onTarget += 1;
  }
  return {
    days: dates.length,
    loggedDays: logged,
    avgKcal: logged ? kcal / logged : 0,
    avgProtein: logged ? protein / logged : 0,
    avgWater: waterDays ? water / waterDays : 0,
    onTarget,
  };
}

/** Weights from `from` to `to`, inclusive, oldest first. */
export function weightsBetween(tracker: Tracker, from: ISODate, to: ISODate): WeightLog[] {
  return tracker.weights.filter((w) => w.date >= from && w.date <= to);
}

export function latestWeight(tracker: Tracker): WeightLog | undefined {
  return tracker.weights[tracker.weights.length - 1];
}

/**
 * The change from the earliest weight within `days` days of the latest one to the latest (negative = lost), or
 * null with fewer than two weights in that span.
 */
export function weightChange(tracker: Tracker, days = 30): number | null {
  const last = latestWeight(tracker);
  if (!last) return null;
  const from = addDays(last.date, -days);
  const first = tracker.weights.find((w) => w.date >= from && w.date < last.date);
  return first ? Math.round((last.kg - first.kg) * 10) / 10 : null;
}

export function fiberTarget(kcalTarget: number): number {
  return Math.round((kcalTarget * FIBER_PER_1000_KCAL) / 1000);
}

export function toUnit(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg * LB_PER_KG : kg;
}

export function fromUnit(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value / LB_PER_KG : value;
}

/** Recently logged foods, newest first, one per name, for one-tap logging again. */
export function recentFoods(tracker: Tracker, limit = 5): FoodLog[] {
  const out: FoodLog[] = [];
  const seen = new Set<string>();
  const dates = Object.keys(tracker.days).sort().reverse();
  for (const d of dates) {
    const foods = [...(tracker.days[d]?.foods ?? [])].reverse();
    for (const f of foods) {
      const key = f.recipeId ?? f.name.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** A short unique id for a logged food. */
export function newFoodId(now: number = Date.now()): string {
  return `f${now.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}
