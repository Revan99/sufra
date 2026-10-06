// Display formatting for amounts, times and numbers. English labels by default; every function that emits words
// takes an optional override so the UI can route them through t().
import type { Nutrients, Unit } from '../types.ts';

export interface Amount {
  qty: number;
  unit: Unit;
}

const METRIC: ReadonlySet<Unit> = new Set<Unit>(['g', 'kg', 'ml', 'l']);

/** Units that count whole things; the shopping list shows these as "≈ 3 medium". */
export const COUNT_UNITS: ReadonlySet<Unit> = new Set<Unit>([
  'piece',
  'small',
  'medium',
  'large',
  'clove',
  'slice',
  'can',
  'bunch',
  'stalk',
  'leaf',
  'sprig',
  'handful',
]);

/** Nice fractions as [value, glyph], for cups and other measures (spoons use SPOON_FRACTIONS). */
const FRACTIONS: readonly (readonly [number, string])[] = [
  [0, ''],
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [1 / 2, '½'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [1, ''],
];
/** Counted things (eggs, onions, cloves) only get quarters and halves: "½ onion", not "⅓ onion". */
const COUNT_FRACTIONS: readonly (readonly [number, string])[] = [
  [0, ''],
  [1 / 4, '¼'],
  [1 / 2, '½'],
  [3 / 4, '¾'],
  [1, ''],
];
const HALVES: readonly (readonly [number, string])[] = [
  [0, ''],
  [1 / 2, '½'],
  [1, ''],
];
/** Measuring spoons come in ⅛, ¼, ½ and 1: no thirds for tsp and tbsp ("¾ tsp", not "⅔ tsp"). */
const SPOON_FRACTIONS: readonly (readonly [number, string])[] = [
  [0, ''],
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 2, '½'],
  [3 / 4, '¾'],
  [1, ''],
];

/** Pinches in a teaspoon (a pinch is about 1/16 tsp). */
export const PINCHES_PER_TSP = 16;

const numberFormats = new Map<string, Intl.NumberFormat>();

/** Intl number formatting (cached per locale and precision). Falls back to English for an unknown locale. */
export function formatNumber(n: number, locale = 'en', maxFractionDigits = 0): string {
  if (!Number.isFinite(n)) return '';
  const key = `${locale}|${maxFractionDigits}`;
  let f = numberFormats.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, { maximumFractionDigits: maxFractionDigits });
    } catch {
      f = new Intl.NumberFormat('en', { maximumFractionDigits: maxFractionDigits });
    }
    numberFormats.set(key, f);
  }
  const rounded = Math.round(n * 10 ** maxFractionDigits) / 10 ** maxFractionDigits;
  // Avoid "-0".
  return f.format(rounded === 0 ? 0 : rounded);
}

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

/** Rounds a gram or millilitre amount: 0.1 below 10, whole below 100, 5s below 1000, 10s above. */
function roundMetricSmall(n: number): { value: number; digits: number } {
  if (n < 10) return { value: Math.max(0.1, roundTo(n, 0.1)), digits: 1 };
  if (n < 100) return { value: Math.round(n), digits: 0 };
  if (n < 1000) return { value: roundTo(n, 5), digits: 0 };
  return { value: roundTo(n, 10), digits: 0 };
}

/** Rounds a kilogram or litre amount: 0.05 below 10, 0.1 above. */
function roundMetricLarge(n: number): { value: number; digits: number } {
  if (n < 10) return { value: Math.max(0.05, roundTo(n, 0.05)), digits: 2 };
  return { value: roundTo(n, 0.1), digits: 1 };
}

/** Whole part and the nearest fraction from `table`: 1.5 -> [1, 0.5, '½']; 0.9 -> [1, 0, ''] (with FRACTIONS). */
function splitFraction(qty: number, table: readonly (readonly [number, string])[]): [number, number, string] {
  const whole = Math.floor(qty);
  const frac = qty - whole;
  let best = table[0] as readonly [number, string];
  for (const f of table) if (Math.abs(frac - f[0]) < Math.abs(frac - best[0]) - 1e-9) best = f;
  return best[0] === 1 ? [whole + 1, 0, ''] : [whole, best[0], best[1]];
}

function fractionTable(unit: Unit | undefined, qty: number): readonly (readonly [number, string])[] {
  if (unit === 'tsp' || unit === 'tbsp') return SPOON_FRACTIONS;
  if (unit === 'pinch' || unit === 'handful') return HALVES;
  if (unit && COUNT_UNITS.has(unit)) return qty < 3 ? COUNT_FRACTIONS : HALVES;
  return FRACTIONS;
}

/**
 * The displayed value of a quantity for `unit` (what formatQty shows, as a number): metric amounts rounded to a
 * sensible step, other units to nice fractions below 10 and whole numbers from 10. Positive stays positive.
 */
export function displayQty(qty: number, unit?: Unit): number {
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  if (unit && METRIC.has(unit)) return (unit === 'kg' || unit === 'l' ? roundMetricLarge(qty) : roundMetricSmall(qty)).value;
  if (qty >= 10) return Math.round(qty);
  const table = fractionTable(unit, qty);
  const [whole, frac] = splitFraction(qty, table);
  const value = whole + frac;
  return value > 0 ? value : ((table[1] as readonly [number, string])[0] as number);
}

/**
 * A quantity for display. Metric units get decimal rounding (2.5 g, 150 g, 1.25 kg); cups get nice fractions below
 * 10 (1½, ⅓, 2¾), spoons the ones measuring spoons have (⅛, ¼, ½, ¾), pinches and handfuls halves; counted things
 * get quarters and halves ("½", "1¼", "3½"); everything is a whole number from 10. A positive amount never shows
 * as 0.
 */
export function formatQty(qty: number, unit?: Unit, locale = 'en'): string {
  if (!Number.isFinite(qty) || qty <= 0) return formatNumber(0, locale);
  if (unit && METRIC.has(unit)) {
    const { value, digits } = unit === 'kg' || unit === 'l' ? roundMetricLarge(qty) : roundMetricSmall(qty);
    return formatNumber(value, locale, digits);
  }
  if (qty >= 10) return formatNumber(Math.round(qty), locale);
  const table = fractionTable(unit, qty);
  const [whole, frac, glyph] = splitFraction(qty, table);
  if (whole === 0 && frac === 0) return (table[1] as readonly [number, string])[1];
  if (whole === 0) return glyph;
  return `${formatNumber(whole, locale)}${glyph}`;
}

/** English unit labels as [singular, plural]. Size words and spoons don't pluralize; 'piece' is a bare count. */
export const UNIT_LABELS: Readonly<Record<Unit, readonly [string, string]>> = {
  g: ['g', 'g'],
  kg: ['kg', 'kg'],
  ml: ['ml', 'ml'],
  l: ['l', 'l'],
  tsp: ['tsp', 'tsp'],
  tbsp: ['tbsp', 'tbsp'],
  cup: ['cup', 'cups'],
  pinch: ['pinch', 'pinches'],
  clove: ['clove', 'cloves'],
  slice: ['slice', 'slices'],
  piece: ['', ''],
  small: ['small', 'small'],
  medium: ['medium', 'medium'],
  large: ['large', 'large'],
  bunch: ['bunch', 'bunches'],
  sprig: ['sprig', 'sprigs'],
  handful: ['handful', 'handfuls'],
  can: ['can', 'cans'],
  stalk: ['stalk', 'stalks'],
  leaf: ['leaf', 'leaves'],
  'to-taste': ['to taste', 'to taste'],
};

export interface FormatAmountOptions {
  locale?: string;
  /** Override for unit words, e.g. to translate them. Receives the unit and the displayed quantity. */
  unitLabel?: (unit: Unit, qty: number) => string;
}

function defaultUnitLabel(unit: Unit, qty: number): string {
  const [one, many] = UNIT_LABELS[unit];
  return qty > 1 ? many : one;
}

/**
 * Human amount: "1½ tbsp", "2 medium", "150 g", "1.2 kg", "3" (piece is a bare count), "to taste". Metric
 * amounts switch between g and kg (ml and l) at 1000. Pass the recipe's qty/unit, or the result of scaleAmount.
 */
export function formatAmount(qty: number, unit: Unit, opts: FormatAmountOptions = {}): string {
  const label = opts.unitLabel ?? defaultUnitLabel;
  if (unit === 'to-taste') return label('to-taste', 0);
  let a: Amount = METRIC.has(unit) ? normalizeAmount({ qty, unit }) : { qty, unit };
  // 999.8 g would round to "1,000 g": show "1 kg".
  if ((a.unit === 'g' || a.unit === 'ml') && displayQty(a.qty, a.unit) >= 1000) a = { qty: a.qty / 1000, unit: a.unit === 'g' ? 'kg' : 'l' };
  const text = formatQty(a.qty, a.unit, opts.locale);
  const word = label(a.unit, displayQty(a.qty, a.unit));
  return word ? `${text} ${word}` : text;
}

function isNiceFraction(q: number): boolean {
  return Math.abs(q - Math.round(q * 4) / 4) < 0.01 || Math.abs(q - Math.round(q * 3) / 3) < 0.01;
}

/** True when `n` is a whole or half number (with a little slack). */
function isHalfStep(n: number): boolean {
  return Math.abs(n * 2 - Math.round(n * 2)) < 0.02;
}

/**
 * Picks the friendliest unit for an amount: g <-> kg and ml <-> l at 1000; tsp -> tbsp from 3 tsp when it comes
 * out in halves (always from 12 tsp), so "4 tsp" rather than "1⅓ tbsp"; tbsp -> tsp below 1 tbsp or when the tsp
 * are whole and the tbsp aren't halves; tbsp -> cup from 4 tbsp when the cups are a clean quarter or third (always
 * from 16 tbsp); under ¼ cup -> tbsp; pinches -> tsp from 8 pinches (½ tsp) and tsp -> pinches under ⅛ tsp. Things
 * too small to split round up a little: at least 1 pinch, 1 leaf (whole leaves), ½ handful.
 */
export function normalizeAmount(amount: Amount): Amount {
  const { qty, unit } = amount;
  if (!Number.isFinite(qty) || qty <= 0) return amount;
  switch (unit) {
    case 'pinch':
      if (qty >= 8 - 1e-9) return normalizeAmount({ qty: qty / PINCHES_PER_TSP, unit: 'tsp' });
      return qty < 1 ? { qty: 1, unit } : amount;
    case 'leaf':
      return { qty: Math.max(1, Math.round(qty)), unit };
    case 'handful':
      return qty < 0.5 ? { qty: 0.5, unit } : amount;
    case 'g':
      return qty >= 1000 ? { qty: qty / 1000, unit: 'kg' } : amount;
    case 'kg':
      return qty < 1 ? { qty: qty * 1000, unit: 'g' } : amount;
    case 'ml':
      return qty >= 1000 ? { qty: qty / 1000, unit: 'l' } : amount;
    case 'l':
      return qty < 1 ? { qty: qty * 1000, unit: 'ml' } : amount;
    case 'tsp': {
      if (qty < 1 / 8 - 1e-9) return { qty: Math.max(1, Math.round(qty * PINCHES_PER_TSP)), unit: 'pinch' };
      const tbsp = qty / 3;
      return qty >= 12 - 1e-9 || (qty >= 3 - 1e-9 && isHalfStep(tbsp)) ? normalizeAmount({ qty: tbsp, unit: 'tbsp' }) : amount;
    }
    case 'tbsp': {
      if (qty < 1 - 1e-9) return normalizeAmount({ qty: qty * 3, unit: 'tsp' });
      // 1⅓ tbsp reads better as 4 tsp.
      if (qty < 4 - 1e-9 && !isHalfStep(qty) && Math.abs(qty * 3 - Math.round(qty * 3)) < 0.02) return { qty: Math.round(qty * 3), unit: 'tsp' };
      const cups = qty / 16;
      return qty >= 16 - 1e-9 || (qty >= 4 - 1e-9 && isNiceFraction(cups)) ? { qty: cups, unit: 'cup' } : amount;
    }
    case 'cup':
      return qty < 0.25 - 1e-9 ? normalizeAmount({ qty: qty * 16, unit: 'tbsp' }) : amount;
    default:
      return amount;
  }
}

/**
 * Scales a display amount by `factor` (a servings change) and switches to a friendlier unit when it grows or
 * shrinks (see normalizeAmount). 'to-taste' stays as is; a bad factor counts as 1.
 */
export function scaleAmount(amount: Amount, factor: number): Amount {
  const { unit } = amount;
  if (unit === 'to-taste') return { qty: 0, unit };
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return normalizeAmount({ qty: amount.qty * f, unit });
}

/** Grams for display: "150 g", "1.25 kg" (from 1000 g). */
export function formatGrams(grams: number, locale = 'en'): string {
  return formatAmount(grams, 'g', { locale });
}

export interface DurationLabels {
  hours: string;
  minutes: string;
}

/** "45 min", "1 h 15 min", "2 h". Rounds to whole minutes; negative or NaN counts as 0. */
export function formatMinutes(total: number, labels: DurationLabels = { hours: 'h', minutes: 'min' }, locale = 'en'): string {
  const m = Number.isFinite(total) && total > 0 ? Math.round(total) : 0;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${formatNumber(rest, locale)} ${labels.minutes}`;
  if (rest === 0) return `${formatNumber(h, locale)} ${labels.hours}`;
  return `${formatNumber(h, locale)} ${labels.hours} ${formatNumber(rest, locale)} ${labels.minutes}`;
}

/** Unit suffix for each nutrient. */
export const NUTRIENT_UNITS: Readonly<Record<keyof Nutrients, string>> = {
  kcal: 'kcal',
  protein: 'g',
  carbs: 'g',
  fiber: 'g',
  sugars: 'g',
  fat: 'g',
  satFat: 'g',
  sodium: 'mg',
};

/** "450 kcal", "32 g", "4.5 g", "620 mg". kcal and sodium are whole; grams get one decimal below 10. */
export function formatNutrient(key: keyof Nutrients, value: number, locale = 'en'): string {
  const whole = key === 'kcal' || key === 'sodium' || Math.abs(value) >= 10;
  return `${formatNumber(value, locale, whole ? 0 : 1)} ${NUTRIENT_UNITS[key]}`;
}

/** "85%" from a ratio (0.85), in the locale's style. */
export function formatPercent(ratio: number, locale = 'en'): string {
  if (!Number.isFinite(ratio)) return '';
  try {
    return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(ratio);
  } catch {
    return `${Math.round(ratio * 100)}%`;
  }
}
