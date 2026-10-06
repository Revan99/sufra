import { describe, expect, it } from 'vitest';
import type { Cuisine } from '../types.ts';
import { foodKind, plateArt } from './plate.ts';

const CUISINES: Cuisine[] = ['kurdish', 'iraqi', 'levantine', 'turkish', 'persian', 'gulf', 'egyptian', 'north-african', 'mediterranean', 'south-asian', 'east-asian', 'southeast-asian', 'latin-american', 'western'];
const PATH_RE = /^[MLCQTAZaz0-9 .\-]+$/;

describe('plateArt', () => {
  it('is deterministic', () => {
    expect(plateArt('shorbat-adas', 'iraqi')).toEqual(plateArt('shorbat-adas', 'iraqi'));
  });

  it('differs between recipes', () => {
    expect(plateArt('kubba-mosul', 'iraqi').food).not.toEqual(plateArt('kubba-halab', 'iraqi').food);
  });

  it('picks the rim from the cuisine and the dish from the id', () => {
    expect(plateArt('x', 'kurdish').pattern).toBe('diamond');
    expect(plateArt('x', 'persian').pattern).toBe('star');
    expect(foodKind('red-lentil-soup')).toBe('bowl');
    expect(foodKind('fattoush-salad')).toBe('salad');
    expect(foodKind('shakshuka')).toBe('egg');
    expect(foodKind('yogurt-oat-bowl')).toBe('cream');
    expect(foodKind('chicken-bulgur-pilaf')).toBe('bed');
  });

  it('draws valid, finite paths inside the plate for every cuisine', () => {
    for (const cuisine of CUISINES) {
      for (const id of ['a', 'lamb-stew', 'herb-salad', 'eggs', 'labneh-dip', 'kebab-plate']) {
        const art = plateArt(id, cuisine);
        expect(art.rim).toMatch(PATH_RE);
        expect(art.accent).toBeGreaterThanOrEqual(1);
        expect(art.accent).toBeLessThanOrEqual(4);
        for (const s of art.food) {
          expect(s.d).toMatch(PATH_RE);
          expect(s.d).not.toMatch(/NaN|Infinity/);
          const nums = (s.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
          for (const n of nums) expect(Math.abs(n)).toBeLessThan(100);
        }
      }
    }
  });
});
