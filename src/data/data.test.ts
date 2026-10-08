import { describe, expect, it } from 'vitest';
import type { MealSlot } from '../types.ts';
import { CATALOG, INGREDIENTS, RECIPES, ingredientIndex } from './index.ts';
import { validateLibrary } from './validate.ts';
import { coverage } from './coverage.ts';

const issues = validateLibrary(RECIPES, INGREDIENTS, ingredientIndex);
const errors = issues.filter((i) => i.level === 'error').map((i) => `${i.subject}: ${i.message}`);

describe('recipe library', () => {
  it('has no validation errors (run `pnpm report` for details)', () => {
    expect(errors).toEqual([]);
  });

  it('covers every slot and diet well enough to plan a week without repeats', () => {
    const short = coverage(CATALOG)
      .filter((row) => row.count < row.min)
      .map((row) => `${row.label} / ${row.slot}: ${row.count} < ${row.min}`);
    expect(short).toEqual([]);
  });
});

// The planner scales a recipe from 0.5 to 2 portions to hit the day's kcal, so what keeps a day under about
// 2,300 mg of sodium is sodium per kcal, not per serving. A 2,000 kcal day at 1,000 mg per 1,000 kcal is 2,000 mg.
const MAX_SODIUM_PER_1000_KCAL = 1500;
const MAX_MEDIAN_SODIUM_PER_1000_KCAL = 1000;
const density = (r: (typeof CATALOG)[number]) => (1000 * r.perServing.sodium) / r.perServing.kcal;

describe('sodium density', () => {
  it(`keeps every recipe at or below ${MAX_SODIUM_PER_1000_KCAL} mg sodium per 1,000 kcal`, () => {
    const over = CATALOG.filter((r) => density(r) > MAX_SODIUM_PER_1000_KCAL).map((r) => `${r.id}: ${Math.round(density(r))}`);
    expect(over).toEqual([]);
  });

  it.each(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[])(
    `keeps the median %s recipe at or below ${MAX_MEDIAN_SODIUM_PER_1000_KCAL} mg per 1,000 kcal`,
    (slot) => {
      const list = CATALOG.filter((r) => r.slots.includes(slot)).map(density).sort((a, b) => a - b);
      expect(Math.round(list[list.length >> 1] ?? 0)).toBeLessThanOrEqual(MAX_MEDIAN_SODIUM_PER_1000_KCAL);
    },
  );
});

// Recipe text is written once for the whole recipe, but the ingredient list scales with the servings stepper.
// So steps, tips and prep notes never quote a whole-recipe amount: they say "half the oil", "the remaining
// water", or give a ratio or per-serving amount ("330 ml of the water for every cup of rice", "1 tbsp per bowl").
const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?\s*[½⅓¼¾⅔⅛]?|[½⅓¼¾⅔⅛])`;
const UNIT = String.raw`(?:ml|l|litres?|liters?|g|kg|cups?|tbsp|tsp|tablespoons?|teaspoons?)`;
const MEASURE = new RegExp(String.raw`(?<![\w/])${NUM}(?:\s*-\s*${NUM})?\s*-?\s*${UNIT}(?![\w])`, 'gi');
const WORD_MEASURE = /\b(?:a|an|one|two|three|half a)\s+(?:cup|tablespoon|teaspoon|tbsp|tsp|litre|liter)s?\s+of\b/gi;
/** A measure is fine when its clause makes it relative: "each", "per serving", "for every cup of rice". */
const RELATIVE = /\b(?:each|per|for every)\b/i;

function wholeRecipeAmounts(text: string): string[] {
  const found: string[] = [];
  for (const re of [MEASURE, WORD_MEASURE]) {
    for (const m of text.matchAll(re)) {
      const at = m.index ?? 0;
      const before = text.slice(0, at).split(/[.;:,()]/).pop() ?? '';
      const after = text.slice(at).split(/[.;:,()]/)[0] ?? '';
      if (!RELATIVE.test(before + after)) found.push(m[0]);
    }
  }
  return found;
}

const PREP_ALLOWED = [
  /\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?\s*(?:cm|mm|°C|%|minutes?|hours?|seconds?|times)(?![a-z])/gi,
  /(?:about\s+)?\d+(?:[.,]\d+)?\s*(?:g|ml)\s+(?:each|per|can|tin|jar|pack)\b/gi,
];
const COUNT = /[\d½⅓¼¾⅔⅛]|(?<![\p{L}-])(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen)(?!\p{L}|-(?:thirds?|quarters?|fifths?|eighths?))/iu;

function prepCounts(prep: string): boolean {
  return COUNT.test(PREP_ALLOWED.reduce((s, re) => s.replace(re, ''), prep));
}

describe('recipe text scales with the servings stepper', () => {
  it('flags whole-recipe amounts and allows relative ones', () => {
    expect(wholeRecipeAmounts('ladle over 480 ml (2 cups) of the hot broth')).toEqual(['480 ml', '2 cups']);
    expect(wholeRecipeAmounts('Heat 1 tbsp of the oil, then add 1/2 tsp salt and a cup of water.')).toEqual(['1 tbsp', '1/2 tsp', 'a cup of']);
    expect(wholeRecipeAmounts('Mix 1 1/2 tbsp sumac and 1½ teaspoons syrup; use 1/4-cup scoops.')).toEqual(['1 1/2 tbsp', '1½ teaspoons', '1/4-cup']);
    expect(wholeRecipeAmounts('ladle over 1 cup of the hot broth for every cup of couscous')).toEqual([]);
    expect(wholeRecipeAmounts('measure out about 180 ml for every 100 g of rice (top up with water if short)')).toEqual([]);
    expect(wholeRecipeAmounts('top each with 1 tbsp per bowl; about 2 teaspoons each; crumble it into a cup')).toEqual([]);
    expect(wholeRecipeAmounts('Heat half the oil to 180 °C in a 26 cm pan for 2 minutes, 2 large eggs')).toEqual([]);
    expect(prepCounts('12 halves')).toBe(true);
    expect(prepCounts('cut into 2 wedges')).toBe(true);
    expect(prepCounts('1 finely ground, 1 pierced')).toBe(true);
    expect(prepCounts('about ⅓ cup')).toBe(true);
    expect(prepCounts('peeled; four left whole')).toBe(true);
    expect(prepCounts('two-thirds sliced, the rest crushed')).toBe(false);
    expect(prepCounts('large (about 64 g each), cut into 2-3 cm squares')).toBe(false);
    expect(prepCounts('400 g can, drained and rinsed; soaked 20 minutes, rinsed 3 times')).toBe(false);
  });

  it('never quotes a whole-recipe amount in steps or tips', () => {
    const found = RECIPES.flatMap((r) =>
      [...r.steps, ...(r.tips ?? [])].flatMap((s) => wholeRecipeAmounts(s).map((a) => `${r.id}: "${a}" in "${s.slice(0, 70)}"`)),
    );
    expect(found).toEqual([]);
  });

  it('never puts a whole-recipe count in an ingredient prep note', () => {
    const found = RECIPES.flatMap((r) => r.ingredients.filter((ri) => ri.prep && prepCounts(ri.prep)).map((ri) => `${r.id}/${ri.ingredientId}: ${ri.prep}`));
    expect(found).toEqual([]);
  });
});

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/ı/g, 'i').toLowerCase();

describe('native names', () => {
  it('only appear when they add something to the English name', () => {
    const redundant = RECIPES.filter((r) => r.nativeName && fold(r.name).includes(fold(r.nativeName))).map((r) => `${r.id}: ${r.nativeName}`);
    expect(redundant).toEqual([]);
  });
});

describe('ingredient label notes', () => {
  it('warn about hidden non-halal or shellfish components in packaged items', () => {
    const needNote = ['green-curry-paste', 'tortilla-corn', 'tortilla-whole-wheat', 'soy-sauce-reduced-sodium', 'mustard-yellow', 'vinegar-rice', 'vegetable-broth'];
    expect(needNote.filter((id) => !ingredientIndex.get(id)?.halalNote)).toEqual([]);
    expect(ingredientIndex.get('green-curry-paste')?.halalNote).toMatch(/shrimp paste \(shellfish\)/);
  });
});
