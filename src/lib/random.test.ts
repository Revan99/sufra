import { describe, expect, it } from 'vitest';
import { hashParts, hashString, mix32, mulberry32, pick, randInt, rngFrom, seededShuffle } from './random.ts';

describe('hashString', () => {
  it('is deterministic, non-negative and within 53 bits', () => {
    for (const s of ['', 'a', 'sufra', 'shorbat-adas', 'سفرة', 'x'.repeat(1000)]) {
      const h = hashString(s);
      expect(h).toBe(hashString(s));
      expect(Number.isSafeInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
    }
  });

  it('separates similar strings and seeds', () => {
    expect(hashString('abc')).not.toBe(hashString('abd'));
    expect(hashString('abc')).not.toBe(hashString('abc', 1));
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) seen.add(hashString(`recipe-${i}`));
    expect(seen.size).toBe(5000);
  });

  it('hashParts keeps part boundaries', () => {
    expect(hashParts('ab', 'c')).not.toBe(hashParts('a', 'bc'));
    expect(hashParts('a', 1)).toBe(hashParts('a', '1'));
  });
});

describe('mix32', () => {
  it('returns unsigned 32-bit integers and spreads nearby inputs', () => {
    const outs = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = mix32(i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(2 ** 32);
      expect(Number.isInteger(v)).toBe(true);
      outs.add(v);
    }
    expect(outs.size).toBe(1000);
  });
});

describe('mulberry32', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('gives floats in [0, 1) with a roughly uniform spread', () => {
    const rng = mulberry32(7);
    const buckets = new Array<number>(10).fill(0);
    for (let i = 0; i < 20000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      buckets[Math.floor(x * 10)]!++;
    }
    for (const n of buckets) expect(n).toBeGreaterThan(1700);
  });

  it('rngFrom depends on every part', () => {
    expect(rngFrom('a', 1)()).toBe(rngFrom('a', 1)());
    expect(rngFrom('a', 1)()).not.toBe(rngFrom('a', 2)());
  });
});

describe('randInt, seededShuffle and pick', () => {
  it('randInt stays in range and handles n <= 0', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = randInt(rng, 7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
    expect(randInt(rng, 0)).toBe(0);
    expect(randInt(() => 0.9999999999, 3)).toBe(2);
  });

  it('seededShuffle is a deterministic permutation and leaves the input alone', () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    const copy = input.slice();
    const a = seededShuffle(input, rngFrom('s'));
    const b = seededShuffle(input, rngFrom('s'));
    expect(a).toEqual(b);
    expect(input).toEqual(copy);
    expect([...a].sort((x, y) => x - y)).toEqual(input);
    expect(a).not.toEqual(input);
    expect(seededShuffle([], rngFrom('s'))).toEqual([]);
  });

  it('pick returns undefined for an empty list', () => {
    expect(pick([], mulberry32(1))).toBeUndefined();
    expect(['x']).toContain(pick(['x'], mulberry32(1)));
  });
});
