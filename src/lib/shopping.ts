// Shopping list for a range of planned days.
import type { Aisle, CatalogRecipe, DayPlan, Unit, WeekStart } from '../types.ts';
import { AISLES } from '../types.ts';
import type { IngredientIndex } from './nutrition.ts';
import { COUNT_UNITS, formatAmount } from './format.ts';
import { addDays, dateRange, diffDays, startOfWeek } from './dates.ts';
import type { ISODate } from './dates.ts';

export interface ShoppingItem {
  /**
   * The line's ingredient id (the key for its checkmark). When variants of one product are merged into the line
   * (90% and 95% lean ground beef), the group's first id in the whole ingredient index, so it doesn't change with
   * the week's recipes.
   */
  ingredientId: string;
  /** Every ingredient id merged into this line, sorted. */
  ingredientIds: string[];
  name: string;
  aisle: Aisle;
  /** Total grams for the household over the range (exact; `amount` rounds it up to what you can buy). */
  grams: number;
  /**
   * What to buy, formatted with the ShoppingFormatOptions given to buildShoppingList: grams rounded up to a
   * buyable step ("150 g", "1.2 kg"), or the count for things bought by count ("14 large" eggs, "3 cans",
   * "2 bunches" of herbs; see `countFirst`).
   */
  amount: string;
  /** Whole-item count: every use counted in the same unit ({ qty: 3, unit: 'medium' }), or bunches of fresh herbs. */
  count?: { qty: number; unit: Unit };
  /** The other amount: "≈ 3 medium", "≈ 2 cloves", "≈ 4" (pieces) after grams, or "≈ 700 g" after a count. */
  countHint?: string;
  /** True when `amount` is the count and `countHint` the grams: eggs, cans, breads and pieces, herbs by the bunch. */
  countFirst: boolean;
  /** Recipes that use it, for "what is this for?". */
  recipeIds: string[];
  /** Spices, salt, oils, vinegars, leaveners and small amounts of sweeteners and sauces: the "pantry staples". */
  staple: boolean;
}

export interface ShoppingGroup {
  aisle: Aisle;
  items: ShoppingItem[];
}

export interface ShoppingList {
  /** Non-staple items by aisle, in AISLES order, items sorted by name. Empty aisles are left out. */
  groups: ShoppingGroup[];
  /** Pantry staples (see isStaple), sorted by name. */
  staples: ShoppingItem[];
  /** Number of items in groups and staples. */
  itemCount: number;
}

/** English aisle labels (the UI may translate via t()). */
export const AISLE_LABELS: Readonly<Record<Aisle, string>> = {
  produce: 'Produce',
  herbs: 'Fresh herbs',
  'meat-poultry': 'Meat and poultry',
  seafood: 'Fish and seafood',
  'dairy-eggs': 'Dairy and eggs',
  'bakery-grains': 'Bread and grains',
  legumes: 'Legumes',
  'nuts-seeds': 'Nuts and seeds',
  'oils-vinegars': 'Oils and vinegars',
  spices: 'Spices',
  'condiments-sauces': 'Condiments and sauces',
  'canned-jarred': 'Canned and jarred',
  frozen: 'Frozen',
  'baking-sweeteners': 'Baking and sweeteners',
  other: 'Other',
};

const STAPLE_AISLES: ReadonlySet<Aisle> = new Set<Aisle>(['spices', 'oils-vinegars']);
const SALT_RE = /(^|-)salt($|-)/;
const LEAVENER_RE = /(^|-)(yeast|baking-powder|baking-soda|bicarbonate)($|-)/;
/** Aisles whose small amounts (under SMALL_STAPLE_G for the whole list) are pantry staples: a spoon of sugar or mustard. */
const SMALL_STAPLE_AISLES: ReadonlySet<Aisle> = new Set<Aisle>(['baking-sweeteners', 'condiments-sauces']);
export const SMALL_STAPLE_G = 30;
/** Grams in a bunch of fresh herbs (a bunch of parsley or dill gives about a cup, chopped). */
export const HERB_BUNCH_G = 60;
/** Grams in an egg (one large egg), to count eggs weighed in mixed units. */
export const EGG_G = 50;
/** Units bought by count: the list leads with the count ("3 cans", "6" pitas). Eggs too, in any count unit. */
const COUNT_FIRST_UNITS: ReadonlySet<Unit> = new Set<Unit>(['piece', 'can', 'slice', 'bunch']);

const WATER_ID_RE = /^water(-(tap|cold|hot|warm|boiling|ice|iced|filtered|drinking))?$/;

/** Water is never bought ('water', 'water-boiling'...; not 'watermelon' or 'water-chestnut'). */
export function isWater(ingredientId: string, name?: string): boolean {
  return WATER_ID_RE.test(ingredientId) || (!!name && /^water$/i.test(name.trim()));
}

/**
 * Pantry staples: spices, salt, oils, vinegars and leaveners always; with the list's total `grams`, also small
 * amounts (under SMALL_STAPLE_G) of sweeteners, baking goods and sauces.
 */
export function isStaple(ingredientId: string, aisle: Aisle, grams?: number): boolean {
  if (STAPLE_AISLES.has(aisle) || SALT_RE.test(ingredientId) || LEAVENER_RE.test(ingredientId)) return true;
  return grams !== undefined && SMALL_STAPLE_AISLES.has(aisle) && grams < SMALL_STAPLE_G;
}

/**
 * Grams rounded up to what a shop can sell: 5 g steps under 50 g, 10 g under 250 g, 50 g under 1 kg, 100 g from
 * 1 kg (so "1.4 kg", never "6.3 g"). A pantry staple (`staple`) is only checked, not bought by weight, so under
 * 50 g it rounds up to whole grams, or to 0.1 g under 1 g (saffron, yeast). 0 stays 0.
 */
export function buyableGrams(grams: number, staple = false): number {
  if (!(grams > 0)) return 0;
  const step = staple && grams < 50 ? (grams < 1 ? 0.1 : 1) : grams < 50 ? 5 : grams < 250 ? 10 : grams < 1000 ? 50 : 100;
  return Math.round(Math.ceil(grams / step - 1e-6) * step * 10) / 10;
}

// Qualifiers that name a variant of one product: fat level and salt. "Ground beef, 90% lean (raw)" and "Ground
// beef, 95% lean (raw)" are one shopping line; so are "Black beans (canned, drained)" and "Black beans, low-sodium
// (canned, drained)". Greek and plain yogurt stay apart (a different product), as do fresh and canned.
const VARIANT_RE =
  /^(\d+(\.\d+)?% (lean|fat)|\d+(\.\d+)?%|low-fat|lowfat|nonfat|non-fat|fat-free|reduced-fat|part-skim|skim|whole|whole milk|extra-lean|lean|regular|low-sodium|reduced-sodium|no salt added|unsalted|salted)$/;
const LOWER_SALT_RE = /low-sodium|reduced-sodium|no salt added|unsalted/;

/** An ingredient name without its variant qualifiers (fat level, salt), lowercase. */
export function productName(name: string): string {
  let rest = name.trim();
  let paren = '';
  const m = /\s*\(([^()]*)\)\s*$/.exec(rest);
  if (m) {
    rest = rest.slice(0, m.index);
    if (!/^\d+(\.\d+)?%$/.test((m[1] as string).trim())) paren = ` (${(m[1] as string).trim()})`;
  }
  const parts = rest.split(',').map((x) => x.trim()).filter((x) => x && !VARIANT_RE.test(x.toLowerCase()));
  return `${parts.join(', ')}${paren}`.toLowerCase();
}

/** Shopping group of an ingredient: aisle plus product name. Variants of one product share it. */
function groupKey(aisle: Aisle, name: string): string {
  return `${aisle}|${productName(name)}`;
}

const groupFirstIds = new WeakMap<IngredientIndex, Map<string, string>>();

/** Each group's first ingredient id in the whole index (stable whatever the week's recipes use). */
function firstIds(index: IngredientIndex): Map<string, string> {
  let out = groupFirstIds.get(index);
  if (!out) {
    out = new Map();
    for (const ing of index.values()) {
      const key = groupKey(ing.aisle, ing.name);
      const cur = out.get(key);
      if (cur === undefined || ing.id < cur) out.set(key, ing.id);
    }
    groupFirstIds.set(index, out);
  }
  return out;
}

function prettyId(id: string): string {
  const s = id.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function clampHousehold(n: number): number {
  return Number.isFinite(n) ? Math.min(8, Math.max(1, Math.round(n))) : 1;
}

/** How amounts and unit words are written. Defaults: English ('en') numbers and UNIT_LABELS words. */
export interface ShoppingFormatOptions {
  /** Locale for numbers ("1,5 kg" in 'de'). */
  locale?: string;
  /** Unit words, e.g. routed through t(). Receives the unit and the displayed quantity (for plurals). */
  unitLabel?: (unit: Unit, qty: number) => string;
}

type AmountParts = Pick<ShoppingItem, 'grams'> & Partial<Pick<ShoppingItem, 'count' | 'countFirst' | 'staple'>>;

/**
 * An item's amount: the count for things bought by count ("14 large", "3 cans"), else grams rounded up to a
 * buyable step ("150 g", "1.2 kg"; see buyableGrams).
 */
export function itemAmount(item: AmountParts, opts: ShoppingFormatOptions = {}): string {
  if (item.countFirst && item.count) return formatAmount(item.count.qty, item.count.unit, opts);
  return formatAmount(buyableGrams(item.grams, item.staple), 'g', opts);
}

/** An item's other amount: "≈ 3 medium" after grams, "≈ 700 g" after a count, or undefined when it has no count. */
export function itemCountHint(item: Pick<ShoppingItem, 'count'> & Partial<AmountParts>, opts: ShoppingFormatOptions = {}): string | undefined {
  if (!item.count) return undefined;
  if (item.countFirst && item.grams !== undefined) return `≈ ${formatAmount(buyableGrams(item.grams, item.staple), 'g', opts)}`;
  return `≈ ${formatAmount(item.count.qty, item.count.unit, opts)}`;
}

interface Acc {
  ids: Map<string, number>;
  grams: number;
  units: Set<Unit>;
  count: number;
  recipeIds: Set<string>;
}

/**
 * Aggregates the ingredients of every meal in `days`. Amount per line = recipe grams x portion / servings x
 * householdSize, merged by product (variants like 90% and 95% lean ground beef share a line). Water is skipped;
 * unknown recipes are ignored. `format` sets the locale and unit words of the `amount` and `countHint` strings
 * (English by default).
 */
export function buildShoppingList(
  days: readonly DayPlan[],
  catalogById: ReadonlyMap<string, CatalogRecipe>,
  ingredientIndex: IngredientIndex,
  householdSize: number,
  format: ShoppingFormatOptions = {},
): ShoppingList {
  const people = clampHousehold(householdSize);
  const first = firstIds(ingredientIndex);
  const acc = new Map<string, Acc>();
  for (const day of days) {
    for (const meal of day.meals) {
      const recipe = catalogById.get(meal.recipeId);
      if (!recipe || !(recipe.servings > 0)) continue;
      const factor = ((Number.isFinite(meal.portion) ? meal.portion : 1) / recipe.servings) * people;
      for (const ri of recipe.ingredients) {
        const ing = ingredientIndex.get(ri.ingredientId);
        if (isWater(ri.ingredientId, ing?.name)) continue;
        const key = ing ? (first.get(groupKey(ing.aisle, ing.name)) ?? ri.ingredientId) : ri.ingredientId;
        let a = acc.get(key);
        if (!a) {
          a = { ids: new Map(), grams: 0, units: new Set(), count: 0, recipeIds: new Set() };
          acc.set(key, a);
        }
        const g = ri.grams * factor;
        a.ids.set(ri.ingredientId, (a.ids.get(ri.ingredientId) ?? 0) + g);
        a.grams += g;
        a.units.add(ri.unit);
        a.count += ri.qty * factor;
        a.recipeIds.add(recipe.id);
      }
    }
  }

  const byAisle = new Map<Aisle, ShoppingItem[]>();
  const staples: ShoppingItem[] = [];
  for (const [key, a] of acc) {
    const ids = [...a.ids.keys()].sort();
    // The line's name: the lower-salt variant when there is one, else the one it needs most of.
    const main = [...a.ids.entries()].sort(
      (x, y) =>
        Number(LOWER_SALT_RE.test(ingredientIndex.get(y[0])?.name ?? '')) - Number(LOWER_SALT_RE.test(ingredientIndex.get(x[0])?.name ?? '')) ||
        y[1] - x[1] ||
        (x[0] < y[0] ? -1 : 1),
    )[0]?.[0] as string;
    const ing = ingredientIndex.get(main);
    const aisle: Aisle = ing?.aisle ?? 'other';
    const item: ShoppingItem = {
      ingredientId: key,
      ingredientIds: ids,
      name: ing?.name ?? prettyId(main),
      aisle,
      grams: a.grams,
      amount: '',
      recipeIds: [...a.recipeIds].sort(),
      countFirst: false,
      staple: ids.some((id) => isStaple(id, aisle, a.grams)),
    };
    const only = a.units.size === 1 ? [...a.units][0] : undefined;
    if (aisle === 'herbs') {
      // Fresh herbs come in bunches.
      item.count = { qty: Math.max(1, Math.ceil(a.grams / HERB_BUNCH_G - 0.05)), unit: 'bunch' };
      item.countFirst = true;
    } else if (only && COUNT_UNITS.has(only) && a.count > 0) {
      // Round up to whole items (with a little slack for floating point), at least 1.
      item.count = { qty: Math.max(1, Math.ceil(a.count - 0.05)), unit: only };
      item.countFirst = COUNT_FIRST_UNITS.has(only) || ing?.animal === 'egg';
    } else if (ing?.animal === 'egg') {
      // Eggs are bought by count even when recipes weigh them in different units.
      item.count = { qty: Math.max(1, Math.ceil(a.grams / EGG_G - 0.05)), unit: 'piece' };
      item.countFirst = true;
    }
    item.amount = itemAmount(item, format);
    const hint = itemCountHint(item, format);
    if (hint) item.countHint = hint;
    if (item.staple) staples.push(item);
    else byAisle.set(aisle, [...(byAisle.get(aisle) ?? []), item]);
  }
  const byName = (x: ShoppingItem, y: ShoppingItem) => x.name.localeCompare(y.name, 'en') || (x.ingredientId < y.ingredientId ? -1 : 1);
  const groups: ShoppingGroup[] = AISLES.filter((aisle) => byAisle.has(aisle)).map((aisle) => ({
    aisle,
    items: (byAisle.get(aisle) ?? []).sort(byName),
  }));
  staples.sort(byName);
  return { groups, staples, itemCount: groups.reduce((n, g) => n + g.items.length, 0) + staples.length };
}

export type ShoppingRange = 'today' | 'next3' | 'week';

/** 'week' rolls over to the next week when fewer than this many days of the current week are left. */
export const WEEK_ROLLOVER_DAYS = 3;

/**
 * Dates a shopping range covers: today; today and the next 2 days; or today through the end of the current week
 * (days already past are left out). In the week's last WEEK_ROLLOVER_DAYS - 1 days (Thursday and Friday with a
 * Saturday start) 'week' runs through the end of next week instead, so it is never shorter than 'next3' and on
 * the eve of the weekly shop it covers the week being shopped for.
 */
export function shoppingDates(range: ShoppingRange, today: ISODate, weekStart: WeekStart): ISODate[] {
  if (range === 'today') return [today];
  if (range === 'next3') return dateRange(today, 3);
  let end = addDays(startOfWeek(today, weekStart), 6);
  if (diffDays(today, end) + 1 < WEEK_ROLLOVER_DAYS) end = addDays(end, 7);
  return dateRange(today, diffDays(today, end) + 1);
}

/** Every word of the shared text can be replaced (for t()); English defaults. */
export interface PlainTextOptions extends ShoppingFormatOptions {
  /** First line. Default 'Shopping list'. */
  title?: string;
  aisleLabel?: (aisle: Aisle) => string;
  /** Heading of the pantry staples block. Default 'Pantry staples'. */
  staplesLabel?: string;
  /** An item's display name, e.g. translated. Default: the ingredient name. */
  itemName?: (item: ShoppingItem) => string;
  /** One line of the list from its parts. Default: "- Onion: 110 g (≈ 1 medium)", "- Egg: 14 large (≈ 700 g)". */
  formatLine?: (parts: { name: string; amount: string; countHint?: string; item: ShoppingItem }) => string;
  /** Ingredient ids to leave out (e.g. already checked off). */
  skip?: ReadonlySet<string> | readonly string[];
}

function defaultLine({ name, amount, countHint }: { name: string; amount: string; countHint?: string }): string {
  return `- ${name}: ${amount}${countHint ? ` (${countHint})` : ''}`;
}

/**
 * The list as plain text for copy or share: a title, then "Aisle" headings with "- Name: amount (≈ 3 medium)" lines.
 * Amounts are formatted here from each item's grams and count with `opts` (locale, unit words), not taken from
 * the prebuilt English strings, so the whole text can be translated.
 */
export function toPlainText(list: ShoppingList, opts: PlainTextOptions = {}): string {
  const skip = new Set(opts.skip ?? []);
  const label = opts.aisleLabel ?? ((a: Aisle) => AISLE_LABELS[a]);
  const name = opts.itemName ?? ((i: ShoppingItem) => i.name);
  const format = opts.formatLine ?? defaultLine;
  const line = (i: ShoppingItem) => {
    const countHint = itemCountHint(i, opts);
    return format(countHint ? { name: name(i), amount: itemAmount(i, opts), countHint, item: i } : { name: name(i), amount: itemAmount(i, opts), item: i });
  };
  const blocks: string[] = [];
  for (const g of list.groups) {
    const items = g.items.filter((i) => !skip.has(i.ingredientId));
    if (items.length) blocks.push([label(g.aisle), ...items.map(line)].join('\n'));
  }
  const staples = list.staples.filter((i) => !skip.has(i.ingredientId));
  if (staples.length) blocks.push([opts.staplesLabel ?? 'Pantry staples', ...staples.map(line)].join('\n'));
  const title = opts.title ?? 'Shopping list';
  return [title, ...blocks].join('\n\n') + '\n';
}
