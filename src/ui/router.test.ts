import { describe, expect, it } from 'vitest';
import { parseHash, recipeRoute, routeHash, tabOf } from './router.ts';
import type { Route } from './router.ts';

describe('parseHash', () => {
  it('opens Today for an empty or unknown hash', () => {
    expect(parseHash('')).toEqual({ name: 'today', date: null });
    expect(parseHash('#/')).toEqual({ name: 'today', date: null });
    expect(parseHash('#/nowhere/at/all')).toEqual({ name: 'today', date: null });
    expect(parseHash('#main')).toEqual({ name: 'today', date: null });
  });

  it('reads dates on today and week, dropping invalid ones', () => {
    expect(parseHash('#/today/2026-09-24')).toEqual({ name: 'today', date: '2026-09-24' });
    expect(parseHash('#/today/2026-02-30')).toEqual({ name: 'today', date: null });
    expect(parseHash('#/week/2026-09-26')).toEqual({ name: 'week', date: '2026-09-26' });
    expect(parseHash('#/week/soon')).toEqual({ name: 'week', date: null });
  });

  it('reads the recipe route with its meal', () => {
    expect(parseHash('#/recipe/red-lentil-soup?date=2026-09-24&slot=lunch&index=0')).toEqual({
      name: 'recipe',
      id: 'red-lentil-soup',
      date: '2026-09-24',
      slot: 'lunch',
      index: 0,
    });
    expect(parseHash('#/recipe/red-lentil-soup')).toEqual({ name: 'recipe', id: 'red-lentil-soup', date: null, slot: null, index: null });
  });

  it('repairs bad recipe query values and rejects bad ids', () => {
    const r = parseHash('#/recipe/x-1?date=nope&slot=brunch&index=9');
    expect(r).toEqual({ name: 'recipe', id: 'x-1', date: null, slot: null, index: null });
    expect(parseHash('#/recipe/snack?slot=snack&index=7')).toMatchObject({ slot: 'snack', index: 0 });
    expect(parseHash('#/recipe/%3Cscript%3E')).toEqual({ name: 'recipes' });
    expect(parseHash('#/recipe/')).toEqual({ name: 'recipes' });
    expect(parseHash('#/recipe/%E0%A4%A')).toEqual({ name: 'recipes' });
  });
});

describe('routeHash', () => {
  const routes: Route[] = [
    { name: 'today', date: null },
    { name: 'today', date: '2026-09-24' },
    { name: 'week', date: null },
    { name: 'week', date: '2026-10-03' },
    { name: 'shopping' },
    { name: 'recipes' },
    { name: 'settings' },
    recipeRoute('shakshuka'),
    recipeRoute('shakshuka', { date: '2026-09-24', slot: 'snack', index: 1 }),
  ];

  it('round-trips every route', () => {
    for (const r of routes) expect(parseHash(routeHash(r))).toEqual(r);
  });

  it('writes the documented shapes', () => {
    expect(routeHash({ name: 'today', date: '2026-09-24' })).toBe('#/today/2026-09-24');
    expect(routeHash(recipeRoute('a-b', { date: '2026-09-24', slot: 'lunch', index: 0 }))).toBe('#/recipe/a-b?date=2026-09-24&slot=lunch&index=0');
  });
});

describe('tabOf', () => {
  it('highlights the tab a screen belongs to', () => {
    expect(tabOf({ name: 'week', date: null })).toBe('week');
    expect(tabOf(recipeRoute('x'))).toBe('recipes');
    expect(tabOf(recipeRoute('x', { date: '2026-09-24', slot: 'dinner', index: 0 }))).toBe('today');
    expect(tabOf({ name: 'credits' })).toBe('settings');
  });

  it('round-trips the photo credits page', () => {
    expect(parseHash('#/credits')).toEqual({ name: 'credits' });
    expect(routeHash({ name: 'credits' })).toBe('#/credits');
  });
});
