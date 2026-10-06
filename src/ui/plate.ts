// Generative "plate" art for recipes (they have no photos): a ceramic plate whose rim pattern comes from the
// cuisine and whose food arrangement comes from the dish type and a hash of the recipe id. Deterministic: the same
// recipe always gets the same plate. Pure geometry here; Plate.tsx draws it.
import type { Cuisine } from '../types.ts';
import { hashString, mulberry32 } from '../lib/random.ts';
import type { Rng } from '../lib/random.ts';

export type RimPattern = 'diamond' | 'tulip' | 'star' | 'chevron' | 'leaf' | 'scallop' | 'dash';
export type FoodKind = 'bowl' | 'salad' | 'cream' | 'egg' | 'bed';

export interface PlateShape {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface PlateArt {
  pattern: RimPattern;
  /** Rim colour, 1-4: the CSS variable --plate-accent-N. */
  accent: 1 | 2 | 3 | 4;
  /** One path with every rim motif. */
  rim: string;
  kind: FoodKind;
  food: PlateShape[];
}

const RIM_BY_CUISINE: Readonly<Record<Cuisine, RimPattern>> = {
  kurdish: 'diamond',
  iraqi: 'diamond',
  levantine: 'tulip',
  turkish: 'tulip',
  persian: 'star',
  gulf: 'star',
  egyptian: 'chevron',
  'north-african': 'chevron',
  mediterranean: 'leaf',
  'south-asian': 'scallop',
  'east-asian': 'scallop',
  'southeast-asian': 'scallop',
  'latin-american': 'dash',
  western: 'dash',
};

// Food colours: appetizing, readable on the plate's ceramic in both themes.
const BED = ['#E2BD72', '#EDE0BF', '#D9A441', '#C98B4B'];
const STEW = ['#B84A2A', '#C9772F', '#8E5A2B', '#7C8A3A', '#D39B3A'];
const CHUNK = ['#8A4B2A', '#A65B35', '#D6AE84', '#C7A56B', '#6B4E7A', '#B03A2E'];
const DARK_CHUNK = ['#8A4B2A', '#A65B35', '#6B4E7A', '#B03A2E', '#5F3A22'];
const GREEN = ['#5F7F2E', '#7A9A3A', '#4E6B2A', '#8FAF4A'];
const CREAM = ['#F4ECDD', '#EFE4CE'];
const DOTS = ['#A61E36', '#DDBB84', '#4A4A2A', '#C0392B'];

const C = 50;
const r1 = (n: number) => Math.round(n * 10) / 10;
const pick = <T,>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length) % list.length] as T;

/** Rotates the local point (x, y) by `a` radians and moves it to (cx, cy). */
function place(cx: number, cy: number, a: number, pts: readonly (readonly [number, number])[]): [number, number][] {
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return pts.map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos]);
}

function polygon(pts: readonly (readonly [number, number])[]): string {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join('') + 'Z';
}

function circle(cx: number, cy: number, r: number): string {
  return `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0Z`;
}

/** A leaf pointing along angle `a`, `s` long. */
function leaf(cx: number, cy: number, a: number, s: number): string {
  const [tip, side1, tail, side2] = place(cx, cy, a, [[0, -s / 2], [s * 0.34, 0], [0, s / 2], [-s * 0.34, 0]]) as [[number, number], [number, number], [number, number], [number, number]];
  return `M${r1(tip[0])} ${r1(tip[1])}Q${r1(side1[0])} ${r1(side1[1])} ${r1(tail[0])} ${r1(tail[1])}Q${r1(side2[0])} ${r1(side2[1])} ${r1(tip[0])} ${r1(tip[1])}Z`;
}

/** A smooth irregular closed shape around (cx, cy): a perturbed circle through Catmull-Rom curves. */
export function blob(cx: number, cy: number, r: number, jitter: number, rng: Rng, points = 8): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (1 - jitter + rng() * 2 * jitter);
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  const at = (i: number) => pts[(i + points) % points] as [number, number];
  let d = `M${r1(pts[0]![0])} ${r1(pts[0]![1])}`;
  for (let i = 0; i < points; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0]!)} ${r1(c1[1]!)} ${r1(c2[0]!)} ${r1(c2[1]!)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d + 'Z';
}

const MOTIFS: Readonly<Record<RimPattern, { count: number; shape: (x: number, y: number, a: number, i: number) => string }>> = {
  diamond: { count: 16, shape: (x, y, a, i) => polygon(place(x, y, a, i % 2 ? [[0, -2], [1.4, 0], [0, 2], [-1.4, 0]] : [[0, -3.4], [2.2, 0], [0, 3.4], [-2.2, 0]])) },
  tulip: {
    count: 12,
    shape: (x, y, a, i) => (i % 2 ? circle(x, y, 1) : polygon(place(x, y, a, [[0, -3.4], [1.6, -1.8], [2.1, 0.8], [0.9, 2.8], [0, 1.8], [-0.9, 2.8], [-2.1, 0.8], [-1.6, -1.8]]))),
  },
  star: {
    count: 12,
    shape: (x, y, a) => polygon(place(x, y, a, Array.from({ length: 16 }, (_, k) => {
      const rr = k % 2 ? 1.5 : 3;
      const t = (k / 16) * Math.PI * 2;
      return [rr * Math.cos(t), rr * Math.sin(t)] as const;
    }))),
  },
  chevron: { count: 18, shape: (x, y, a) => polygon(place(x, y, a, [[-2.6, -1.8], [0, 0.6], [2.6, -1.8], [2.6, 0.2], [0, 2.6], [-2.6, 0.2]])) },
  leaf: { count: 14, shape: (x, y, a, i) => leaf(x, y, a + (i % 2 ? 0.5 : -0.5), 6.4) },
  scallop: { count: 20, shape: (x, y, _a, i) => circle(x, y, i % 2 ? 0.8 : 1.7) },
  dash: { count: 24, shape: (x, y, a) => polygon(place(x, y, a, [[-0.8, -2.4], [0.8, -2.4], [0.8, 2.4], [-0.8, 2.4]])) },
};

function rimPath(pattern: RimPattern, rng: Rng): string {
  const { count, shape } = MOTIFS[pattern];
  const offset = rng() * Math.PI * 2;
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = offset + (i / count) * Math.PI * 2;
    d += shape(C + 42.6 * Math.cos(a), C + 42.6 * Math.sin(a), a + Math.PI / 2, i);
  }
  return d;
}

/** The dish type, from words in the id. */
export function foodKind(id: string): FoodKind {
  if (/soup|shorba|stew|marga|curry|tashreeb|chorba|harira|dal\b|-dal|broth/.test(id)) return 'bowl';
  if (/salad|tabbouleh|fattoush|slaw|greens/.test(id)) return 'salad';
  if (/egg|shakshuka|omelet|frittata|kuku|eggah/.test(id)) return 'egg';
  if (/yogurt|labneh|porridge|oat|dip|hummus|borani|muhammara|baba|smoothie|pudding|cup/.test(id)) return 'cream';
  return 'bed';
}

/** Points scattered in a disc of radius `r` (never on the exact centre line, for a hand-placed look). */
function scatter(rng: Rng, n: number, r: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const d = r * Math.sqrt(0.15 + 0.85 * rng());
    out.push([C + d * Math.cos(a), C + d * Math.sin(a)]);
  }
  return out;
}

function herbs(rng: Rng, n: number, r: number): PlateShape[] {
  const green = pick(GREEN, rng);
  return scatter(rng, n, r).map(([x, y]) => ({ d: leaf(x, y, rng() * Math.PI, 4.4 + rng() * 2.8), fill: green }));
}

/** Glazes for bowls (a creamy dish in a coloured bowl reads better than cream on cream). */
const GLAZE = ['#2F5D8A', '#A64A24', '#5E6B2C', '#B07A1E'];

/** A drizzle (tahini, yogurt) waving across the food at angle `a`: a smooth quadratic wave. */
function drizzle(a: number, len: number, rng: Rng): string {
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const at = (t: number, off: number): string => `${r1(C + t * cos - off * sin)} ${r1(C + t * sin + off * cos)}`;
  const waves = 4;
  const step = len / waves;
  const amp = 2.5 + rng() * 1.5;
  let d = `M${at(-len / 2, 0)}Q${at(-len / 2 + step / 2, amp * 2)} ${at(-len / 2 + step, 0)}`;
  for (let i = 2; i <= waves; i++) d += `T${at(-len / 2 + step * i, 0)}`;
  return d;
}

/** A dollop (yogurt, labneh) off-centre. */
function dollop(rng: Rng, dist: number, r: number): PlateShape[] {
  const a = rng() * Math.PI * 2;
  const x = C + dist * Math.cos(a);
  const y = C + dist * Math.sin(a);
  return [
    { d: blob(x, y, r, 0.18, rng, 7), fill: pick(CREAM, rng) },
    { d: circle(x - r * 0.3, y - r * 0.3, r * 0.28), fill: '#FFFFFF', opacity: 0.7 },
  ];
}

function food(kind: FoodKind, rng: Rng): PlateShape[] {
  const out: PlateShape[] = [];
  switch (kind) {
    case 'bowl': {
      // A soup or stew filling the well, with pieces, a dollop of yogurt to one side and herbs.
      out.push({ d: circle(C, C, 31), fill: pick(STEW, rng) });
      out.push({ d: circle(C - 2, C - 2, 27), fill: '#FFF', opacity: 0.08 });
      for (const [x, y] of scatter(rng, 7 + Math.floor(rng() * 5), 22)) out.push({ d: blob(x, y, 2.2 + rng() * 2.2, 0.25, rng, 6), fill: pick(CHUNK, rng) });
      out.push(...dollop(rng, 12, 5.5));
      out.push(...herbs(rng, 4 + Math.floor(rng() * 3), 22));
      break;
    }
    case 'salad': {
      out.push({ d: blob(C, C, 29, 0.06, rng, 9), fill: '#E3EACB' });
      for (const [x, y] of scatter(rng, 22 + Math.floor(rng() * 6), 25)) out.push({ d: leaf(x, y, rng() * Math.PI, 9 + rng() * 6), fill: pick(GREEN, rng) });
      for (const [x, y] of scatter(rng, 6 + Math.floor(rng() * 4), 23)) out.push({ d: circle(x, y, 2.2 + rng() * 1.8), fill: pick(DOTS, rng) });
      break;
    }
    case 'cream': {
      out.push({ d: circle(C, C, 31), fill: pick(GLAZE, rng) });
      out.push({ d: blob(C, C, 26, 0.05, rng, 9), fill: pick(CREAM, rng) });
      const a = rng() * Math.PI * 2;
      out.push({ d: blob(C + 6 * Math.cos(a), C + 6 * Math.sin(a), 8, 0.2, rng, 7), fill: pick(['#C9A13A', '#8C8A2E', '#B8742E'], rng), opacity: 0.9 });
      for (const [x, y] of scatter(rng, 7 + Math.floor(rng() * 5), 21)) out.push({ d: circle(x, y, 1.6 + rng() * 1.6), fill: pick(DOTS, rng) });
      out.push(...herbs(rng, 3 + Math.floor(rng() * 2), 19));
      break;
    }
    case 'egg': {
      out.push({ d: blob(C, C, 29, 0.05, rng, 9), fill: pick(['#B84A2A', '#7C8A3A', '#C9772F'], rng) });
      const eggs = 1 + Math.floor(rng() * 3);
      const spots = eggs === 1 ? [[C + (rng() - 0.5) * 4, C + (rng() - 0.5) * 4] as [number, number]] : scatter(rng, eggs, 13);
      for (const [x, y] of spots) {
        out.push({ d: blob(x, y, eggs === 1 ? 12 : 9, 0.14, rng, 7), fill: '#FBF7EE' });
        out.push({ d: circle(x + (rng() - 0.5) * 2.4, y + (rng() - 0.5) * 2.4, eggs === 1 ? 4.6 : 3.6), fill: '#E9A92E' });
      }
      out.push(...herbs(rng, 4 + Math.floor(rng() * 3), 24));
      break;
    }
    default: {
      out.push({ d: blob(C, C, 27 + rng() * 3, 0.08, rng, 9), fill: pick(BED, rng) });
      const chunk = pick(DARK_CHUNK, rng);
      for (const [x, y] of scatter(rng, 4 + Math.floor(rng() * 4), 17)) out.push({ d: blob(x, y, 4 + rng() * 2.6, 0.22, rng, 6), fill: chunk });
      if (rng() < 0.6) out.push({ d: drizzle(rng() * Math.PI, 30, rng), stroke: pick(CREAM, rng), strokeWidth: 1.3, opacity: 0.95 });
      out.push(...herbs(rng, 4 + Math.floor(rng() * 4), 23));
    }
  }
  return out;
}

const cache = new Map<string, PlateArt>();

/** The plate for a recipe (cached). */
export function plateArt(id: string, cuisine: Cuisine): PlateArt {
  const key = `${id}|${cuisine}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rng = mulberry32(hashString(key));
  const pattern = RIM_BY_CUISINE[cuisine] ?? 'dash';
  const accent = (1 + (hashString(id, 7) % 4)) as 1 | 2 | 3 | 4;
  const kind = foodKind(id);
  const art: PlateArt = { pattern, accent, rim: rimPath(pattern, rng), kind, food: food(kind, rng) };
  if (cache.size > 500) cache.clear();
  cache.set(key, art);
  return art;
}
