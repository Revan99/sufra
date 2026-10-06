import { describe, expect, it } from 'vitest';
import type { CatalogRecipe, DayPlan, RecipePhoto } from '../types.ts';
import { photoKey, photoSources, photoUrl, prefetchPaths } from './photo.ts';

const photo = (id: string, extra: Partial<RecipePhoto> = {}): RecipePhoto => ({
  src: `images/${id}.webp`,
  thumb: `images/${id}-thumb.webp`,
  width: 960,
  height: 720,
  alt: `A photo of ${id} on a plate`,
  focus: [50, 40],
  credit: { title: id, author: 'A', license: 'CC0 1.0', sourceUrl: 'https://example.org', source: 'Example', changes: 'Resized' },
  ...extra,
});

describe('photoUrl', () => {
  it('puts relative paths under the app base, whatever it is', () => {
    expect(photoUrl('images/a.webp', './')).toBe('./images/a.webp');
    expect(photoUrl('images/a.webp', '/')).toBe('/images/a.webp');
    expect(photoUrl('images/a.webp', '/sufra')).toBe('/sufra/images/a.webp');
    expect(photoUrl('./images/a.webp', '/sufra/')).toBe('/sufra/images/a.webp');
    expect(photoUrl('images/a.webp', '')).toBe('./images/a.webp');
  });

  it('keeps absolute URLs and root paths', () => {
    expect(photoUrl('https://cdn.test/a.webp', './')).toBe('https://cdn.test/a.webp');
    expect(photoUrl('/images/a.webp', './')).toBe('/images/a.webp');
  });
});

describe('photoSources', () => {
  it('offers the thumbnail at 400w and the large photo at its width, with the focus as object-position', () => {
    const s = photoSources(photo('dolma'), './');
    expect(s.src).toBe('./images/dolma.webp');
    expect(s.srcSet).toBe('./images/dolma-thumb.webp 400w, ./images/dolma.webp 960w');
    expect([s.width, s.height]).toEqual([960, 720]);
    expect(s.objectPosition).toBe('50% 40%');
  });

  it('uses the real width of a smaller large photo, and one candidate when it is no wider than a thumbnail', () => {
    expect(photoSources(photo('a', { width: 800, height: 600 }), './').srcSet).toBe('./images/a-thumb.webp 400w, ./images/a.webp 800w');
    expect(photoSources(photo('b', { width: 360, height: 270 }), './').srcSet).toBe('./images/b.webp 360w');
  });

  it('clamps a focus outside 0-100', () => {
    expect(photoSources(photo('c', { focus: [-5, 140] }), './').objectPosition).toBe('0% 100%');
  });

  it('keys failures per photo and per use', () => {
    expect(photoKey(photo('a'), '4rem')).not.toBe(photoKey(photo('a'), '100vw'));
    expect(photoKey(photo('a'), '4rem')).not.toBe(photoKey(photo('b'), '4rem'));
  });
});

describe('prefetchPaths', () => {
  const recipe = (id: string, withPhoto: boolean) => ({ id, photo: withPhoto ? photo(id) : undefined }) as unknown as CatalogRecipe;
  const byId = new Map(['a', 'b', 'c', 'd'].map((id) => [id, recipe(id, id !== 'c')]));
  const day = (date: string, ids: string[]): DayPlan => ({
    date,
    meals: ids.map((recipeId, index) => ({ slot: 'snack', index, recipeId, portion: 1 })),
    totals: { kcal: 0, protein: 0, carbs: 0, fiber: 0, sugars: 0, fat: 0, satFat: 0, sodium: 0 },
    unfilled: [],
  });

  it('puts the focus days’ thumbnails and large photos first, then the week’s thumbnails, once each', () => {
    const today = day('2026-09-25', ['a', 'c']);
    const week = [day('2026-09-24', ['b', 'a']), today, day('2026-09-26', ['d', 'x'])];
    expect(prefetchPaths([today, today], week, byId)).toEqual(['images/a-thumb.webp', 'images/a.webp', 'images/b-thumb.webp', 'images/d-thumb.webp']);
  });

  it('is empty when nothing planned has a photo', () => {
    expect(prefetchPaths([day('2026-09-25', ['c'])], [], byId)).toEqual([]);
  });
});
