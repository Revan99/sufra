// Persisted app state: one localStorage key, versioned, validated on load. Bad fields are repaired or dropped,
// never fatal, and every storage access is guarded so the app works with storage missing or blocked.
//
// Versions: the blob carries `version`. An older blob is migrated on load (see migrate). A blob written by a newer
// build (an old cached app shell after an update) is read best-effort but never overwritten: saveState refuses,
// so the newer data survives until the newer build runs again.
import type { Allergen, BodyStats, Diet, MealOverride, MealSlot, Profile, WeekStart } from '../types.ts';
import { ALLERGENS, MEAL_SLOTS } from '../types.ts';
import { addDays, isISODate } from './dates.ts';
import type { ISODate } from './dates.ts';
import { clampTarget, invalidBodyFields } from './targets.ts';
import { snapPortion } from './planner-balance.ts';

export const STORAGE_KEY = 'sufra:v1';
/** Schema version written with the state. 2: shopping ticks carry the last date of the list they were ticked on. */
export const STATE_VERSION = 2;
/** Overrides older than this many days are pruned. */
export const OVERRIDE_MAX_AGE_DAYS = 60;
/** Accepted household sizes (inclusive). */
export const HOUSEHOLD_LIMITS = [1, 8] as const;
/** Accepted cooking-time limits in minutes (inclusive); null means no limit. */
export const MINUTES_LIMITS = [5, 600] as const;

export type ThemeChoice = 'system' | 'light' | 'dark';

/**
 * An ingredient ticked off on the shopping list. A tick belongs to the list it was made on: it counts on any list
 * that ends on or before `through` (bought for those days), and not on a longer or later one.
 */
export interface ShoppingCheck {
  ingredientId: string;
  /** Last date of the list it was ticked on. */
  through: ISODate;
}

export interface AppState {
  version: typeof STATE_VERSION;
  profile: Profile;
  /** Favorite recipe ids. */
  favorites: string[];
  overrides: MealOverride[];
  /** Shopping ticks, one per ingredient. Read them with shoppingCheckedIds for the list on screen. */
  shoppingChecked: ShoppingCheck[];
  onboarded: boolean;
  theme: ThemeChoice;
}

/** The subset of the Web Storage API used here (easy to fake in tests). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const DIETS: readonly Diet[] = ['omnivore', 'pescatarian', 'vegetarian', 'vegan'];
const WEEK_STARTS: readonly WeekStart[] = ['saturday', 'sunday', 'monday'];
const THEMES: readonly ThemeChoice[] = ['system', 'light', 'dark'];
const MAX_LIST = 2000;

/** SPEC defaults: 2000 kcal, 90 g protein, 1 snack, omnivore, no exclusions, no time limit, Saturday, household 1. */
export function defaultProfile(): Profile {
  return {
    kcalTarget: 2000,
    proteinTarget: 90,
    snacksPerDay: 1,
    diet: 'omnivore',
    excludeAllergens: [],
    dislikedIngredients: [],
    maxTotalMinutes: null,
    weekStart: 'saturday',
    householdSize: 1,
  };
}

export function defaultState(): AppState {
  return {
    version: STATE_VERSION,
    profile: defaultProfile(),
    favorites: [],
    overrides: [],
    shoppingChecked: [],
    onboarded: false,
    theme: 'system',
  };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** A finite number clamped to [lo, hi] and rounded; undefined for anything that is not a finite number. */
function clampInt(x: unknown, lo: number, hi: number): number | undefined {
  return typeof x === 'number' && Number.isFinite(x) ? Math.round(Math.min(hi, Math.max(lo, x))) : undefined;
}

function oneOf<T extends string>(x: unknown, allowed: readonly T[]): T | undefined {
  return typeof x === 'string' && (allowed as readonly string[]).includes(x) ? (x as T) : undefined;
}

function stringList(x: unknown, max = MAX_LIST): string[] {
  if (!Array.isArray(x)) return [];
  const out = new Set<string>();
  for (const v of x) {
    if (typeof v === 'string' && v.trim() && v.length <= 200) out.add(v);
    if (out.size >= max) break;
  }
  return [...out];
}

function parseBody(x: unknown): BodyStats | undefined {
  if (!isRecord(x)) return undefined;
  const body = x as unknown as BodyStats;
  return invalidBodyFields(body).length
    ? undefined
    : { sex: body.sex, age: body.age, heightCm: body.heightCm, weightKg: body.weightKg, activity: body.activity, goal: body.goal };
}

/**
 * `base` with the fields of `x` applied one by one. A field `x` doesn't have (or has as undefined) keeps base's
 * value. A finite number out of range is clamped to the nearest limit (kcal 800-6000, protein 10-400, household
 * 1-8, minutes 5-600; see TARGET_LIMITS). Any other bad value keeps base's value. `body: undefined` removes the body
 * stats; an invalid body keeps base's.
 */
function mergeProfile(base: Profile, x: Record<string, unknown>): Profile {
  const has = (k: keyof Profile) => x[k] !== undefined;
  const out: Profile = { ...base, excludeAllergens: [...base.excludeAllergens], dislikedIngredients: [...base.dislikedIngredients] };
  if (has('kcalTarget')) out.kcalTarget = clampTarget('kcalTarget', x.kcalTarget, base.kcalTarget);
  if (has('proteinTarget')) out.proteinTarget = clampTarget('proteinTarget', x.proteinTarget, base.proteinTarget);
  const snacks = x.snacksPerDay;
  if (snacks === 0 || snacks === 1 || snacks === 2) out.snacksPerDay = snacks;
  out.diet = oneOf(x.diet, DIETS) ?? base.diet;
  if (Array.isArray(x.excludeAllergens)) {
    out.excludeAllergens = stringList(x.excludeAllergens).filter((a): a is Allergen => (ALLERGENS as readonly string[]).includes(a));
  }
  if (Array.isArray(x.dislikedIngredients)) out.dislikedIngredients = stringList(x.dislikedIngredients);
  if (x.maxTotalMinutes === null) out.maxTotalMinutes = null;
  else if (has('maxTotalMinutes')) out.maxTotalMinutes = clampInt(x.maxTotalMinutes, MINUTES_LIMITS[0], MINUTES_LIMITS[1]) ?? base.maxTotalMinutes;
  out.weekStart = oneOf(x.weekStart, WEEK_STARTS) ?? base.weekStart;
  if (has('householdSize')) out.householdSize = clampInt(x.householdSize, HOUSEHOLD_LIMITS[0], HOUSEHOLD_LIMITS[1]) ?? base.householdSize;
  if ('body' in x) {
    const body = x.body === undefined ? undefined : (parseBody(x.body) ?? base.body);
    if (body) out.body = body;
    else delete out.body;
  }
  return out;
}

/**
 * A valid profile from anything (a stored blob): each field that isn't a usable value falls back to its default;
 * a finite number out of range is clamped to the nearest limit instead.
 */
export function parseProfile(x: unknown): Profile {
  const d = defaultProfile();
  return isRecord(x) ? mergeProfile(d, x) : d;
}

/** Valid overrides only (bad entries dropped, portions snapped), one per (date, slot, index), last one wins. */
export function parseOverrides(x: unknown): MealOverride[] {
  if (!Array.isArray(x)) return [];
  const byKey = new Map<string, MealOverride>();
  for (const o of x) {
    if (!isRecord(o)) continue;
    const slot = oneOf<MealSlot>(o.slot, MEAL_SLOTS);
    const index = o.index;
    if (!isISODate(o.date) || !slot || typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > 4) continue;
    if (typeof o.recipeId !== 'string' || !o.recipeId) continue;
    const portion = typeof o.portion === 'number' ? snapPortion(o.portion) : 1;
    const key = `${o.date}#${slot}#${index}`;
    byKey.delete(key);
    byKey.set(key, { date: o.date, slot, index, recipeId: o.recipeId, portion });
  }
  return [...byKey.values()].slice(-MAX_LIST);
}

/** Valid shopping ticks only, one per ingredient (last one wins). Bare ids from version 1 have no list and are dropped. */
export function parseShoppingChecked(x: unknown): ShoppingCheck[] {
  if (!Array.isArray(x)) return [];
  const byId = new Map<string, ShoppingCheck>();
  for (const c of x) {
    if (!isRecord(c) || typeof c.ingredientId !== 'string' || !c.ingredientId.trim() || c.ingredientId.length > 200 || !isISODate(c.through)) continue;
    byId.delete(c.ingredientId);
    byId.set(c.ingredientId, { ingredientId: c.ingredientId, through: c.through });
  }
  return [...byId.values()].slice(-MAX_LIST);
}

/** The version a stored blob declares (1 when it has none, as version 1 always wrote it). */
function versionOf(x: Record<string, unknown>): number {
  return typeof x.version === 'number' && Number.isFinite(x.version) ? x.version : 1;
}

/** Brings an older blob to the current schema. 1 -> 2: shopping ticks were bare ids with no list, so they go. */
function migrate(x: Record<string, unknown>): Record<string, unknown> {
  let out = x;
  if (versionOf(out) < 2) out = { ...out, shoppingChecked: [], version: 2 };
  return out;
}

/**
 * A valid AppState from anything (parsed JSON, partial objects, garbage). Never throws. Older versions are
 * migrated; a newer version is read field by field as far as this schema understands it.
 */
export function parseState(x: unknown): AppState {
  const d = defaultState();
  if (!isRecord(x)) return d;
  const m = migrate(x);
  return {
    version: STATE_VERSION,
    profile: parseProfile(m.profile),
    favorites: stringList(m.favorites),
    overrides: parseOverrides(m.overrides),
    shoppingChecked: parseShoppingChecked(m.shoppingChecked),
    onboarded: typeof m.onboarded === 'boolean' ? m.onboarded : d.onboarded,
    theme: oneOf(m.theme, THEMES) ?? d.theme,
  };
}

/** window.localStorage when it exists and can be touched, else null. */
export function browserStorage(): StorageLike | null {
  try {
    const s = (globalThis as { localStorage?: StorageLike }).localStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

/**
 * The version of the saved state: a number, or null when nothing readable is saved or storage is unavailable.
 * Greater than STATE_VERSION means a newer build wrote it: the app can use loadState's result but saveState will
 * not overwrite it.
 */
export function storedVersion(storage: StorageLike | null = browserStorage()): number | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const x: unknown = JSON.parse(raw);
    return isRecord(x) ? versionOf(x) : null;
  } catch {
    return null;
  }
}

/** Loads the saved state, or defaults when there is none, it is unreadable, or storage is unavailable. */
export function loadState(storage: StorageLike | null = browserStorage()): AppState {
  if (!storage) return defaultState();
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return defaultState();
  }
  if (!raw) return defaultState();
  try {
    return parseState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

/**
 * Saves the state. Returns false when storage is unavailable or full (the app keeps working in memory), and when
 * the saved state comes from a newer version of the app, which is never overwritten.
 */
export function saveState(state: AppState, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    const saved = storedVersion(storage);
    if (saved !== null && saved > STATE_VERSION) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(parseState(state)));
    return true;
  } catch {
    return false;
  }
}

/** Removes the saved state (Settings > Reset). Returns false when storage is unavailable. */
export function clearState(storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Pure updates. Each returns a new state and leaves the input untouched.

/**
 * Applies a profile change field by field (for Settings). A finite number out of range is clamped to the nearest
 * limit (kcal 800-6000, protein 10-400, household 1-8, minutes 5-600); any other invalid value leaves that field as
 * it was. Fields the patch doesn't set stay as they are; `body: undefined` removes the body stats.
 */
export function updateProfile(state: AppState, patch: Partial<Profile>): AppState {
  const base = parseProfile(state.profile);
  return { ...state, profile: mergeProfile(base, patch as Record<string, unknown>) };
}

export function isFavorite(state: AppState, recipeId: string): boolean {
  return state.favorites.includes(recipeId);
}

/** Adds or removes a favorite. */
export function toggleFavorite(state: AppState, recipeId: string): AppState {
  const favorites = state.favorites.includes(recipeId)
    ? state.favorites.filter((id) => id !== recipeId)
    : [...state.favorites, recipeId];
  return { ...state, favorites };
}

/** Sets the override for its (date, slot, index), replacing any earlier one. Invalid overrides are ignored. */
export function setOverride(state: AppState, override: MealOverride): AppState {
  const [valid] = parseOverrides([override]);
  if (!valid) return state;
  const overrides = state.overrides.filter((o) => !(o.date === valid.date && o.slot === valid.slot && o.index === valid.index));
  return { ...state, overrides: [...overrides, valid] };
}

/** Removes the override for (date, slot, index), restoring the generated meal. */
export function clearOverride(state: AppState, date: ISODate, slot: MealSlot, index: number): AppState {
  const overrides = state.overrides.filter((o) => !(o.date === date && o.slot === slot && o.index === index));
  return overrides.length === state.overrides.length ? state : { ...state, overrides };
}

/** Removes every override for a date. */
export function clearDayOverrides(state: AppState, date: ISODate): AppState {
  const overrides = state.overrides.filter((o) => o.date !== date);
  return overrides.length === state.overrides.length ? state : { ...state, overrides };
}

/** Drops overrides dated more than `maxAgeDays` days before `today`. */
export function pruneOverrides(state: AppState, today: ISODate, maxAgeDays = OVERRIDE_MAX_AGE_DAYS): AppState {
  if (!isISODate(today)) return state;
  const cutoff = addDays(today, -maxAgeDays);
  const overrides = state.overrides.filter((o) => o.date >= cutoff);
  return overrides.length === state.overrides.length ? state : { ...state, overrides };
}

/** Ingredient ids ticked on the list that ends on `through` (ticks made on a list reaching at least that far). */
export function shoppingCheckedIds(state: AppState, through: ISODate): string[] {
  return state.shoppingChecked.filter((c) => c.through >= through).map((c) => c.ingredientId);
}

/** True when the ingredient is ticked on the list that ends on `through`. */
export function isShoppingChecked(state: AppState, ingredientId: string, through: ISODate): boolean {
  return state.shoppingChecked.some((c) => c.ingredientId === ingredientId && c.through >= through);
}

/**
 * Ticks or unticks an ingredient on the list that ends on `through` (the last of its shoppingDates). Unticking
 * removes the ingredient's tick for every list. An invalid date or empty id changes nothing.
 */
export function toggleShoppingChecked(state: AppState, ingredientId: string, through: ISODate): AppState {
  if (!isISODate(through) || typeof ingredientId !== 'string' || !ingredientId) return state;
  const rest = state.shoppingChecked.filter((c) => c.ingredientId !== ingredientId);
  const shoppingChecked = isShoppingChecked(state, ingredientId, through) ? rest : [...rest, { ingredientId, through }];
  return { ...state, shoppingChecked };
}

/** Unticks everything on the shopping list. */
export function clearShoppingChecked(state: AppState): AppState {
  return state.shoppingChecked.length ? { ...state, shoppingChecked: [] } : state;
}

/** Drops ticks whose list ended before `today`: they can no longer show on any list from today on. */
export function pruneShoppingChecked(state: AppState, today: ISODate): AppState {
  if (!isISODate(today)) return state;
  const shoppingChecked = state.shoppingChecked.filter((c) => c.through >= today);
  return shoppingChecked.length === state.shoppingChecked.length ? state : { ...state, shoppingChecked };
}

/** Housekeeping for app start: pruneOverrides and pruneShoppingChecked. */
export function pruneState(state: AppState, today: ISODate): AppState {
  return pruneShoppingChecked(pruneOverrides(state, today), today);
}
