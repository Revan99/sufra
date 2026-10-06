// The daily meal planner. Pure and deterministic: a plan is a function of (date, profile, catalog, favorites,
// overrides) and nothing else. SPEC.md "Planner" lists the requirements; R1...R9 below refer to them.
//
// Lanes
// -----
// A day has 3-5 "lanes": breakfast, lunch, dinner and 0-2 snacks, each with its share of the day's energy
// (targets.ts, R4). k is the number of lanes of a slot: 1, or 2 for two snacks.
//
// Slot modes, by n = recipes the profile may eat in the slot (filters.ts, R2)
// ---------------------------------------------------------------------------
//  greedy    n ≥ 12k + 5    Chosen day by day from a short least-recently-used window, scored for kcal fit (to what
//                           the day's known meals leave), protein (the density the rest of the day needs, so it
//                           weighs more when the day is behind), cuisine and main-protein variety, legume mains for
//                           omnivores and pescatarians, sodium against the day's budget, red meat against a weekly
//                           limit and oily fish once a week (R3, R4). A recipe used in the slot in the last 6 days is
//                           never a candidate. Each greedy slot draws on every recipe it may serve that rotation
//                           slots don't own; one served anywhere goes to the back of every queue, except a favorite,
//                           which goes a third of the way back and, when due again, gets a small bonus (R5).
//  rotation  7k ≤ n < 12k+5 A fixed table of `period` ≥ 7 rows walked by day number (row = day mod period). A cell
//                           holds one recipe, or a short list that takes turns cycle by cycle, so a recipe comes
//                           back every period (or a multiple of it) days, across any week, epoch or year boundary.
//                           A day may depart from the table only to repair its kcal or protein (below).
//  small     n < 7k         No 7-day promise is possible, so repeats are spread as far apart as possible: each day
//                           takes its row of a table of period ⌊n/k⌋ (the widest spacing the pool allows). It departs
//                           only when that recipe is already on the day, or puts the kcal band out of reach while a
//                           recipe not served the day before or after would not, taking the recipe whose nearest
//                           other use in the slot is farthest away.
//  empty     n = 0          Every lane of the slot goes to DayPlan.unfilled (R8).
//
// Days are simulated in 28-day epochs aligned on the day number, so any date needs a bounded amount of work and no
// recursion. The last 6 days of an epoch (its "tail") are simulated on their own first. The other 22 days start
// from the previous epoch's tail as history and also see the coming tail, and never take a recipe that the tail
// uses in the same slot within 7 days. That covers every pair of days less than 7 apart: inside a part the history
// does, across the start of a middle the previous tail does, across the end the lookahead does, and two middles are
// 7 days apart. A greedy candidate always exists: at most 6k recipes were used in the slot in the last 6 days, 6k
// are reserved by the tail, and 4 are on the day's other meals.
//
// Same-day uniqueness (R3) across slots: rotation slots own every recipe any of them may serve (split so their
// periods come out even). When each keeps ≥ 7k recipes their tables are disjoint. Otherwise the rotation slots
// that share recipes are built together with one common period: a shared recipe goes in a different row in each
// slot (bipartite matching), so they never meet on a day and each keeps its 7-day spacing. Greedy and small slots
// and repairs skip anything already on the day. A final pass drops any duplicate, so a generated day never repeats
// a recipe.
//
// Balance (R4), in three layers:
// 1. Portions: planner-balance.ts picks from {0.5 ... 2} to land the day within ±10% of the kcal target and reach
//    90% of the protein target whenever the day's recipes allow it (exactly: balancePortions reaches exactTier).
// 2. Picks keep that reachable. Rotation tables leave out recipes no portion can fit. Each simulated meal ranks its
//    candidates first by the best tier the day can still reach with it (0 kcal out of reach, 1 kcal only, 2 kcal
//    and protein), counting the day's later meals at what they may really take that day (their recipes not used in
//    the slot within 6 days, not reserved by the tail, not on the day), and only then by score. When nothing in
//    the window reaches the best tier, the first allowed recipe past it that does joins the candidates.
// 3. Repair: when the finished day still can't reach tier 2, one meal of a greedy or rotation slot is swapped for
//    any recipe the profile may eat there that keeps every rule (not on the day, not used in the slot within 6
//    days either side; for a rotation slot, not due from its table on a day within 6 days that isn't planned yet)
//    and raises the day's exact tier: the best-scoring such swap, twice at most. So a day misses the kcal band (or
//    the protein floor) only when no rule-keeping single swap would fix it, short of one taking a recipe a
//    rotation table schedules on a nearby day not planned yet (that day will serve it; see tableRecipes). Small
//    slots are never repaired: their spacing comes first.
// Overrides (R6) replace or add meals last; other meals keep their recipe and portion.
//
// Health (beyond R4): the day's sodium has a soft budget of 2,000 mg (SODIUM_BUDGET). Picks weigh a recipe's sodium
// against what the day's known meals leave, and the portion balancer counts sodium above the budget as a cost once
// kcal lands. Red-meat mains are held to about 600 g raw (about 430 g cooked) over any 7 days and not scaled past
// 1.25 servings once protein is met; a main with oily fish gets a small bonus when none was served in 6 days. All
// of these are scores or costs below the tiers, so they never cost the kcal band or the protein floor.
//
// Stability: the random seed (table orders, queues, tie-breaking jitter) is a constant, and every order is keyed
// on recipe ids (seededOrder), so a setting that leaves the pools alone (excluding an allergen no recipe has)
// changes nothing, and a recipe added to or removed from a pool leaves the others' relative order alone. Changing a
// target keeps the tables and queue orders, and the kcal fit is smooth in the budget, so a small change (±50 kcal,
// ±5 g) moves only a few meals. It still re-plans: greedy choices weigh kcal fit and protein against the new
// targets, one different pick shifts the later days' queues, and a rotation table changes when a recipe starts or
// stops fitting its meal. Favorites never reorder a table or a queue: a favorite only comes back sooner after a
// middle part has served it, so favoriting a recipe changes no day of an epoch up to the first day the epoch
// serves it, and no tail (see epochPicks).
import type { CatalogRecipe, Cuisine, DayPlan, MealOverride, MealSlot, Nutrients, PlannedMeal, Profile } from '../types.ts';
import { MEAL_SLOTS } from '../types.ts';
import type { IngredientIndex } from './nutrition.ts';
import { addNutrients, scaleNutrients, zeroNutrients } from './nutrition.ts';
import { dayNumber, fromDayNumber, isISODate } from './dates.ts';
import { isEligible } from './filters.ts';
import { clampTarget, slotEnergySplit } from './targets.ts';
import type { MealShare } from './targets.ts';
import { hashParts, hashString, mix32 } from './random.ts';
import {
  KCAL_TOLERANCE,
  PORTIONS,
  PROTEIN_FLOOR,
  RED_MEAT_MIN_G,
  RED_MEAT_PORTION,
  SODIUM_BUDGET,
  balancePortions,
  bestPortion,
  exactTier,
  reachableTier,
  snapPortion,
} from './planner-balance.ts';

export { PORTIONS, KCAL_TOLERANCE, PROTEIN_FLOOR, SODIUM_BUDGET, balancePortions, bestPortion, exactTier, reachableTier, snapPortion } from './planner-balance.ts';
export type { BalanceItem, BalanceOptions } from './planner-balance.ts';

export interface PlanContext {
  profile: Profile;
  catalog: readonly CatalogRecipe[];
  /**
   * Favorite recipe ids: a mild preference, never at the cost of variety (R5). A favorite comes back sooner once it
   * has been served, so a new favorite changes no day of the 28-day block before the block next serves it, and no
   * block's last 6 days; it can change later days, and the days after an earlier service in an older block. Passing
   * a snapshot taken when the app opens or the date changes, rather than the live list, still keeps the screen
   * steady while the user taps Favorite.
   */
  favorites?: readonly string[];
  /** The user's manual choices. They win for their date, slot and index. */
  overrides?: readonly MealOverride[];
  /** Optional. Lets the planner tell legume, poultry, meat and fish mains apart exactly; otherwise ids are used. */
  ingredientIndex?: IngredientIndex;
}

/** What a dish is built around, for variety between mains. */
export type ProteinSource = 'meat' | 'poultry' | 'fish' | 'legume' | 'egg' | 'dairy' | 'plant';

export interface SwapCandidate {
  recipe: CatalogRecipe;
  /** Best portion for the meal's kcal budget. */
  portion: number;
  /** kcal and protein at that portion. */
  kcal: number;
  protein: number;
  /** Higher is better. For ordering only. */
  score: number;
}

/** How the planner fills a slot (see the notes at the top of planner.ts). */
export type SlotMode = 'greedy' | 'rotation' | 'small' | 'empty';

export interface SlotInfo {
  slot: MealSlot;
  mealsPerDay: number;
  mode: SlotMode;
  /** Recipes the profile may eat in this slot. */
  eligible: number;
  /** Recipes this slot draws from. */
  pool: string[];
  /** rotation and small: days before the slot's table comes round again (0 otherwise). */
  period: number;
  /** rotation: built together with other rotation slots that share recipes. */
  synced: boolean;
}

// ---------------------------------------------------------------------------------------------------------------
// Constants

/** No recipe comes back in the same slot within this many consecutive days (when the pool allows). */
export const VARIETY_DAYS = 7;
/** Highest meal index an override may use (storage.ts accepts the same range). */
export const MAX_MEAL_INDEX = 4;
/** Days are simulated in blocks ("epochs") of this many days, aligned on the day number (see the notes at the top). */
export const EPOCH_DAYS = 28;
/** The last days of each epoch (its "tail"), simulated first and on their own. */
export const TAIL_DAYS = VARIETY_DAYS - 1;
const MIDDLE_DAYS = EPOCH_DAYS - TAIL_DAYS;
const LOOKAHEAD = 12;
/** The planner's random seed. A constant: plans depend on the pools, never on how a setting was spelled. */
const PLANNER_SEED = 'sufra-planner';
/** Red meat over any 7 days, raw grams (about 430 g cooked, within the WCRF limit of 350-500 g cooked a week). */
export const RED_MEAT_WEEK_G = 600;
/** Oily fish grams per serving from which a meal counts as an oily-fish meal. */
const OILY_FISH_MIN_G = 50;
/** Sodium: the most a recipe's saltiness can cost in a pick (so a waiting recipe still gets its turn). */
const SODIUM_SCORE_CAP = 1.5;
/** Rotation tables skip recipes whose best portion still misses the meal's kcal budget by more than this. */
const FIT_TOLERANCE = 0.35;
const PORTION_MIN = PORTIONS[0] as number;
const PORTION_MAX = PORTIONS[PORTIONS.length - 1] as number;
/** Small slots: distances beyond this many days all count the same. */
const SMALL_DISTANCE_CAP = 60;
const MAX_SETUPS_PER_CATALOG = 8;
const MAX_EPOCHS_PER_SETUP = 16;

/** Smallest pool planned greedily: 6 days back + 6 days ahead + the day's 4 other meals, plus one spare. */
export function greedyMinPool(mealsPerDay: number): number {
  return 2 * (VARIETY_DAYS - 1) * mealsPerDay + 5;
}

/** Smallest pool that can go 7 days without a repeat in the slot. */
export function rotationMinPool(mealsPerDay: number): number {
  return VARIETY_DAYS * mealsPerDay;
}

// ---------------------------------------------------------------------------------------------------------------
// Small helpers

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

function isMain(slot: MealSlot): boolean {
  return slot === 'lunch' || slot === 'dinner';
}

const POULTRY_RE = /chicken|turkey|poultry|duck|quail/;
const FISH_RE = /fish|salmon|tuna|cod|trout|sardine|mackerel|shrimp|prawn|carp|tilapia|bass|anchov|hake|haddock|seafood|squid|mussel/;
const MEAT_RE = /lamb|beef|veal|mutton|goat|meat|kofta|kebab|sujuk|liver/;
const LEGUME_RE = /lentil|chickpea|bean|fava|split-pea|mung|peas-dried|hummus|falafel|tofu|tempeh|edamame/;
const EGG_RE = /(^|-)eggs?($|-)/;
const DAIRY_RE = /yogurt|yoghurt|cheese|milk|labneh|kefir|curd|paneer|ricotta|feta|halloumi|mast/;

/** What a recipe is built around (its heaviest protein ingredient). Uses the ingredient index when given. */
export function proteinSource(recipe: CatalogRecipe, index?: IngredientIndex): ProteinSource {
  const grams: Record<ProteinSource, number> = { meat: 0, poultry: 0, fish: 0, legume: 0, egg: 0, dairy: 0, plant: 0 };
  for (const ri of recipe.ingredients ?? []) {
    const ing = index?.get(ri.ingredientId);
    const id = ri.ingredientId;
    let src: ProteinSource | null = null;
    if (ing) {
      if (ing.animal === 'meat') src = 'meat';
      else if (ing.animal === 'poultry') src = 'poultry';
      else if (ing.animal === 'fish' || ing.animal === 'shellfish') src = 'fish';
      else if (ing.animal === 'egg') src = 'egg';
      else if (ing.animal === 'dairy') src = 'dairy';
      else if (ing.aisle === 'legumes' || LEGUME_RE.test(id)) src = 'legume';
    } else if (POULTRY_RE.test(id)) src = 'poultry';
    else if (FISH_RE.test(id)) src = 'fish';
    else if (MEAT_RE.test(id)) src = 'meat';
    else if (LEGUME_RE.test(id)) src = 'legume';
    else if (EGG_RE.test(id)) src = 'egg';
    else if (DAIRY_RE.test(id)) src = 'dairy';
    if (src) grams[src] += (ri.grams || 0) / Math.max(1, recipe.servings || 1);
  }
  if (recipe.flags?.vegetarian) grams.meat = grams.poultry = grams.fish = 0;
  const animal = (['meat', 'poultry', 'fish'] as const).filter((s) => grams[s] > 0).sort((a, b) => grams[b] - grams[a]);
  if (animal[0]) return animal[0];
  if (grams.legume >= 25) return 'legume';
  if (grams.egg >= 40) return 'egg';
  if (grams.dairy >= 80) return 'dairy';
  return 'plant';
}

const OILY_FISH_RE = /salmon|mackerel|sardine|trout|herring|anchov/;
const COUNTED_BREAD_RE = /tortilla|pita|flatbread|bread|roll|crispbread|rice-cake|lavash|markook/;

/**
 * Per serving: raw red-meat grams, oily-fish grams, and the counts of things served whole (eggs in any count unit,
 * breads counted by the piece or slice). Uses the ingredient index when given, ids otherwise.
 */
function recipeExtras(recipe: CatalogRecipe, index?: IngredientIndex): { redMeat: number; oilyFish: number; counts: number[] } {
  let redMeat = 0;
  let oilyFish = 0;
  const counts: number[] = [];
  const servings = Math.max(1, recipe.servings || 1);
  for (const ri of recipe.ingredients ?? []) {
    const ing = index?.get(ri.ingredientId);
    const id = ri.ingredientId;
    const g = (ri.grams || 0) / servings;
    const meat = ing ? ing.animal === 'meat' : MEAT_RE.test(id) && !POULTRY_RE.test(id) && !FISH_RE.test(id);
    if (meat && !recipe.flags?.vegetarian) redMeat += g;
    if ((ing ? ing.animal === 'fish' : true) && OILY_FISH_RE.test(id)) oilyFish += g;
    const egg = ing ? ing.animal === 'egg' : EGG_RE.test(id);
    const bread = ing ? ing.aisle === 'bakery-grains' && COUNTED_BREAD_RE.test(id) : COUNTED_BREAD_RE.test(id);
    const perServing = (ri.qty || 0) / servings;
    if (perServing > 0 && ((egg && (ri.unit === 'piece' || ri.unit === 'small' || ri.unit === 'medium' || ri.unit === 'large')) || (bread && (ri.unit === 'piece' || ri.unit === 'slice')))) {
      counts.push(perServing);
    }
  }
  return { redMeat, oilyFish, counts };
}

// ---------------------------------------------------------------------------------------------------------------
// Setup: normalized targets, slot pools and tables. Cached per (catalog, profile, favorites, ingredient index).

interface Rec {
  recipe: CatalogRecipe;
  id: string;
  kcal: number;
  protein: number;
  /** protein grams per kcal */
  density: number;
  /** sodium mg per serving, and mg per kcal */
  na: number;
  naDensity: number;
  /** Raw red-meat grams per serving (0 below RED_MEAT_MIN_G: a garnish of meat doesn't make a red-meat meal). */
  redMeat: number;
  /** Has at least OILY_FISH_MIN_G of oily fish per serving. */
  oily: boolean;
  /** Per-serving counts of things served whole (eggs, breads), for the portion balancer. */
  counts: number[];
  cuisine: Cuisine;
  source: ProteinSource;
  fav: boolean;
  /** hash of the id */
  h: number;
}

/**
 * A rotation (or small) slot's schedule. Row = day mod period; cells[row * lanes + lane] lists the recipes that take
 * turns in that cell, one per cycle of `period` days.
 */
interface Table {
  period: number;
  lanes: number;
  cells: Rec[][];
}

interface SlotSetup {
  slot: MealSlot;
  /** Lanes of this slot per day. */
  k: number;
  mode: SlotMode;
  /** How many recipes the profile may eat in this slot. */
  eligibleCount: number;
  /** Every recipe the profile may eat in this slot, in seeded order: what a repair may swap in. */
  all: Rec[];
  /**
   * The recipes the slot plans from: every eligible one, or for rotation slots the ones some portion fits to the
   * meal's kcal budget, when there are still ≥ 7k of them.
   */
  eligible: Rec[];
  pool: Rec[];
  table: Table | null;
  synced: boolean;
}

/** One pick per lane of the day (null = unfilled), in lane order. */
type DayPicks = (Rec | null)[];

interface Setup {
  /** The random seed: a constant (PLANNER_SEED), so plans depend on the pools alone. */
  seed: number;
  T: number;
  PT: number;
  profile: Profile;
  /** Weight-loss goal: portions land at or under the kcal target when that costs nothing else. */
  lose: boolean;
  lanes: MealShare[];
  slots: Map<MealSlot, SlotSetup>;
  byId: Map<string, CatalogRecipe>;
  recs: Map<string, Rec>;
  legumeBoost: boolean;
  /** Lanes chosen by simulation (greedy and small slots), in lane order. */
  simLanes: number[];
  /** Lanes a day-level repair may change (greedy and rotation slots), in lane order. */
  repairLanes: number[];
  epochs: Map<string, Map<number, DayPicks>>;
}

function normalizeProfile(p: Profile): Profile {
  const snacks = p.snacksPerDay === 0 || p.snacksPerDay === 1 || p.snacksPerDay === 2 ? p.snacksPerDay : 1;
  const diet = p.diet === 'vegan' || p.diet === 'vegetarian' || p.diet === 'pescatarian' ? p.diet : 'omnivore';
  return {
    ...p,
    diet,
    snacksPerDay: snacks,
    excludeAllergens: Array.isArray(p.excludeAllergens) ? p.excludeAllergens : [],
    dislikedIngredients: Array.isArray(p.dislikedIngredients) ? p.dislikedIngredients : [],
    maxTotalMinutes: typeof p.maxTotalMinutes === 'number' && Number.isFinite(p.maxTotalMinutes) ? p.maxTotalMinutes : null,
  };
}

/** The profile fields that decide which recipes may be planned where. */
function eligibilityParts(p: Profile): unknown[] {
  return [p.diet, [...p.excludeAllergens].sort(), [...p.dislikedIngredients].sort(), p.maxTotalMinutes, p.snacksPerDay];
}

/** True when the body stats say the goal is to lose weight. */
function losing(p: Profile): boolean {
  return p.body?.goal === 'lose';
}

/**
 * Stable key of everything in a profile that changes the generated plan: diet, excluded allergens, disliked
 * ingredients, time limit, snacks per day and the two targets (clamped to TARGET_LIMITS, like everywhere else),
 * plus a weight-loss goal, which moves portions only. Household size, week start and the rest of the body stats are
 * not part of it, so changing them never reshuffles the plan. The planner's seed is a constant, so a target change
 * moves portions and greedy choices but keeps tables and queue orders.
 */
export function profileKey(profile: Profile): string {
  const p = normalizeProfile(profile);
  const parts = [...eligibilityParts(p), clampTarget('kcalTarget', p.kcalTarget, 2000), clampTarget('proteinTarget', p.proteinTarget, 90)];
  return JSON.stringify(losing(p) ? [...parts, 'lose'] : parts);
}

const setupCache = new WeakMap<readonly CatalogRecipe[], Map<string, Setup>>();
const indexIds = new WeakMap<IngredientIndex, number>();
let nextIndexId = 1;

function getSetup(ctx: PlanContext): Setup {
  let idxId = 0;
  if (ctx.ingredientIndex) {
    idxId = indexIds.get(ctx.ingredientIndex) ?? 0;
    if (!idxId) {
      idxId = nextIndexId++;
      indexIds.set(ctx.ingredientIndex, idxId);
    }
  }
  const catalog = Array.isArray(ctx.catalog) ? ctx.catalog : [];
  const pKey = profileKey(ctx.profile);
  const favKey = [...new Set(ctx.favorites ?? [])].sort().join('\u0000');
  const key = `${pKey}|${favKey}|${idxId}`;
  let perCatalog = setupCache.get(catalog);
  if (!perCatalog) {
    perCatalog = new Map();
    setupCache.set(catalog, perCatalog);
  }
  const hit = perCatalog.get(key);
  if (hit) return hit;
  const setup = buildSetup(ctx, catalog);
  if (perCatalog.size >= MAX_SETUPS_PER_CATALOG) {
    const oldest = perCatalog.keys().next().value;
    if (oldest !== undefined) perCatalog.delete(oldest);
  }
  perCatalog.set(key, setup);
  return setup;
}

function buildSetup(ctx: PlanContext, catalog: readonly CatalogRecipe[]): Setup {
  const profile = normalizeProfile(ctx.profile);
  const favs = new Set(ctx.favorites ?? []);
  const byId = new Map<string, CatalogRecipe>();
  for (const r of catalog) if (r && typeof r.id === 'string' && !byId.has(r.id)) byId.set(r.id, r);
  const recs = new Map<string, Rec>();
  for (const r of byId.values()) {
    const kcal = Number.isFinite(r.perServing?.kcal) ? Math.max(0, r.perServing.kcal) : 0;
    const protein = Number.isFinite(r.perServing?.protein) ? Math.max(0, r.perServing.protein) : 0;
    const na = Number.isFinite(r.perServing?.sodium) ? Math.max(0, r.perServing.sodium) : 0;
    const extras = recipeExtras(r, ctx.ingredientIndex);
    recs.set(r.id, {
      recipe: r,
      id: r.id,
      kcal,
      protein,
      density: kcal > 0 ? protein / kcal : 0,
      na,
      naDensity: kcal > 0 ? na / kcal : 0,
      redMeat: extras.redMeat >= RED_MEAT_MIN_G ? extras.redMeat : 0,
      oily: extras.oilyFish >= OILY_FISH_MIN_G,
      counts: extras.counts,
      cuisine: r.cuisine,
      source: proteinSource(r, ctx.ingredientIndex),
      fav: favs.has(r.id),
      h: hashString(r.id) >>> 0,
    });
  }
  const S: Setup = {
    seed: hashString(PLANNER_SEED) >>> 0,
    T: clampTarget('kcalTarget', profile.kcalTarget, 2000),
    PT: clampTarget('proteinTarget', profile.proteinTarget, 90),
    profile,
    lose: losing(profile),
    lanes: slotEnergySplit(profile.snacksPerDay),
    slots: new Map(),
    byId,
    recs,
    legumeBoost: profile.diet === 'omnivore' || profile.diet === 'pescatarian',
    simLanes: [],
    repairLanes: [],
    epochs: new Map(),
  };
  S.slots = buildSlots(S);
  S.lanes.forEach((lane, m) => {
    const mode = S.slots.get(lane.slot)?.mode;
    if (mode === 'greedy' || mode === 'small') S.simLanes.push(m);
    if (mode === 'greedy' || mode === 'rotation') S.repairLanes.push(m);
  });
  return S;
}

/** A seeded order that doesn't depend on the input order (so reordering the catalog changes nothing). */
function seededOrder(S: Setup, list: readonly Rec[], salt: number): Rec[] {
  return list
    .map((r) => ({ r, k: mix32(S.seed ^ mix32(r.h ^ salt)) }))
    .sort((a, b) => a.k - b.k || (a.r.id < b.r.id ? -1 : a.r.id > b.r.id ? 1 : 0))
    .map((x) => x.r);
}

/** Reorders so neighbours differ in cuisine and, where possible, in main protein. Keeps the order otherwise. */
function spread(list: readonly Rec[]): Rec[] {
  const rest = list.slice();
  const out: Rec[] = [];
  while (rest.length) {
    const prev = out[out.length - 1];
    let at = 0;
    if (prev) {
      const differs = (r: Rec) => r.cuisine !== prev.cuisine;
      const both = rest.findIndex((r) => differs(r) && (r.source !== prev.source || r.source === 'plant'));
      at = both >= 0 ? both : Math.max(0, rest.findIndex(differs));
    }
    out.push(rest.splice(at, 1)[0] as Rec);
  }
  return out;
}

/** Splits recipes among `members` (each recipe to one slot), keeping recipes per lane as even as possible. */
function partition(order: readonly Rec[], members: readonly SlotSetup[], skip: ReadonlySet<string>): Map<MealSlot, Rec[]> {
  const home = new Map<MealSlot, Rec[]>(members.map((m) => [m.slot, []]));
  const sets = members.map((m) => ({ m, ids: new Set(m.eligible.map((r) => r.id)) }));
  const shared: { rec: Rec; cands: SlotSetup[] }[] = [];
  for (const rec of order) {
    if (skip.has(rec.id)) continue;
    const cands = sets.filter((x) => x.ids.has(rec.id)).map((x) => x.m);
    if (cands.length === 1) home.get((cands[0] as SlotSetup).slot)?.push(rec);
    else if (cands.length > 1) shared.push({ rec, cands });
  }
  for (const { rec, cands } of shared) {
    let best = cands[0] as SlotSetup;
    let bestRatio = Infinity;
    for (const m of cands) {
      const ratio = (home.get(m.slot)?.length ?? 0) / m.k;
      if (ratio < bestRatio - 1e-9) {
        bestRatio = ratio;
        best = m;
      }
    }
    home.get(best.slot)?.push(rec);
  }
  return home;
}

/** Groups slots that share at least one recipe (connected components). */
function components(members: readonly SlotSetup[]): SlotSetup[][] {
  const parent = members.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) i = parent[i] as number;
    return i;
  };
  const sets = members.map((m) => new Set(m.eligible.map((r) => r.id)));
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = sets[i] as Set<string>;
      if ((members[j] as SlotSetup).eligible.some((r) => a.has(r.id))) parent[find(j)] = find(i);
    }
  }
  const groups = new Map<number, SlotSetup[]>();
  members.forEach((m, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), m]));
  return [...groups.values()];
}

function buildSlots(S: Setup): Map<MealSlot, SlotSetup> {
  const kOf = new Map<MealSlot, number>();
  for (const lane of S.lanes) kOf.set(lane.slot, (kOf.get(lane.slot) ?? 0) + 1);
  const all = seededOrder(S, [...S.recs.values()], 0x5eed);
  const slots = new Map<MealSlot, SlotSetup>();
  for (const slot of MEAL_SLOTS) {
    const k = kOf.get(slot) ?? 0;
    if (!k) continue;
    const allowed = all.filter((r) => isEligible(r.recipe, S.profile, slot));
    let eligible = allowed;
    const n = eligible.length;
    const mode: SlotMode = n === 0 ? 'empty' : n >= greedyMinPool(k) ? 'greedy' : n >= rotationMinPool(k) ? 'rotation' : 'small';
    if (mode === 'rotation') {
      // A table can't choose by kcal, so leave out recipes no portion fits to the meal's budget (a 150 kcal snack
      // as a 700 kcal breakfast) while at least 7k remain. Greedy and small slots weigh the fit when choosing.
      const budget = S.T * (S.lanes.find((l) => l.slot === slot)?.share ?? 0.1);
      const fitting = eligible.filter((r) => r.kcal > 0 && Math.abs(r.kcal * bestPortion(r.kcal, budget) - budget) <= FIT_TOLERANCE * budget);
      if (fitting.length >= rotationMinPool(k)) eligible = fitting;
    }
    slots.set(slot, { slot, k, mode, eligibleCount: n, all: allowed, eligible, pool: [], table: null, synced: false });
  }
  const ofMode = (mode: SlotMode) => [...slots.values()].filter((ss) => ss.mode === mode);

  // Rotation slots own everything any of them may serve.
  const rotation = ofMode('rotation');
  const rotHome = partition(all, rotation, new Set());
  const rotationOwned = new Set<string>();
  for (const list of rotHome.values()) for (const r of list) rotationOwned.add(r.id);
  for (const group of components(rotation)) {
    if (group.some((ss) => (rotHome.get(ss.slot)?.length ?? 0) < rotationMinPool(ss.k))) buildSyncedTables(S, group, rotHome);
    else {
      for (const ss of group) {
        ss.pool = rotHome.get(ss.slot) ?? [];
        ss.table = singleTable(S, ss.pool, ss.k, 0x7ab1e + MEAL_SLOTS.indexOf(ss.slot));
      }
    }
  }

  // Small slots use everything they may serve. Their table (period ⌊n/k⌋, the widest spacing the pool allows) is
  // the default choice; the simulation departs from it when the table's recipe is already on the day.
  for (const ss of ofMode('small')) {
    ss.pool = ss.eligible;
    ss.table = singleTable(S, ss.pool, Math.min(ss.k, ss.pool.length), 0x7ab1e + MEAL_SLOTS.indexOf(ss.slot));
  }

  // Greedy slots: each draws on everything it may serve that rotation slots don't own, topped up to the greedy
  // minimum. Sharing is safe (they skip whatever is already on the day) and keeps every eligible recipe open to
  // every slot, which high kcal targets need; a recipe served in one slot goes to the back of every queue
  // (epochPicks), so slots that share recipes take turns rather than repeat each other.
  const greedy = ofMode('greedy');
  for (const ss of greedy) {
    const pool = ss.eligible.filter((r) => !rotationOwned.has(r.id));
    const need = greedyMinPool(ss.k);
    for (const r of ss.eligible) {
      if (pool.length >= need) break;
      if (rotationOwned.has(r.id)) pool.push(r);
    }
    ss.pool = pool;
  }
  return slots;
}

/** A table over `pool` with `lanes` lanes and the longest period the pool allows (⌊pool / lanes⌋ days). */
function singleTable(S: Setup, pool: readonly Rec[], lanes: number, salt: number): Table | null {
  const period = Math.floor(pool.length / lanes);
  if (!(period > 0)) return null;
  const nCells = period * lanes;
  const order = spread(seededOrder(S, pool, salt));
  const cells: Rec[][] = [];
  for (let c = 0; c < nCells; c++) cells.push([order[c] as Rec]);
  const extra = order.slice(nCells);
  extra.forEach((rec, j) => {
    const row = Math.floor(((j + 0.5) * period) / extra.length) % period;
    cells[row * lanes + (j % lanes)]?.push(rec);
  });
  return { period, lanes, cells };
}

/**
 * Tables for rotation slots that share recipes, with one common period: the largest every member can fill,
 * ⌊n / k⌋ ≥ 7. Members are built in slot order. Each member covers its cells with distinct recipes (a bipartite
 * matching, own recipes first) such that a recipe an earlier member placed in row r never goes in row r again, and
 * shared recipes land as far as possible from their other slot's days. The member's remaining recipes join the
 * shortest lists in allowed rows. So shared recipes never meet on a day, and within each slot every recipe sits
 * in one cell and comes back every period (or a multiple of it) days.
 */
function buildSyncedTables(S: Setup, group: readonly SlotSetup[], home: ReadonlyMap<MealSlot, Rec[]>): void {
  const period = Math.min(...group.map((ss) => Math.floor(ss.eligible.length / ss.k)));
  const rowsOf = new Map<string, Set<number>>();
  for (const ss of group) {
    const lanes = ss.k;
    const nCells = period * lanes;
    const own = home.get(ss.slot) ?? [];
    const ownIds = new Set(own.map((r) => r.id));
    const borrowed = ss.eligible.filter((r) => !ownIds.has(r.id));
    const salt = 0x5c0 + MEAL_SLOTS.indexOf(ss.slot);
    const order = [...spread(seededOrder(S, own, salt)), ...spread(seededOrder(S, borrowed, salt + 1))];
    const rowOf = (cell: number) => Math.floor(cell / lanes);
    const allowed = (rec: Rec, cell: number) => !rowsOf.get(rec.id)?.has(rowOf(cell));
    // Days between `row` and the recipe's rows in earlier members (Infinity when it has none).
    const distance = (rec: Rec, row: number) => {
      let d = Infinity;
      for (const r of rowsOf.get(rec.id) ?? []) d = Math.min(d, mod(row - r, period), mod(r - row, period));
      return d;
    };
    const prefs: Rec[][] = [];
    for (let c = 0; c < nCells; c++) {
      const rotated = order.map((rec, i) => ({ rec, i: mod(i - c, order.length), d: distance(rec, rowOf(c)) }));
      prefs.push(rotated.sort((a, b) => b.d - a.d || a.i - b.i).map((x) => x.rec));
    }
    const cellRec: (Rec | null)[] = new Array<Rec | null>(nCells).fill(null);
    const recCell = new Map<string, number>();
    const augment = (cell: number, seen: Set<string>): boolean => {
      for (const rec of prefs[cell] ?? []) {
        if (seen.has(rec.id) || !allowed(rec, cell)) continue;
        seen.add(rec.id);
        const cur = recCell.get(rec.id);
        if (cur === undefined || augment(cur, seen)) {
          cellRec[cell] = rec;
          recCell.set(rec.id, cell);
          return true;
        }
      }
      return false;
    };
    for (let c = 0; c < nCells; c++) augment(c, new Set());
    // Hall's condition can only fail for contrived overlaps; fill a gap with an unused recipe (the day-level
    // duplicate check still keeps every day clean).
    for (let c = 0; c < nCells; c++) {
      if (cellRec[c]) continue;
      const rec = order.find((r) => !recCell.has(r.id)) ?? (order[c % order.length] as Rec);
      cellRec[c] = rec;
      if (!recCell.has(rec.id)) recCell.set(rec.id, c);
    }
    const cells: Rec[][] = cellRec.map((r) => [r as Rec]);
    const extra = order.filter((r) => !recCell.has(r.id));
    extra.forEach((rec, j) => {
      const start = Math.floor(((j + 0.5) * nCells) / extra.length);
      let best = -1;
      let bestLen = Infinity;
      for (let t = 0; t < nCells; t++) {
        const c = (start + t) % nCells;
        const len = (cells[c] as Rec[]).length;
        if (allowed(rec, c) && len < bestLen) {
          best = c;
          bestLen = len;
        }
      }
      // Unreachable: a recipe is barred from at most 3 rows (one per other rotation slot) and period ≥ 7.
      if (best < 0) best = start % nCells;
      cells[best]?.push(rec);
      recCell.set(rec.id, best);
    });
    for (const [id, c] of recCell) {
      const rows = rowsOf.get(id) ?? new Set<number>();
      rows.add(rowOf(c));
      rowsOf.set(id, rows);
    }
    ss.pool = order;
    ss.table = { period, lanes, cells };
    ss.synced = true;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Rotation slots: table lookups

function tablePick(t: Table, dn: number, lane: number): Rec | null {
  if (lane >= t.lanes || t.period <= 0) return null;
  const list = t.cells[mod(dn, t.period) * t.lanes + lane];
  if (!list || !list.length) return null;
  return list[mod(Math.floor(dn / t.period), list.length)] ?? null;
}

/** Picks for the rotation lanes of a day (null elsewhere). */
function rotationPicks(S: Setup, dn: number): DayPicks {
  return S.lanes.map((lane) => {
    const ss = S.slots.get(lane.slot);
    return ss?.mode === 'rotation' && ss.table ? tablePick(ss.table, dn, lane.index) : null;
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Epoch simulation (every slot that has recipes)

interface SlotState {
  /** Greedy and small slots: the pool, least recently used first. */
  queue: Rec[];
  /** Day each recipe was last served in this slot. */
  last: Map<string, number>;
  /** Middle part only: first day the coming tail serves each recipe in this slot. */
  ahead: Map<string, number>;
}

/**
 * Requeues a recipe just served: to the back, or with `sooner` (a favorite, R5) a third of the way back, so it
 * comes round again sooner. A recipe from outside the pool, taken by a repair, stays out.
 */
function requeue(queue: Rec[], rec: Rec, sooner: boolean): void {
  const i = queue.indexOf(rec);
  if (i < 0) return;
  queue.splice(i, 1);
  if (sooner) queue.splice(Math.floor(queue.length / 3), 0, rec);
  else queue.push(rec);
}

/** True when the slot hasn't served `id` in the 6 days before `dn` and the coming tail doesn't within 6 days after. */
function freeInSlot(st: SlotState, id: string, dn: number): boolean {
  const last = st.last.get(id);
  const ahead = st.ahead.get(id);
  return (last === undefined || dn - last >= VARIETY_DAYS) && (ahead === undefined || ahead - dn >= VARIETY_DAYS);
}

/**
 * Recipes a rotation slot's table is due to serve within 6 days either side of `dn` on days not planned yet (a
 * repair never takes one: that day will serve its table recipe). Days already planned (`planned`) are left out,
 * since what they really served is in the slot's history or lookahead, so a table recipe another repair displaced
 * is free again.
 */
function dueFromTable(ss: SlotSetup, dn: number, planned: (d: number) => boolean): Set<string> {
  const out = new Set<string>();
  const t = ss.table;
  if (!t) return out;
  for (let d = dn - (VARIETY_DAYS - 1); d <= dn + (VARIETY_DAYS - 1); d++) {
    if (d === dn || planned(d)) continue;
    for (let lane = 0; lane < t.lanes; lane++) {
      const rec = tablePick(t, d, lane);
      if (rec) out.add(rec.id);
    }
  }
  return out;
}

function epochPicks(S: Setup, e: number, part: 'tail' | 'middle'): Map<number, DayPicks> {
  const ck = `${e}|${part}`;
  const hit = S.epochs.get(ck);
  if (hit) return hit;

  const start = e * EPOCH_DAYS + (part === 'tail' ? MIDDLE_DAYS : 0);
  const len = part === 'tail' ? TAIL_DAYS : MIDDLE_DAYS;
  const state = new Map<MealSlot, SlotState>();
  for (const ss of S.slots.values()) {
    if (ss.mode === 'empty') continue;
    // Keyed on ids (seededOrder), so a recipe joining or leaving the pool leaves the others' order alone.
    const queue = ss.mode === 'rotation' ? [] : seededOrder(S, ss.pool, hashParts('queue', ss.slot, e, part) >>> 0);
    state.set(ss.slot, { queue, last: new Map(), ahead: new Map() });
  }
  const known = new Map<number, DayPicks>();
  // Favorites (R5) act in middle parts only, and only once the part has served them: a favorite served on a day of
  // the part comes back sooner (requeue) and gets a small bonus when due again (choose). So a change to the
  // favorites never changes a tail (which the middle before it plans around), a replayed history day, or a middle
  // day before the part first serves a newly favorited recipe.
  const favSeen = new Set<string>();
  const record = (dn: number, picks: DayPicks, history: boolean) => {
    picks.forEach((rec, m) => {
      const st = state.get((S.lanes[m] as MealShare).slot);
      if (!rec || !st) return;
      st.last.set(rec.id, dn);
      const fav = rec.fav && !history && part === 'middle';
      if (fav) favSeen.add(rec.id);
      // Least recently used across slots: served anywhere, it waits its turn everywhere.
      for (const other of state.values()) requeue(other.queue, rec, fav);
    });
  };

  if (part === 'middle') {
    for (const [dn, picks] of epochPicks(S, e - 1, 'tail')) {
      known.set(dn, picks);
      record(dn, picks, true);
    }
    for (const [dn, picks] of epochPicks(S, e, 'tail')) {
      picks.forEach((rec, m) => {
        const st = state.get((S.lanes[m] as MealShare).slot);
        if (rec && st && !st.ahead.has(rec.id)) st.ahead.set(rec.id, dn);
      });
    }
  }

  const historyStart = part === 'middle' ? start - TAIL_DAYS : start;
  // Days whose real picks this part knows: its history and days so far, and for a middle the coming tail.
  const tailStart = start + len;
  const planned = (d: number) => known.has(d) || (part === 'middle' && d >= tailStart && d < tailStart + TAIL_DAYS);
  const out = new Map<number, DayPicks>();
  for (let dn = start; dn < start + len; dn++) {
    const picks = rotationPicks(S, dn);
    for (const m of S.simLanes) {
      const lane = S.lanes[m] as MealShare;
      const ss = S.slots.get(lane.slot) as SlotSetup;
      picks[m] = choose(S, ss, dn, m, state, picks, known, historyStart, favSeen);
    }
    repairDay(S, dn, picks, state, known, planned);
    known.set(dn, picks);
    out.set(dn, picks);
    record(dn, picks, false);
  }

  if (S.epochs.size >= MAX_EPOCHS_PER_SETUP) {
    const oldest = S.epochs.keys().next().value;
    if (oldest !== undefined) S.epochs.delete(oldest);
  }
  S.epochs.set(ck, out);
  return out;
}

/** What a lane knows about its day when it is chosen or repaired, and how it scores a recipe. */
interface LaneView {
  /** Recipes on the day's other lanes. */
  dayIds: Set<string>;
  /** The day's other meals known so far. */
  others: Rec[];
  /** Fit, protein, sodium, variety and red-meat score for this lane (higher is better; no tier, no queue bonus). */
  score: (rec: Rec) => number;
}

/** Estimated raw red-meat grams of a meal: its portion for the lane's budget, capped like the balancer caps it. */
function redMeatGrams(S: Setup, rec: Rec, share: number): number {
  return rec.redMeat ? rec.redMeat * Math.min(RED_MEAT_PORTION, bestPortion(rec.kcal, S.T * share)) : 0;
}

function laneView(S: Setup, dn: number, m: number, picks: DayPicks, known: ReadonlyMap<number, DayPicks>): LaneView {
  const lane = S.lanes[m] as MealShare;
  const dayIds = new Set<string>();
  const cuisines = new Set<Cuisine>();
  const sources = new Set<ProteinSource>();
  const others: Rec[] = [];
  let knownShare = 0;
  let knownKcal = 0;
  let knownProtein = 0;
  let knownNa = 0;
  // Red meat (raw grams) and oily fish over the last 6 days and the day's other meals, and legume mains.
  let redMeat = 0;
  let oily = false;
  let legumes = 0;
  S.lanes.forEach((other, j) => {
    const p = picks[j];
    if (!p || j === m) return;
    dayIds.add(p.id);
    const portion = bestPortion(p.kcal, S.T * other.share);
    others.push(p);
    knownShare += other.share;
    knownKcal += p.kcal * portion;
    knownProtein += p.protein * portion;
    knownNa += p.na * portion;
    redMeat += redMeatGrams(S, p, other.share);
    oily ||= p.oily;
    if (isMain(other.slot)) {
      cuisines.add(p.cuisine);
      sources.add(p.source);
      if (p.source === 'legume') legumes++;
    }
  });
  for (let d = dn - (VARIETY_DAYS - 1); d < dn; d++) {
    const kp = known.get(d);
    if (!kp) continue;
    S.lanes.forEach((mm, j) => {
      const p = kp[j];
      if (!p) return;
      redMeat += redMeatGrams(S, p, mm.share);
      oily ||= p.oily;
      if (isMain(mm.slot) && p.source === 'legume') legumes++;
    });
  }
  // Energy (R4): this meal's budget is its share of what the known meals leave (at their best portions), so a light
  // breakfast gets made up later in the day. Protein: the density (g per kcal) the rest of the day has to average to
  // reach the target. It rises when the day is behind, so higher-protein recipes win then. Sodium: the density
  // (mg per kcal) the rest of the day may average to stay within SODIUM_BUDGET.
  const restShare = Math.max(0.05, 1 - knownShare);
  const slotBudget = S.T * lane.share;
  const budget = Math.min(2 * slotBudget, Math.max(0.5 * slotBudget, ((S.T - knownKcal) * lane.share) / restShare));
  const needDensity = Math.max(0, S.PT - knownProtein) / (S.T * restShare);
  const naAllow = Math.max(0, SODIUM_BUDGET - knownNa) / (S.T * restShare);
  const main = isMain(lane.slot);

  const y = known.get(dn - 1)?.[m] ?? null;
  const yy = known.get(dn - 2)?.[m] ?? null;
  const recent = new Set<string>();
  for (const d of [dn - 1, dn - 2]) for (const p of known.get(d) ?? []) if (p) recent.add(p.id);

  const daySeed = mix32(S.seed ^ mix32(Math.imul(dn, 0x9e3779b1) ^ (m + 1)));
  const score = (rec: Rec): number => {
    let s = mix32(daySeed ^ rec.h) / 4294967296; // jitter in [0, 1) breaks ties
    // kcal fit: what no portion (0.5-2 servings) can close, plus a mild pull toward whole servings and a milder one
    // away from needing more than 1.5 servings (a double bowl of soup). Smooth in the budget, so a small target
    // change moves few choices (the day's band itself is guarded by the tiers).
    const gap = rec.kcal > 0 ? Math.max(0, budget - PORTION_MAX * rec.kcal, PORTION_MIN * rec.kcal - budget) / budget : 1;
    const fit = rec.kcal > 0 ? gap + 0.15 * Math.abs(Math.log(budget / rec.kcal)) : 1;
    s -= Math.min(fit, 1) * 3;
    // A recipe below the needed density costs in proportion to the protein it would leave missing (as a fraction
    // of the target); above it, a small bonus that levels off, so normal targets don't turn every day into chicken.
    if (needDensity > 0) {
      s -= (12 * Math.max(0, needDensity - rec.density) * budget) / S.PT;
      s += 0.4 * Math.min(rec.density / needDensity, 1.5);
    }
    // Sodium: a recipe saltier than the rest of the day can afford costs in proportion to the excess (as a fraction
    // of the budget), capped so a waiting recipe still gets its turn. Only while some portion fits the meal's
    // budget: sodium never outweighs landing the day's energy.
    if (gap < 0.05) s -= Math.min(SODIUM_SCORE_CAP, (20 * Math.max(0, rec.naDensity - naAllow) * budget) / SODIUM_BUDGET);
    // Red meat: past about 600 g raw over 7 days, each further 150 g costs 1.5 (capped there).
    if (rec.redMeat) {
      const over = redMeat + redMeatGrams(S, rec, lane.share) - RED_MEAT_WEEK_G;
      if (over > 0) s -= Math.min(1.5, (1.5 * over) / 150);
    }
    // Oily fish (salmon, mackerel, sardines, trout) once a week.
    if (rec.oily && !oily) s += 0.4;
    if (main) {
      if (cuisines.has(rec.cuisine)) s -= 2; // the day's other main already has this cuisine
      if (rec.source !== 'plant' && sources.has(rec.source)) s -= 0.7;
      if (y && y.source === rec.source && rec.source !== 'plant') s -= 0.4;
      if (S.legumeBoost && rec.source === 'legume') s += legumes < 3 ? 0.9 : 0.1;
    }
    if (y && y.cuisine === rec.cuisine) s -= 0.5;
    if (yy && yy.cuisine === rec.cuisine) s -= 0.3;
    if (recent.has(rec.id)) s -= 0.6; // eaten as another meal in the last two days
    return s;
  };
  return { dayIds, others, score };
}

/**
 * What the simulated lanes of one slot still to be chosen after this one may take on the day: recipes sorted by
 * kcal. Greedy: every recipe the profile may eat there that is not on the day, not served in the slot within 6
 * days and not reserved by the coming tail. Small: the table's recipes for the day, or (`fallback`, when one of them
 * is taken) the pool less what is on the day.
 */
interface LaterGroup {
  lanes: number;
  recs: Rec[];
  fallback: Rec[] | null;
}

function laterGroups(S: Setup, dn: number, m: number, state: ReadonlyMap<MealSlot, SlotState>, dayIds: ReadonlySet<string>): LaterGroup[] {
  const bySlot = new Map<MealSlot, number[]>();
  for (const j of S.simLanes.slice(S.simLanes.indexOf(m) + 1)) {
    const slot = (S.lanes[j] as MealShare).slot;
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), j]);
  }
  const byKcal = (list: Rec[]) => list.sort((a, b) => a.kcal - b.kcal);
  const groups: LaterGroup[] = [];
  for (const [slot, lanes] of bySlot) {
    const ss = S.slots.get(slot);
    const st = state.get(slot);
    if (!ss || !st) continue;
    if (ss.mode === 'small') {
      const free = byKcal(ss.pool.filter((r) => !dayIds.has(r.id)));
      const table = lanes.map((j) => (ss.table ? tablePick(ss.table, dn, (S.lanes[j] as MealShare).index) : null));
      const own = table.every((r): r is Rec => !!r && !dayIds.has(r.id)) ? byKcal(table as Rec[]) : null;
      groups.push(own ? { lanes: lanes.length, recs: own, fallback: free } : { lanes: lanes.length, recs: free, fallback: null });
    } else {
      groups.push({ lanes: lanes.length, recs: byKcal(ss.all.filter((r) => !dayIds.has(r.id) && freeInSlot(st, r.id, dn))), fallback: null });
    }
  }
  return groups;
}

/**
 * The best tier the day can still reach (see reachableTier) with `fixed` meals and the later lanes in `groups`,
 * none of which may take `exclude`. Optimistic: each later slot is counted from its lightest to its heaviest
 * recipes at any portion, with protein at its densest recipe's density, so a 0 or 1 is certain.
 */
function restTier(S: Setup, fixed: readonly Rec[], groups: readonly LaterGroup[], exclude: string): 0 | 1 | 2 {
  let lo = 0;
  let hi = 0;
  let r = 0;
  const segments: { density: number; kcal: number }[] = [];
  for (const f of fixed) {
    lo += PORTION_MIN * f.kcal;
    hi += PORTION_MAX * f.kcal;
    r += PORTION_MIN * f.protein;
    segments.push({ density: f.density, kcal: (PORTION_MAX - PORTION_MIN) * f.kcal });
  }
  for (const g of groups) {
    const list = g.fallback && g.recs.some((x) => x.id === exclude) ? g.fallback : g.recs;
    let small = 0;
    let large = 0;
    let dmax = 0;
    let count = 0;
    for (const x of list) {
      if (x.id === exclude) continue;
      if (count < g.lanes) small += x.kcal;
      count++;
      dmax = Math.max(dmax, x.density);
    }
    count = 0;
    for (let i = list.length - 1; i >= 0 && count < g.lanes; i--) {
      const x = list[i] as Rec;
      if (x.id === exclude) continue;
      large += x.kcal;
      count++;
    }
    lo += PORTION_MIN * small;
    hi += PORTION_MAX * large;
    r += PORTION_MIN * small * dmax;
    segments.push({ density: dmax, kcal: PORTION_MAX * large - PORTION_MIN * small });
  }
  const kmax = S.T * (1 + KCAL_TOLERANCE);
  if (lo > kmax + 1e-9 || hi < S.T * (1 - KCAL_TOLERANCE) - 1e-9) return 0;
  if (S.PT <= 0) return 2;
  let k = lo;
  segments.sort((a, b) => b.density - a.density);
  for (const seg of segments) {
    const add = Math.min(seg.kcal, kmax - k);
    if (add <= 0) break;
    k += add;
    r += add * seg.density;
  }
  return r >= S.PT * PROTEIN_FLOOR - 1e-9 ? 2 : 1;
}

/**
 * Chooses the recipe for lane `m` on day `dn` of a greedy or small slot. `known` holds the days simulated so far
 * (with the previous tail for a middle part), which start at `start`.
 */
function choose(
  S: Setup,
  ss: SlotSetup,
  dn: number,
  m: number,
  state: ReadonlyMap<MealSlot, SlotState>,
  picks: DayPicks,
  known: ReadonlyMap<number, DayPicks>,
  start: number,
  favSeen: ReadonlySet<string>,
): Rec | null {
  const lane = S.lanes[m] as MealShare;
  const st = state.get(lane.slot) as SlotState;
  const view = laneView(S, dn, m, picks, known);
  const { dayIds } = view;

  // Reachability (R4): the best tier the day can still reach with the candidate. The day's last simulated meal
  // knows the whole day; an earlier one counts the later meals at what they may really take today (restTier).
  const isLast = S.simLanes.indexOf(m) === S.simLanes.length - 1;
  const groups = isLast ? [] : laterGroups(S, dn, m, state, dayIds);
  const tierOf = (rec: Rec): number => (isLast ? reachableTier([...view.others, rec], S.T, S.PT) : restTier(S, [...view.others, rec], groups, rec.id));

  // Small (R3): the table's recipe for the day, unless another meal of the day already has it, or it puts the kcal
  // band out of reach and a recipe not served the day before or after would not.
  const tableRec = ss.mode === 'small' && ss.table ? tablePick(ss.table, dn, lane.index) : null;
  const tableFree = !!tableRec && !dayIds.has(tableRec.id);
  if (tableRec && tableFree && tierOf(tableRec) > 0) return tableRec;

  // Candidates. Greedy: the first LOOKAHEAD recipes of the least-recently-used queue that were not used in the
  // slot in the last 6 days and are not used by the coming tail within 6 days (hard rule, R3). Small, when its
  // table recipe is taken: every recipe not on the day yet, ranked by how far its nearest other use in the slot is.
  const cands: { rec: Rec; bonus: number; tier: number }[] = [];
  /** Greedy: allowed recipes past the window, for when nothing in it reaches the best tier. */
  const spare: Rec[] = [];
  for (const rec of st.queue) {
    if (dayIds.has(rec.id)) continue;
    const last = st.last.get(rec.id);
    const ahead = st.ahead.get(rec.id);
    if (ss.mode === 'greedy') {
      if (!freeInSlot(st, rec.id, dn)) continue;
      if (cands.length >= LOOKAHEAD) {
        spare.push(rec);
        continue;
      }
      // Least recently used first, and a recipe waiting a long time gains weight so every recipe gets its turn.
      const waited = Math.min(dn - (last ?? start), 30);
      // A favorite this part has served already (R5) gets a small bonus when it's due again. Not before: a newly
      // favorited recipe changes nothing before the part first serves it.
      const fav = rec.fav && favSeen.has(rec.id) ? 0.6 : 0;
      cands.push({ rec, bonus: (1 - cands.length / LOOKAHEAD) * 0.6 + waited * 0.04 + fav, tier: tierOf(rec) });
    } else {
      // Days to the recipe's nearest other use in the slot: the last one, the tail's, or the table's next one.
      const next = ss.table ? nextTableDay(ss.table, rec, dn) : Infinity;
      const dist = Math.min(last === undefined ? SMALL_DISTANCE_CAP : dn - last, ahead === undefined ? SMALL_DISTANCE_CAP : ahead - dn, next - dn, SMALL_DISTANCE_CAP);
      // Never two days running while anything else is free; then kcal, spacing, protein (see rank below).
      cands.push({ rec, bonus: dist * 10 - (dist < 2 ? 5000 : 0), tier: tierOf(rec) });
    }
  }
  // Greedy: unreachable while the pool meets greedyMinPool (buildSlots guarantees it); kept so bad input can't throw.
  if (!cands.length) return st.queue.find((r) => !dayIds.has(r.id)) ?? null;
  const windowBest = Math.max(...cands.map((c) => c.tier));
  if (windowBest < 2) {
    for (const rec of spare) {
      const tier = tierOf(rec);
      if (tier > windowBest) {
        cands.push({ rec, bonus: 0, tier });
        break;
      }
    }
  }

  // Greedy: tier first (kcal band, then protein floor), then score. Small: kcal band, then spacing, then protein
  // (a small pool's spacing outranks the protein floor).
  const rank = (tier: number) => (ss.mode === 'greedy' ? tier * 1000 : tier === 0 ? 0 : tier === 1 && isLast && S.PT > 0 ? 997.5 : 1000);
  let best: Rec | null = null;
  let bestScore = -Infinity;
  let bestTier = 0;
  let bestBonus = 0;
  for (const { rec, bonus, tier } of cands) {
    const s = rank(tier) + bonus + view.score(rec);
    if (s > bestScore + 1e-12) {
      bestScore = s;
      best = rec;
      bestTier = tier;
      bestBonus = bonus;
    }
  }
  // A small slot leaves a free table recipe only for a day-apart recipe that brings the kcal band into reach.
  if (tableRec && tableFree && !(bestTier > 0 && bestBonus >= 0)) return tableRec;
  return best;
}

/** The first day after `dn` on which the table serves `rec` (Infinity when it never does). */
function nextTableDay(t: Table, rec: Rec, dn: number): number {
  const horizon = t.period * Math.max(1, ...t.cells.map((c) => c.length));
  for (let d = dn + 1; d <= dn + horizon; d++) {
    for (let lane = 0; lane < t.lanes; lane++) if (tablePick(t, d, lane) === rec) return d;
  }
  return Infinity;
}

/**
 * R4 repair, once a day's picks are all made: while its recipes can't reach tier 2 (kcal band and protein floor)
 * with any portions, swaps one meal of a greedy or rotation slot for the best-scoring recipe that raises the day's
 * exact tier and keeps every rule: eligible for the slot, not on the day, not served in the slot within 6 days
 * before or reserved by the coming tail within 6 days after, and for a rotation slot not due from its table on a day
 * not planned yet within 6 days either side (so the table's own days stay 7 apart from it). At most two swaps (tier
 * 0 -> 1 -> 2), so the finished day is one no single rule-keeping swap can improve, short of one that takes a recipe
 * the table serves on a day not planned yet. Changes `picks` in place.
 */
function repairDay(
  S: Setup,
  dn: number,
  picks: DayPicks,
  state: ReadonlyMap<MealSlot, SlotState>,
  known: ReadonlyMap<number, DayPicks>,
  planned: (d: number) => boolean,
): void {
  if (!S.repairLanes.length) return;
  for (let round = 0; round < 2 && repairOnce(S, dn, picks, state, known, planned); round++);
}

/** One repair swap (see repairDay). Returns true when it made one. */
function repairOnce(
  S: Setup,
  dn: number,
  picks: DayPicks,
  state: ReadonlyMap<MealSlot, SlotState>,
  known: ReadonlyMap<number, DayPicks>,
  planned: (d: number) => boolean,
): boolean {
  const filled = picks.filter((p): p is Rec => !!p);
  if (!filled.length) return false;
  const current = exactTier(filled, S.T, S.PT);
  if (current === 2) return false;
  const dayIds = new Set(filled.map((p) => p.id));
  const options: { m: number; rec: Rec; rest: Rec[]; opt: number; delta: number }[] = [];
  for (const m of S.repairLanes) {
    const was = picks[m];
    const lane = S.lanes[m] as MealShare;
    const ss = S.slots.get(lane.slot);
    const st = state.get(lane.slot);
    if (!was || !ss || !st) continue;
    const rest = picks.filter((p, j): p is Rec => !!p && j !== m);
    const due = ss.mode === 'rotation' ? dueFromTable(ss, dn, planned) : null;
    let view: LaneView | null = null;
    for (const rec of ss.all) {
      if (dayIds.has(rec.id) || !freeInSlot(st, rec.id, dn) || due?.has(rec.id)) continue;
      const opt = reachableTier([...rest, rec], S.T, S.PT);
      if (opt <= current) continue;
      view ??= laneView(S, dn, m, picks, known);
      options.push({ m, rec, rest, opt, delta: view.score(rec) - view.score(was) });
    }
  }
  if (!options.length) return false;
  options.sort((a, b) => b.opt - a.opt || b.delta - a.delta || a.m - b.m || (a.rec.id < b.rec.id ? -1 : a.rec.id > b.rec.id ? 1 : 0));
  // reachableTier can be optimistic about protein, so confirm with the exact tier, best candidates first.
  let best: (typeof options)[number] | null = null;
  let bestTier: number = current;
  for (const o of options) {
    if (o.opt <= bestTier) break;
    const tier = exactTier([...o.rest, o.rec], S.T, S.PT);
    if (tier > bestTier) {
      best = o;
      bestTier = tier;
    }
  }
  if (!best) return false;
  picks[best.m] = best.rec;
  return true;
}

/** Generated picks for a day, in lane order (null = unfilled). */
function generatedPicks(S: Setup, dn: number): DayPicks {
  if (!S.simLanes.length && !S.repairLanes.length) return rotationPicks(S, dn);
  const e = Math.floor(dn / EPOCH_DAYS);
  const part = dn - e * EPOCH_DAYS >= MIDDLE_DAYS ? 'tail' : 'middle';
  return epochPicks(S, e, part).get(dn) ?? rotationPicks(S, dn);
}

// ---------------------------------------------------------------------------------------------------------------
// Days

const SLOT_ORDER: Readonly<Record<MealSlot, number>> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };

function sortMeals(meals: PlannedMeal[]): PlannedMeal[] {
  return meals.sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] || a.index - b.index);
}

/** Per-person totals of a list of meals: sum of perServing x portion (unknown recipes count as zero). */
export function dayTotals(meals: readonly PlannedMeal[], byId: ReadonlyMap<string, CatalogRecipe>): Nutrients {
  let total = zeroNutrients();
  for (const meal of meals) {
    const r = byId.get(meal.recipeId);
    if (r?.perServing) total = addNutrients(total, scaleNutrients(r.perServing, meal.portion));
  }
  return total;
}

function validOverride(o: MealOverride, S: Setup): boolean {
  return (
    !!o &&
    MEAL_SLOTS.includes(o.slot) &&
    Number.isInteger(o.index) &&
    o.index >= 0 &&
    o.index <= MAX_MEAL_INDEX &&
    typeof o.recipeId === 'string' &&
    S.byId.has(o.recipeId)
  );
}

/** The generated meals of a day with balanced portions, before overrides. */
function generatedDay(S: Setup, dn: number): { meals: PlannedMeal[]; unfilled: { slot: MealSlot; index: number }[] } {
  const picks = generatedPicks(S, dn);
  // Final guard for R3: a recipe never appears twice on a generated day.
  const seen = new Set<string>();
  const clean = picks.map((p) => {
    if (!p || seen.has(p.id)) return null;
    seen.add(p.id);
    return p;
  });
  const filled = S.lanes.map((lane, m) => ({ lane, rec: clean[m] ?? null })).filter((x): x is { lane: MealShare; rec: Rec } => !!x.rec);
  const shareSum = filled.reduce((a, x) => a + x.lane.share, 0) || 1;
  const portions = balancePortions(
    filled.map(({ lane, rec }) => ({
      kcal: rec.kcal,
      protein: rec.protein,
      budget: (S.T * lane.share) / shareSum,
      sodium: rec.na,
      redMeat: rec.redMeat,
      counts: rec.counts,
    })),
    S.T,
    S.PT,
    { lose: S.lose },
  );
  const meals: PlannedMeal[] = filled.map(({ lane, rec }, i) => ({ slot: lane.slot, index: lane.index, recipeId: rec.id, portion: portions[i] ?? 1 }));
  const unfilled = S.lanes.filter((_, m) => !clean[m]).map(({ slot, index }) => ({ slot, index }));
  return { meals, unfilled };
}

// ---------------------------------------------------------------------------------------------------------------
// Public API

/**
 * The plan for one local date ('YYYY-MM-DD'). Deterministic; never throws. Overrides for the date replace (or add)
 * their meal; the other meals stay as generated and the totals are recomputed. An invalid date gives an empty plan
 * with every meal unfilled.
 */
export function planDay(date: string, ctx: PlanContext): DayPlan {
  const S = getSetup(ctx);
  if (!isISODate(date)) {
    return { date, meals: [], totals: zeroNutrients(), unfilled: S.lanes.map(({ slot, index }) => ({ slot, index })) };
  }
  const gen = generatedDay(S, dayNumber(date));
  const meals = gen.meals;
  let unfilled = gen.unfilled;

  // Overrides last: the last one for a (slot, index) wins; everything else stays as generated.
  const mine = new Map<string, MealOverride>();
  for (const o of ctx.overrides ?? []) if (o && o.date === date && validOverride(o, S)) mine.set(`${o.slot}#${o.index}`, o);
  for (const o of mine.values()) {
    const meal: PlannedMeal = { slot: o.slot, index: o.index, recipeId: o.recipeId, portion: snapPortion(o.portion) };
    const at = meals.findIndex((x) => x.slot === o.slot && x.index === o.index);
    if (at >= 0) meals[at] = meal;
    else meals.push(meal);
    unfilled = unfilled.filter((u) => !(u.slot === o.slot && u.index === o.index));
  }
  sortMeals(meals);
  return { date, meals, totals: dayTotals(meals, S.byId), unfilled };
}

/** Plans for `days` consecutive dates from `startDate` (empty for an invalid date or days <= 0; at most 10 years). */
export function planRange(startDate: string, days: number, ctx: PlanContext): DayPlan[] {
  if (!isISODate(startDate) || !(days > 0)) return [];
  const first = dayNumber(startDate);
  const out: DayPlan[] = [];
  for (let i = 0; i < Math.min(Math.floor(days), 3660); i++) out.push(planDay(fromDayNumber(first + i), ctx));
  return out;
}

/**
 * The best `limit` eligible alternatives for one meal, best first. Excludes every recipe already on that day
 * (including the current one). Ranked by kcal fit to what the rest of the day leaves for this meal (with the best
 * portion), protein, sodium against what the rest of the day leaves of SODIUM_BUDGET, variety (not planned in this
 * slot within 6 days either side, cuisine not already on the day's mains) and favorites. Save the choice as an
 * override with the candidate's portion.
 */
export function swapCandidates(date: string, slot: MealSlot, index: number, ctx: PlanContext, limit = 8): SwapCandidate[] {
  if (!isISODate(date) || !MEAL_SLOTS.includes(slot) || !(limit > 0)) return [];
  const S = getSetup(ctx);
  const plan = planDay(date, ctx);
  const dn = dayNumber(date);
  const dayIds = new Set(plan.meals.map((m) => m.recipeId));
  const share = S.lanes.find((m) => m.slot === slot && m.index === index)?.share ?? S.lanes.find((m) => m.slot === slot)?.share ?? 0.1;
  const slotBudget = S.T * share;
  const others = plan.meals.filter((m) => !(m.slot === slot && m.index === index));
  const otherTotals = dayTotals(others, S.byId);
  const budget = Math.min(Math.max(S.T - otherTotals.kcal, slotBudget * 0.6), slotBudget * 1.6);
  const proteinNeed = Math.max(S.PT * share, S.PT * PROTEIN_FLOOR - otherTotals.protein);
  // Sodium the rest of the day leaves for this meal (the same term as the planner's picks).
  const naLeft = Math.max(0, SODIUM_BUDGET - otherTotals.sodium);

  // What this slot holds on nearby days (generated, or overridden), for variety.
  const nearby = new Map<string, number>();
  const overridden = new Map<string, string>();
  for (const o of ctx.overrides ?? []) if (o && o.slot === slot && validOverride(o, S)) overridden.set(`${o.date}#${o.index}`, o.recipeId);
  for (let d = dn - (VARIETY_DAYS - 1); d <= dn + (VARIETY_DAYS - 1); d++) {
    if (d === dn) continue;
    const iso = fromDayNumber(d);
    const picks = generatedPicks(S, d);
    const ids = new Set<string>();
    S.lanes.forEach((lane, m) => {
      if (lane.slot !== slot) return;
      const id = overridden.get(`${iso}#${lane.index}`) ?? picks[m]?.id;
      if (id) ids.add(id);
    });
    for (const [key, id] of overridden) if (key.startsWith(`${iso}#`)) ids.add(id);
    for (const id of ids) nearby.set(id, Math.min(nearby.get(id) ?? Infinity, Math.abs(d - dn)));
  }
  const mainCuisines = new Set<Cuisine>();
  for (const m of others) {
    const r = isMain(m.slot) ? S.byId.get(m.recipeId) : undefined;
    if (r) mainCuisines.add(r.cuisine);
  }

  const out: SwapCandidate[] = [];
  for (const rec of S.recs.values()) {
    if (dayIds.has(rec.id) || !isEligible(rec.recipe, S.profile, slot)) continue;
    const portion = bestPortion(rec.kcal, budget);
    const kcal = rec.kcal * portion;
    const protein = rec.protein * portion;
    let score = -3 * Math.min(1, Math.abs(kcal - budget) / budget);
    score += Math.min(1.5, proteinNeed > 0 ? protein / proteinNeed : 1);
    const dist = nearby.get(rec.id);
    if (dist !== undefined) score -= 1.5 * (1 - (dist - 1) / (VARIETY_DAYS - 1));
    if (isMain(slot) && mainCuisines.has(rec.cuisine)) score -= 0.4;
    score -= Math.min(SODIUM_SCORE_CAP, (20 * Math.max(0, rec.na * portion - naLeft)) / SODIUM_BUDGET);
    if (rec.fav) score += 0.25;
    out.push({ recipe: rec.recipe, portion, kcal, protein, score });
  }
  out.sort((a, b) => b.score - a.score || (a.recipe.id < b.recipe.id ? -1 : 1));
  return out.slice(0, Math.floor(limit));
}

/**
 * The index to use for an "add to day" override in `slot`: the first index no meal of that slot uses on the day
 * (an unfilled lane is reused), or null when 0-4 are all taken.
 */
export function nextFreeIndex(plan: DayPlan, slot: MealSlot): number | null {
  const used = new Set(plan.meals.filter((m) => m.slot === slot).map((m) => m.index));
  for (let i = 0; i <= MAX_MEAL_INDEX; i++) if (!used.has(i)) return i;
  return null;
}

/**
 * The recipes a slot's table schedules on a date: rotation and small slots (one per lane), [] for greedy or empty
 * slots and invalid input. A planned day can differ: a rotation day departs to repair kcal or protein, a small slot
 * when its recipe is already on the day. A repair never takes a recipe its table schedules on a day not planned
 * yet within 6 days. For diagnostics and tests.
 */
export function tableRecipes(date: string, slot: MealSlot, ctx: PlanContext): string[] {
  if (!isISODate(date)) return [];
  const ss = getSetup(ctx).slots.get(slot);
  const t = ss && (ss.mode === 'rotation' || ss.mode === 'small') ? ss.table : null;
  if (!t) return [];
  const dn = dayNumber(date);
  const out: string[] = [];
  for (let lane = 0; lane < t.lanes; lane++) {
    const rec = tablePick(t, dn, lane);
    if (rec) out.push(rec.id);
  }
  return out;
}

/** How the planner fills each of the profile's slots (for tests, diagnostics and a "why so repetitive?" hint). */
export function describePools(ctx: PlanContext): SlotInfo[] {
  const S = getSetup(ctx);
  return [...S.slots.values()].map((ss) => ({
    slot: ss.slot,
    mealsPerDay: ss.k,
    mode: ss.mode,
    eligible: ss.eligibleCount,
    pool: ss.pool.map((r) => r.id),
    period: ss.table?.period ?? 0,
    synced: ss.synced,
  }));
}
