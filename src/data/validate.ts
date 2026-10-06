// Quality gate for the recipe library. Errors fail `pnpm test`; warnings show in `pnpm report`.
// The health rules here are the definition of "healthy" for Sufra; see SPEC.md.
import type { CatalogRecipe, Ingredient, MealSlot, Recipe, Unit } from '../types.ts';
import { AISLES, ALLERGENS, MEAL_SLOTS, NUTRIENT_KEYS } from '../types.ts';
import { atwaterKcal, toCatalogRecipe, type IngredientIndex } from '../lib/nutrition.ts';

export interface Issue {
  level: 'error' | 'warning';
  /** Ingredient or recipe id. */
  subject: string;
  message: string;
}

/** Per-serving limits by meal slot, at portion 1. */
export const HEALTH_RULES: Record<
  MealSlot,
  {
    kcal: [number, number];
    minProtein: number;
    minFiber: number;
    maxSodium: number;
    maxFreeSugar: number;
  }
> = {
  breakfast: { kcal: [250, 650], minProtein: 10, minFiber: 3, maxSodium: 700, maxFreeSugar: 12 },
  lunch: { kcal: [350, 800], minProtein: 15, minFiber: 4, maxSodium: 900, maxFreeSugar: 8 },
  dinner: { kcal: [350, 800], minProtein: 15, minFiber: 4, maxSodium: 900, maxFreeSugar: 8 },
  snack: { kcal: [80, 350], minProtein: 0, minFiber: 0, maxSodium: 350, maxFreeSugar: 10 },
};

/** Saturated fat as a share of energy: error above, warning above SAT_FAT_WARN. */
export const SAT_FAT_MAX = 0.12;
export const SAT_FAT_WARN = 0.1;
/** Total fat as a share of energy: warning above. */
export const FAT_WARN = 0.45;

/** Words that make a recipe or ingredient non-halal. Checked in ids, names, steps and tips. */
export const HARAM_PATTERNS: readonly RegExp[] = [
  /\bpork\b/i,
  /\bbacon\b/i,
  /\bham\b/i,
  /\blard\b/i,
  /\bgelatine?\b/i,
  /\bwine\b/i,
  /\bbeer\b/i,
  /\brum\b/i,
  /\bbrandy\b/i,
  /\bsherry\b/i,
  /\bsake\b/i,
  /\bmirin\b/i,
  /\bliqueur\b/i,
  /\bvodka\b/i,
  /\bwhiske?y\b/i,
  /\bcognac\b/i,
  /\bprosciutto\b/i,
  /\bpancetta\b/i,
  /\bchorizo\b/i,
  /\bsalami\b/i,
  /\bpepperoni\b/i,
  /\bvanilla extract\b/i,
  /\bblood\b/i,
];

/** Plausible grams for one unit of each measure. Outside the range is a warning; outside 2x the range is an error. */
export const UNIT_GRAMS: Partial<Record<Unit, [number, number]>> = {
  tsp: [0.5, 8],
  tbsp: [1.5, 25],
  cup: [15, 350],
  pinch: [0.05, 1],
  clove: [2, 7],
  slice: [8, 60],
  bunch: [20, 250],
  sprig: [0.2, 5],
  handful: [8, 60],
  can: [150, 450],
  stalk: [15, 70],
  leaf: [0.1, 5],
};

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function haramMatches(text: string): string[] {
  return HARAM_PATTERNS.filter((re) => re.test(text)).map((re) => re.source);
}

export function validateIngredients(list: readonly Ingredient[]): Issue[] {
  const issues: Issue[] = [];
  const seen = new Set<string>();
  const names = new Map<string, string>();
  for (const ing of list) {
    const err = (message: string) => issues.push({ level: 'error', subject: ing.id, message });
    const warn = (message: string) => issues.push({ level: 'warning', subject: ing.id, message });

    if (seen.has(ing.id)) err('duplicate ingredient id');
    seen.add(ing.id);
    const nameKey = ing.name.toLowerCase();
    if (names.has(nameKey)) err(`duplicate ingredient name, also used by "${names.get(nameKey)}"`);
    names.set(nameKey, ing.id);

    if (!KEBAB.test(ing.id)) err('id must be kebab-case');
    if (!ing.name.trim()) err('name is empty');
    if (!AISLES.includes(ing.aisle)) err(`unknown aisle "${ing.aisle}"`);
    for (const a of ing.allergens) if (!ALLERGENS.includes(a)) err(`unknown allergen "${a}"`);
    for (const m of haramMatches(`${ing.id} ${ing.name}`)) err(`non-halal term /${m}/`);

    const n = ing.per100g;
    for (const k of NUTRIENT_KEYS) {
      if (!Number.isFinite(n[k]) || n[k] < 0) err(`per100g.${k} must be a finite number >= 0`);
    }
    if (n.kcal > 902) err('kcal above 902 per 100 g is impossible');
    if (n.protein + n.carbs + n.fat > 100.5) err('protein + carbs + fat exceeds 100 g per 100 g');
    if (n.fiber > n.carbs + 0.5) err('fiber exceeds total carbs (carbs must include fiber)');
    if (n.sugars > n.carbs + 0.5) err('sugars exceed total carbs');
    if (n.satFat > n.fat + 0.1) err('saturated fat exceeds total fat');
    if (n.sodium > 40_000) err('sodium above 40,000 mg per 100 g (table salt is ~38,758)');

    const est = atwaterKcal(n);
    const diff = Math.abs(n.kcal - est);
    if (diff > Math.max(25, 0.2 * n.kcal)) err(`kcal ${n.kcal} disagrees with macros (Atwater ≈ ${Math.round(est)})`);
    else if (diff > Math.max(15, 0.1 * n.kcal)) warn(`kcal ${n.kcal} vs Atwater ≈ ${Math.round(est)}`);

    const hasAllergen = (a: (typeof ALLERGENS)[number]) => ing.allergens.includes(a);
    if (ing.animal === 'dairy' && !hasAllergen('dairy')) err('animal "dairy" must list the dairy allergen');
    if (ing.animal === 'egg' && !hasAllergen('egg')) err('animal "egg" must list the egg allergen');
    if (ing.animal === 'fish' && !hasAllergen('fish')) err('animal "fish" must list the fish allergen');
    if (ing.animal === 'shellfish' && !hasAllergen('shellfish')) err('animal "shellfish" must list the shellfish allergen');
    if (hasAllergen('dairy') && ing.animal !== 'dairy') warn('lists dairy allergen but animal is not "dairy"');
    if ((ing.animal === 'meat' || ing.animal === 'poultry') && !ing.halalNote) err('meat and poultry need a halalNote');
  }
  return issues;
}

function unitIssues(recipe: Recipe): Issue[] {
  const issues: Issue[] = [];
  recipe.ingredients.forEach((ri, i) => {
    const at = `ingredient #${i + 1} (${ri.ingredientId})`;
    const err = (message: string) => issues.push({ level: 'error', subject: recipe.id, message: `${at}: ${message}` });
    const warn = (message: string) => issues.push({ level: 'warning', subject: recipe.id, message: `${at}: ${message}` });

    if (!(ri.grams > 0)) err('grams must be > 0');
    if (ri.unit === 'to-taste') {
      if (ri.qty !== 0) err('"to-taste" must have qty 0');
      return;
    }
    if (!(ri.qty > 0)) err('qty must be > 0');
    if (ri.unit === 'g' && Math.abs(ri.grams - ri.qty) > 0.01) err(`unit g but qty ${ri.qty} != grams ${ri.grams}`);
    if (ri.unit === 'kg' && Math.abs(ri.grams - ri.qty * 1000) > 0.5) err(`unit kg but qty ${ri.qty} != grams ${ri.grams}`);
    if (ri.unit === 'ml' || ri.unit === 'l') {
      const ml = ri.unit === 'l' ? ri.qty * 1000 : ri.qty;
      const density = ri.grams / ml;
      if (density < 0.3 || density > 1.6) err(`${ml} ml weighing ${ri.grams} g is an implausible density`);
    }
    const range = UNIT_GRAMS[ri.unit];
    if (range && ri.qty > 0) {
      const each = ri.grams / ri.qty;
      if (each < range[0] / 2 || each > range[1] * 2) err(`${each.toFixed(1)} g per ${ri.unit} is implausible`);
      else if (each < range[0] || each > range[1]) warn(`${each.toFixed(1)} g per ${ri.unit} looks off`);
    }
  });
  return issues;
}

export function validateRecipe(recipe: Recipe, index: IngredientIndex): Issue[] {
  const issues: Issue[] = [];
  const err = (message: string) => issues.push({ level: 'error', subject: recipe.id, message });
  const warn = (message: string) => issues.push({ level: 'warning', subject: recipe.id, message });

  if (!KEBAB.test(recipe.id)) err('id must be kebab-case');
  if (!recipe.name.trim()) err('name is empty');
  if (!recipe.description.trim()) err('description is empty');
  if (recipe.slots.length === 0) err('slots is empty');
  if (new Set(recipe.slots).size !== recipe.slots.length) err('slots has duplicates');
  for (const s of recipe.slots) if (!MEAL_SLOTS.includes(s)) err(`unknown slot "${s}"`);
  if (!Number.isInteger(recipe.servings) || recipe.servings < 1 || recipe.servings > 12) err('servings must be an integer 1-12');
  if (!Number.isInteger(recipe.prepMinutes) || recipe.prepMinutes < 0) err('prepMinutes must be an integer >= 0');
  if (!Number.isInteger(recipe.cookMinutes) || recipe.cookMinutes < 0) err('cookMinutes must be an integer >= 0');
  if (recipe.ingredients.length < 2) err('needs at least 2 ingredients');
  if (recipe.steps.length < 2) err('needs at least 2 steps');
  if (recipe.steps.some((s) => !s.trim())) err('has an empty step');

  const text = [recipe.id, recipe.name, recipe.nativeName ?? '', recipe.description, ...recipe.steps, ...(recipe.tips ?? [])].join('\n');
  for (const m of haramMatches(text)) err(`non-halal term /${m}/ in recipe text`);

  const missing = recipe.ingredients.filter((ri) => !index.has(ri.ingredientId)).map((ri) => ri.ingredientId);
  if (missing.length) {
    err(`unknown ingredient ids: ${missing.join(', ')}`);
    return issues;
  }
  const ids = recipe.ingredients.map((ri) => ri.ingredientId);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) warn(`ingredient listed more than once: ${[...new Set(dupes)].join(', ')}`);

  issues.push(...unitIssues(recipe));
  issues.push(...healthIssues(toCatalogRecipe(recipe, index)));
  return issues;
}

export function healthIssues(r: CatalogRecipe): Issue[] {
  const issues: Issue[] = [];
  const err = (message: string) => issues.push({ level: 'error', subject: r.id, message });
  const warn = (message: string) => issues.push({ level: 'warning', subject: r.id, message });
  const n = r.perServing;
  const fmt = (x: number) => (Math.round(x * 10) / 10).toString();

  const kcalFits = r.slots.map((s) => n.kcal >= HEALTH_RULES[s].kcal[0] && n.kcal <= HEALTH_RULES[s].kcal[1]);
  if (!kcalFits.some(Boolean)) err(`${Math.round(n.kcal)} kcal per serving fits none of its slots (${r.slots.join(', ')})`);
  else if (!kcalFits.every(Boolean)) warn(`${Math.round(n.kcal)} kcal per serving is outside the range for some of its slots`);

  for (const s of r.slots) {
    const rule = HEALTH_RULES[s];
    if (n.protein < rule.minProtein) err(`${fmt(n.protein)} g protein is below ${rule.minProtein} g for ${s}`);
    if (n.fiber < rule.minFiber) err(`${fmt(n.fiber)} g fiber is below ${rule.minFiber} g for ${s}`);
    if (n.sodium > rule.maxSodium) err(`${Math.round(n.sodium)} mg sodium exceeds ${rule.maxSodium} mg for ${s}`);
    if (r.freeSugarPerServing > rule.maxFreeSugar) err(`${fmt(r.freeSugarPerServing)} g free sugar exceeds ${rule.maxFreeSugar} g for ${s}`);
  }

  if (n.kcal > 0) {
    const satShare = (n.satFat * 9) / n.kcal;
    if (satShare > SAT_FAT_MAX) err(`saturated fat is ${Math.round(satShare * 100)}% of energy (max ${SAT_FAT_MAX * 100}%)`);
    else if (satShare > SAT_FAT_WARN) warn(`saturated fat is ${Math.round(satShare * 100)}% of energy`);
    const fatShare = (n.fat * 9) / n.kcal;
    if (fatShare > FAT_WARN) warn(`fat is ${Math.round(fatShare * 100)}% of energy`);
  }

  const proteinShare = n.kcal > 0 ? (n.protein * 4) / n.kcal : 0;
  if (r.tags.includes('quick') && r.totalMinutes > 30) err(`tagged quick but takes ${r.totalMinutes} min`);
  if (r.tags.includes('no-cook') && r.cookMinutes > 0) err('tagged no-cook but cookMinutes > 0');
  if (r.tags.includes('high-protein') && n.protein < 25 && proteinShare < 0.25) err('tagged high-protein but has < 25 g protein and < 25% energy from protein');
  if (r.tags.includes('high-fiber') && n.fiber < 8) err(`tagged high-fiber but has ${fmt(n.fiber)} g fiber (< 8 g)`);
  return issues;
}

export function validateLibrary(recipes: readonly Recipe[], ingredients: readonly Ingredient[], index: IngredientIndex): Issue[] {
  const issues = validateIngredients(ingredients);
  const seen = new Set<string>();
  for (const r of recipes) {
    if (seen.has(r.id)) issues.push({ level: 'error', subject: r.id, message: 'duplicate recipe id' });
    seen.add(r.id);
    issues.push(...validateRecipe(r, index));
  }
  return issues;
}
