import { afterEach, describe, expect, it } from 'vitest';
import type { MealOverride } from '../types.ts';
import {
  STATE_VERSION,
  STORAGE_KEY,
  browserStorage,
  clearDayOverrides,
  clearOverride,
  clearShoppingChecked,
  clearState,
  defaultProfile,
  defaultState,
  isFavorite,
  isShoppingChecked,
  loadState,
  parseOverrides,
  parseProfile,
  parseState,
  pruneOverrides,
  pruneShoppingChecked,
  pruneState,
  saveState,
  setOverride,
  shoppingCheckedIds,
  storedVersion,
  toggleFavorite,
  toggleShoppingChecked,
  updateProfile,
} from './storage.ts';
import type { AppState, StorageLike } from './storage.ts';

/** In-memory Web Storage. */
function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const throwing: StorageLike = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

const sample = (): AppState => ({
  ...defaultState(),
  profile: { ...defaultProfile(), kcalTarget: 1800, proteinTarget: 110, diet: 'vegetarian', excludeAllergens: ['gluten'], maxTotalMinutes: 30, householdSize: 3 },
  favorites: ['shakshuka', 'mujaddara'],
  overrides: [{ date: '2026-09-24', slot: 'lunch', index: 0, recipeId: 'mujaddara', portion: 1.25 }],
  shoppingChecked: [{ ingredientId: 'onion', through: '2026-09-25' }],
  onboarded: true,
  theme: 'dark',
});

describe('defaults', () => {
  it('match the SPEC', () => {
    expect(defaultProfile()).toEqual({
      kcalTarget: 2000,
      proteinTarget: 90,
      snacksPerDay: 1,
      diet: 'omnivore',
      excludeAllergens: [],
      dislikedIngredients: [],
      maxTotalMinutes: null,
      weekStart: 'saturday',
      householdSize: 1,
    });
    expect(defaultState()).toMatchObject({ version: STATE_VERSION, favorites: [], overrides: [], shoppingChecked: [], onboarded: false, theme: 'system' });
    expect(STATE_VERSION).toBe(2);
  });

  it('are fresh objects each time', () => {
    const a = defaultState();
    a.favorites.push('x');
    a.profile.excludeAllergens.push('egg');
    expect(defaultState().favorites).toEqual([]);
    expect(defaultProfile().excludeAllergens).toEqual([]);
  });
});

describe('loadState and saveState', () => {
  it('round-trips through the single sufra:v1 key', () => {
    const storage = memoryStorage();
    expect(saveState(sample(), storage)).toBe(true);
    expect([...storage.data.keys()]).toEqual([STORAGE_KEY]);
    expect(STORAGE_KEY).toBe('sufra:v1');
    expect(loadState(storage)).toEqual(sample());
    expect(JSON.parse(storage.data.get(STORAGE_KEY) as string).version).toBe(STATE_VERSION);
    expect(storedVersion(storage)).toBe(STATE_VERSION);
  });

  it('gives defaults when nothing is saved or the data is not JSON', () => {
    expect(loadState(memoryStorage())).toEqual(defaultState());
    expect(loadState(memoryStorage({ [STORAGE_KEY]: '{not json' }))).toEqual(defaultState());
    expect(loadState(memoryStorage({ [STORAGE_KEY]: '' }))).toEqual(defaultState());
    for (const junk of ['null', '42', '"text"', '[1,2]', 'true']) expect(loadState(memoryStorage({ [STORAGE_KEY]: junk }))).toEqual(defaultState());
  });

  it('repairs bad fields one by one and keeps the good ones', () => {
    const raw = {
      version: 7,
      profile: {
        kcalTarget: '2500',
        proteinTarget: 120.4,
        snacksPerDay: 3,
        diet: 'carnivore',
        excludeAllergens: ['gluten', 'pork', 5, 'gluten'],
        dislikedIngredients: ['onion', null, '', 'onion'],
        maxTotalMinutes: 'soon',
        weekStart: 'friday',
        householdSize: 12,
        body: { sex: 'female', age: 30, heightCm: 165, weightKg: 60, activity: 'moderate', goal: 'maintain' },
      },
      favorites: ['a', 'a', 3, 'b', { id: 'c' }],
      overrides: 'nope',
      shoppingChecked: [null, 'garlic', { ingredientId: 'onion', through: '2026-02-30' }, { ingredientId: 'garlic', through: '2026-09-25' }],
      onboarded: 'yes',
      theme: 'purple',
    };
    const s = loadState(memoryStorage({ [STORAGE_KEY]: JSON.stringify(raw) }));
    expect(s.version).toBe(STATE_VERSION);
    expect(s.profile).toEqual({
      kcalTarget: 2000,
      proteinTarget: 120,
      snacksPerDay: 1,
      diet: 'omnivore',
      excludeAllergens: ['gluten'],
      dislikedIngredients: ['onion'],
      maxTotalMinutes: null,
      weekStart: 'saturday',
      // A finite number out of range is clamped, not reset (12 -> 8).
      householdSize: 8,
      body: { sex: 'female', age: 30, heightCm: 165, weightKg: 60, activity: 'moderate', goal: 'maintain' },
    });
    expect(s.favorites).toEqual(['a', 'b']);
    expect(s.overrides).toEqual([]);
    expect(s.shoppingChecked).toEqual([{ ingredientId: 'garlic', through: '2026-09-25' }]);
    expect(s.onboarded).toBe(false);
    expect(s.theme).toBe('system');
  });

  it('drops invalid body stats but keeps valid time limits and nulls', () => {
    expect(parseProfile({ body: { sex: 'male', age: 5 } }).body).toBeUndefined();
    expect(parseProfile({ maxTotalMinutes: null }).maxTotalMinutes).toBeNull();
    expect(parseProfile({ maxTotalMinutes: 45 }).maxTotalMinutes).toBe(45);
    // Too short a limit is clamped to 5 minutes, never turned into "no limit".
    expect(parseProfile({ maxTotalMinutes: 2 }).maxTotalMinutes).toBe(5);
    expect(parseProfile({ maxTotalMinutes: 'soon' }).maxTotalMinutes).toBeNull();
    expect(parseProfile({ snacksPerDay: 0 }).snacksPerDay).toBe(0);
    expect(parseProfile({ householdSize: 8 }).householdSize).toBe(8);
    expect(parseProfile(undefined)).toEqual(defaultProfile());
    expect(parseState(undefined)).toEqual(defaultState());
  });

  it('keeps only valid overrides, one per meal, with snapped portions', () => {
    const got = parseOverrides([
      { date: '2026-09-24', slot: 'lunch', index: 0, recipeId: 'a', portion: 1.1 },
      { date: '2026-09-24', slot: 'lunch', index: 0, recipeId: 'b', portion: 3 },
      { date: '2026-02-30', slot: 'lunch', index: 0, recipeId: 'c', portion: 1 },
      { date: '2026-09-24', slot: 'brunch', index: 0, recipeId: 'd', portion: 1 },
      { date: '2026-09-24', slot: 'snack', index: 5, recipeId: 'e', portion: 1 },
      { date: '2026-09-24', slot: 'snack', index: 1.5, recipeId: 'f', portion: 1 },
      { date: '2026-09-24', slot: 'snack', index: 1, recipeId: '', portion: 1 },
      { date: '2026-09-24', slot: 'snack', index: 1, recipeId: 'g' },
      'garbage',
      null,
    ]);
    expect(got).toEqual([
      { date: '2026-09-24', slot: 'lunch', index: 0, recipeId: 'b', portion: 2 },
      { date: '2026-09-24', slot: 'snack', index: 1, recipeId: 'g', portion: 1 },
    ]);
  });

  it('works without storage and when storage throws', () => {
    expect(loadState(null)).toEqual(defaultState());
    expect(saveState(sample(), null)).toBe(false);
    expect(clearState(null)).toBe(false);
    expect(loadState(throwing)).toEqual(defaultState());
    expect(saveState(sample(), throwing)).toBe(false);
    expect(clearState(throwing)).toBe(false);
  });

  it('clears the saved state', () => {
    const storage = memoryStorage();
    saveState(sample(), storage);
    expect(clearState(storage)).toBe(true);
    expect(loadState(storage)).toEqual(defaultState());
  });
});

describe('browserStorage', () => {
  const g = globalThis as { localStorage?: unknown };
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete g.localStorage;
  });

  it('returns null when localStorage is missing or blocked, and the app still loads', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true });
    expect(browserStorage()).toBeNull();
    expect(loadState()).toEqual(defaultState());
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError: blocked');
      },
    });
    expect(browserStorage()).toBeNull();
    expect(loadState()).toEqual(defaultState());
    expect(saveState(sample())).toBe(false);
  });

  it('uses window.localStorage when it is there', () => {
    const storage = memoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
    expect(browserStorage()).toBe(storage);
    expect(saveState(sample())).toBe(true);
    expect(loadState()).toEqual(sample());
  });
});

describe('pure updates', () => {
  it('toggles favorites without mutating the input', () => {
    const s = defaultState();
    const a = toggleFavorite(s, 'shakshuka');
    expect(isFavorite(a, 'shakshuka')).toBe(true);
    expect(s.favorites).toEqual([]);
    expect(toggleFavorite(a, 'shakshuka').favorites).toEqual([]);
  });

  it('sets, replaces and clears overrides', () => {
    const o: MealOverride = { date: '2026-09-24', slot: 'dinner', index: 0, recipeId: 'a', portion: 1 };
    const a = setOverride(defaultState(), o);
    const b = setOverride(a, { ...o, recipeId: 'b', portion: 1.3 });
    expect(b.overrides).toEqual([{ ...o, recipeId: 'b', portion: 1.25 }]);
    const c = setOverride(b, { ...o, slot: 'snack', index: 1, recipeId: 'c' });
    expect(c.overrides).toHaveLength(2);
    expect(setOverride(c, { ...o, date: 'bad' })).toBe(c);
    expect(clearOverride(c, '2026-09-24', 'dinner', 0).overrides).toEqual([{ ...o, slot: 'snack', index: 1, recipeId: 'c' }]);
    expect(clearOverride(c, '2026-09-25', 'dinner', 0)).toBe(c);
    expect(clearDayOverrides(c, '2026-09-24').overrides).toEqual([]);
    expect(a.overrides).toHaveLength(1);
  });

  it('prunes overrides older than 60 days', () => {
    let s = defaultState();
    for (const date of ['2026-06-01', '2026-07-26', '2026-07-27', '2026-09-24', '2026-12-01']) {
      s = setOverride(s, { date, slot: 'lunch', index: 0, recipeId: 'x', portion: 1 });
    }
    // 2026-09-24 minus 60 days is 2026-07-26: kept; anything earlier goes.
    expect(pruneOverrides(s, '2026-09-24').overrides.map((o) => o.date)).toEqual(['2026-07-26', '2026-07-27', '2026-09-24', '2026-12-01']);
    expect(pruneOverrides(s, '2026-09-24', 0).overrides.map((o) => o.date)).toEqual(['2026-09-24', '2026-12-01']);
    expect(pruneOverrides(s, 'not a date')).toBe(s);
    const clean = pruneOverrides(s, '2026-01-01');
    expect(clean).toBe(s);
  });

  it('ticks and unticks shopping items for the list on screen', () => {
    const a = toggleShoppingChecked(defaultState(), 'onion', '2026-09-25');
    const b = toggleShoppingChecked(a, 'garlic', '2026-09-25');
    expect(shoppingCheckedIds(b, '2026-09-25')).toEqual(['onion', 'garlic']);
    expect(shoppingCheckedIds(toggleShoppingChecked(b, 'onion', '2026-09-25'), '2026-09-25')).toEqual(['garlic']);
    expect(clearShoppingChecked(b).shoppingChecked).toEqual([]);
    const empty = defaultState();
    expect(clearShoppingChecked(empty)).toBe(empty);
    expect(toggleShoppingChecked(b, 'onion', 'not a date')).toBe(b);
    expect(toggleShoppingChecked(b, '', '2026-09-25')).toBe(b);
  });

  it("scopes ticks to the list they were made on, so last week's ticks don't carry over (regression)", () => {
    // Thursday 2026-09-24, Saturday week: "this week" runs through Friday 2026-10-02 (see shoppingDates).
    const s = toggleShoppingChecked(defaultState(), 'onion', '2026-10-02');
    expect(s.shoppingChecked).toEqual([{ ingredientId: 'onion', through: '2026-10-02' }]);
    // Still ticked on shorter lists inside what was bought for: today, next 3 days, and the week list tomorrow.
    expect(isShoppingChecked(s, 'onion', '2026-09-24')).toBe(true);
    expect(isShoppingChecked(s, 'onion', '2026-09-26')).toBe(true);
    expect(isShoppingChecked(s, 'onion', '2026-10-02')).toBe(true);
    // Not on the next week's list.
    expect(isShoppingChecked(s, 'onion', '2026-10-09')).toBe(false);
    expect(shoppingCheckedIds(s, '2026-10-09')).toEqual([]);
    // A tick made on today's list doesn't cover the week.
    const today = toggleShoppingChecked(defaultState(), 'garlic', '2026-09-24');
    expect(isShoppingChecked(today, 'garlic', '2026-10-02')).toBe(false);
    // Ticking it again on the week list extends it; unticking removes it everywhere.
    const week = toggleShoppingChecked(today, 'garlic', '2026-10-02');
    expect(week.shoppingChecked).toEqual([{ ingredientId: 'garlic', through: '2026-10-02' }]);
    expect(toggleShoppingChecked(week, 'garlic', '2026-09-24').shoppingChecked).toEqual([]);
  });

  it('prunes ticks whose list has ended', () => {
    let s = toggleShoppingChecked(defaultState(), 'onion', '2026-09-20');
    s = toggleShoppingChecked(s, 'garlic', '2026-09-24');
    s = toggleShoppingChecked(s, 'salt', '2026-10-02');
    expect(pruneShoppingChecked(s, '2026-09-24').shoppingChecked.map((c) => c.ingredientId)).toEqual(['garlic', 'salt']);
    expect(pruneShoppingChecked(s, '2026-09-19')).toBe(s);
    expect(pruneShoppingChecked(s, 'nope')).toBe(s);
    const withOverride = setOverride(s, { date: '2026-06-01', slot: 'lunch', index: 0, recipeId: 'x', portion: 1 });
    const pruned = pruneState(withOverride, '2026-09-24');
    expect(pruned.overrides).toEqual([]);
    expect(pruned.shoppingChecked).toHaveLength(2);
  });

  it('merges profile changes and repairs them', () => {
    const s = updateProfile(defaultState(), { kcalTarget: 2200, householdSize: 99, diet: 'vegan' });
    expect(s.profile.kcalTarget).toBe(2200);
    expect(s.profile.householdSize).toBe(8);
    expect(s.profile.diet).toBe('vegan');
  });

  it('clamps an out-of-range number and keeps the previous value for anything else (regression)', () => {
    const s = updateProfile(defaultState(), { kcalTarget: 1800, proteinTarget: 120, householdSize: 4, maxTotalMinutes: 30, diet: 'vegetarian', excludeAllergens: ['egg'] });
    expect(updateProfile(s, { kcalTarget: 700 }).profile.kcalTarget).toBe(800);
    expect(updateProfile(s, { kcalTarget: 6600 }).profile.kcalTarget).toBe(6000);
    expect(updateProfile(s, { proteinTarget: 415 }).profile.proteinTarget).toBe(400);
    expect(updateProfile(s, { householdSize: 9 }).profile.householdSize).toBe(8);
    expect(updateProfile(s, { householdSize: 0 }).profile.householdSize).toBe(1);
    expect(updateProfile(s, { maxTotalMinutes: 3 }).profile.maxTotalMinutes).toBe(5);
    expect(updateProfile(s, { maxTotalMinutes: null }).profile.maxTotalMinutes).toBeNull();
    // Not a number, or not an allowed value: the field stays as it was (not the SPEC default).
    const junk = { kcalTarget: Number.NaN, proteinTarget: '95', householdSize: undefined, maxTotalMinutes: 'soon', diet: 'carnivore', snacksPerDay: 5, excludeAllergens: 'egg', weekStart: 'friday' } as unknown as Partial<AppState['profile']>;
    expect(updateProfile(s, junk).profile).toEqual(s.profile);
    // The rest of the profile is untouched by a single-field change.
    expect(updateProfile(s, { householdSize: 9 }).profile).toEqual({ ...s.profile, householdSize: 8 });
  });

  it('sets, keeps and clears body stats', () => {
    const body = { sex: 'male', age: 30, heightCm: 180, weightKg: 80, activity: 'active', goal: 'maintain' } as const;
    const s = updateProfile(defaultState(), { body });
    expect(s.profile.body).toEqual(body);
    expect(updateProfile(s, { body: { ...body, age: 5 } }).profile.body).toEqual(body);
    expect(updateProfile(s, { kcalTarget: 2500 }).profile.body).toEqual(body);
    expect('body' in updateProfile(s, { body: undefined }).profile).toBe(false);
  });

  it('accepts every calculator suggestion as is (one set of target limits, regression)', () => {
    // suggestTargets caps at 6000 kcal / 400 g; these are the uncapped values of a 200 kg and a 260 kg body.
    const s = updateProfile(defaultState(), { kcalTarget: 6000, proteinTarget: 400 });
    expect([s.profile.kcalTarget, s.profile.proteinTarget]).toEqual([6000, 400]);
    const raw = updateProfile(defaultState(), { kcalTarget: 6600, proteinTarget: 415 });
    expect([raw.profile.kcalTarget, raw.profile.proteinTarget]).toEqual([6000, 400]);
  });
});

describe('versions', () => {
  it('migrates a version 1 blob: bare-id shopping ticks have no list and are dropped (regression)', () => {
    const v1 = { version: 1, favorites: ['x'], shoppingChecked: ['onion', 'garlic'], onboarded: true };
    const s = parseState(v1);
    expect(s.version).toBe(STATE_VERSION);
    expect(s.favorites).toEqual(['x']);
    expect(s.onboarded).toBe(true);
    expect(s.shoppingChecked).toEqual([]);
    // A blob without a version is version 1.
    expect(parseState({ shoppingChecked: ['onion'] }).shoppingChecked).toEqual([]);
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(v1) });
    expect(storedVersion(storage)).toBe(1);
    expect(saveState(loadState(storage), storage)).toBe(true);
    expect(storedVersion(storage)).toBe(STATE_VERSION);
  });

  it('reads a newer version but never overwrites it (an old cached app after an update, regression)', () => {
    const newer = { version: 99, favorites: ['x'], shoppingChecked: [{ ingredientId: 'onion', through: '2026-09-25' }], futureField: { keep: true } };
    const raw = JSON.stringify(newer);
    const storage = memoryStorage({ [STORAGE_KEY]: raw });
    expect(storedVersion(storage)).toBe(99);
    const s = loadState(storage);
    expect(s.favorites).toEqual(['x']);
    expect(s.shoppingChecked).toEqual([{ ingredientId: 'onion', through: '2026-09-25' }]);
    expect(saveState(toggleFavorite(s, 'y'), storage)).toBe(false);
    expect(storage.data.get(STORAGE_KEY)).toBe(raw);
    // Reset still clears it on purpose.
    expect(clearState(storage)).toBe(true);
    expect(storedVersion(storage)).toBeNull();
    expect(storedVersion(null)).toBeNull();
    expect(storedVersion(throwing)).toBeNull();
  });
});
