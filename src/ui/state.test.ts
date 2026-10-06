import { describe, expect, it } from 'vitest';
import { defaultState } from '../lib/storage.ts';
import { reducer } from './state.ts';
import { msUntilMidnight } from './useToday.ts';

describe('reducer', () => {
  it('updates the profile field by field, clamping numbers', () => {
    const s = reducer(defaultState(), { type: 'profile', patch: { kcalTarget: 9000, diet: 'vegan' } });
    expect(s.profile.kcalTarget).toBe(6000);
    expect(s.profile.diet).toBe('vegan');
    expect(s.profile.proteinTarget).toBe(90);
  });

  it('toggles favorites', () => {
    const on = reducer(defaultState(), { type: 'favorite', id: 'quzi' });
    expect(on.favorites).toEqual(['quzi']);
    expect(reducer(on, { type: 'favorite', id: 'quzi' }).favorites).toEqual([]);
  });

  it('sets and clears overrides', () => {
    const o = { date: '2026-09-24', slot: 'lunch' as const, index: 0, recipeId: 'quzi', portion: 1.3 };
    const s = reducer(defaultState(), { type: 'override', override: o });
    expect(s.overrides).toEqual([{ ...o, portion: 1.25 }]);
    expect(reducer(s, { type: 'clearOverride', date: o.date, slot: 'lunch', index: 0 }).overrides).toEqual([]);
    expect(reducer(s, { type: 'clearDay', date: o.date }).overrides).toEqual([]);
  });

  it('ticks shopping items for a list and clears them', () => {
    const s = reducer(defaultState(), { type: 'shopToggle', ingredientId: 'onion', through: '2026-09-26' });
    expect(s.shoppingChecked).toEqual([{ ingredientId: 'onion', through: '2026-09-26' }]);
    expect(reducer(s, { type: 'shopClear' }).shoppingChecked).toEqual([]);
  });

  it('finishes onboarding with or without a profile', () => {
    const skipped = reducer(defaultState(), { type: 'onboarded' });
    expect(skipped.onboarded).toBe(true);
    expect(skipped.profile).toEqual(defaultState().profile);
    const set = reducer(defaultState(), { type: 'onboarded', profile: { kcalTarget: 2400, excludeAllergens: ['sesame'] } });
    expect(set.onboarded).toBe(true);
    expect(set.profile.kcalTarget).toBe(2400);
    expect(set.profile.excludeAllergens).toEqual(['sesame']);
  });

  it('changes the theme and resets', () => {
    const dark = reducer(defaultState(), { type: 'theme', theme: 'dark' });
    expect(dark.theme).toBe('dark');
    expect(reducer(dark, { type: 'reset' })).toEqual(defaultState());
  });

  it('drops overrides whose recipe left the library (a renamed or removed recipe)', () => {
    const keep = { date: '2026-09-24', slot: 'lunch' as const, index: 0, recipeId: 'quzi', portion: 1 };
    const gone = { date: '2026-09-24', slot: 'dinner' as const, index: 0, recipeId: 'no-such-recipe', portion: 1 };
    const s = { ...defaultState(), overrides: [keep, gone] };
    expect(reducer(s, { type: 'prune', today: '2026-09-24', known: new Set(['quzi']) }).overrides).toEqual([keep]);
    const clean = { ...defaultState(), overrides: [keep] };
    expect(reducer(clean, { type: 'prune', today: '2026-09-24', known: new Set(['quzi']) })).toBe(clean);
  });

  it('keeps the same object when nothing changes', () => {
    const s = defaultState();
    expect(reducer(s, { type: 'theme', theme: 'system' })).toBe(s);
    expect(reducer(s, { type: 'prune', today: '2026-09-24' })).toBe(s);
  });
});

describe('msUntilMidnight', () => {
  it('waits until just after the next local midnight', () => {
    const now = new Date(2026, 8, 24, 23, 59, 0);
    expect(msUntilMidnight(now)).toBe(61_000);
    expect(msUntilMidnight(new Date(2026, 8, 24, 12, 0, 0))).toBe(12 * 3600_000 + 1000);
  });
});
