// Deterministic hashing and pseudo-random numbers. The planner must never use Math.random.

/** cyrb53: fast 53-bit string hash. Same input and seed always give the same non-negative integer. */
export function hashString(input: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Hashes several parts joined by a separator that can't appear in ids ('\u0000'). */
export function hashParts(...parts: readonly (string | number)[]): number {
  return hashString(parts.map(String).join('\u0000'));
}

/** 32-bit integer mixer (lowbias32): spreads the bits of an integer. Returns an unsigned 32-bit integer. */
export function mix32(x: number): number {
  let h = x | 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** A function returning floats in [0, 1). */
export type Rng = () => number;

/** mulberry32: small, fast seeded PRNG. Only the low 32 bits of the seed are used. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A PRNG seeded from a string (or string parts). */
export function rngFrom(...parts: readonly (string | number)[]): Rng {
  const h = hashParts(...parts);
  // Fold the high bits in so all 53 bits of the hash matter.
  return mulberry32((h ^ Math.floor(h / 4294967296)) >>> 0);
}

/** Integer in [0, n). Returns 0 when n <= 0. */
export function randInt(rng: Rng, n: number): number {
  if (n <= 0) return 0;
  return Math.min(n - 1, Math.floor(rng() * n));
}

/** Fisher-Yates shuffle into a new array. The input is not mutated. */
export function seededShuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

/** Picks one item, or undefined for an empty list. */
export function pick<T>(items: readonly T[], rng: Rng): T | undefined {
  return items.length ? items[randInt(rng, items.length)] : undefined;
}
