import { describe, expect, it } from 'vitest';
import type { Aisle, CatalogRecipe, DayPlan, Ingredient, PlannedMeal, Recipe, RecipeIngredient } from '../types.ts';
import { AISLES } from '../types.ts';
import { indexIngredients, toCatalogRecipe, zeroNutrients } from './nutrition.ts';
import { planRange } from './planner.ts';
import {
  WEEK_ROLLOVER_DAYS,
  buildShoppingList,
  buyableGrams,
  isStaple,
  isWater,
  itemAmount,
  itemCountHint,
  productName,
  shoppingDates,
  toPlainText,
} from './shopping.ts';
import { dateRange, diffDays } from './dates.ts';
import type { ShoppingItem, ShoppingList } from './shopping.ts';
import { FIXTURE_BY_ID, FIXTURE_CATALOG, FIXTURE_INDEX, makeProfile } from './test-fixtures.ts';

const day = (date: string, meals: [recipeId: string, portion: number][]): DayPlan => ({
  date,
  meals: meals.map(([recipeId, portion], i): PlannedMeal => ({ slot: 'lunch', index: i, recipeId, portion })),
  totals: zeroNutrients(),
  unfilled: [],
});

const find = (list: ShoppingList, id: string): ShoppingItem | undefined =>
  [...list.groups.flatMap((g) => g.items), ...list.staples].find((i) => i.ingredientId === id);

// shakshuka (2 servings): egg 200 g (4 piece), tomato 480 g (4 medium), onion 110 g (1 medium), olive oil 13.5 g,
//   cumin 2 g, salt 2 g, garlic 6 g (2 clove).
// red-lentil-soup (4 servings): lentils 380 g (2 cup), onion 220 g (2 medium), tomato 240 g (2 medium),
//   olive oil 27 g, cumin 5 g, salt 5 g, water 1500 g.
const oneDay = [day('2026-09-24', [['shakshuka', 1], ['red-lentil-soup', 1]])];

describe('buildShoppingList', () => {
  it('scales each line by portion / servings x household and merges by ingredient', () => {
    const list = buildShoppingList(oneDay, FIXTURE_BY_ID, FIXTURE_INDEX, 1);
    expect(find(list, 'onion')?.grams).toBeCloseTo(110 / 2 + 220 / 4, 9);
    expect(find(list, 'tomato')?.grams).toBeCloseTo(480 / 2 + 240 / 4, 9);
    expect(find(list, 'lentils-red-dry')?.grams).toBeCloseTo(95, 9);
    expect(find(list, 'olive-oil')?.grams).toBeCloseTo(13.5, 9);
    expect(find(list, 'onion')?.recipeIds).toEqual(['red-lentil-soup', 'shakshuka']);

    const three = buildShoppingList(oneDay, FIXTURE_BY_ID, FIXTURE_INDEX, 3);
    expect(find(three, 'onion')?.grams).toBeCloseTo(330, 9);
    expect(find(three, 'lentils-red-dry')?.grams).toBeCloseTo(285, 9);

    const bigger = buildShoppingList([day('2026-09-24', [['red-lentil-soup', 1.5]])], FIXTURE_BY_ID, FIXTURE_INDEX, 2);
    expect(find(bigger, 'lentils-red-dry')?.grams).toBeCloseTo((380 * 1.5 * 2) / 4, 9);
  });

  it('adds up several days', () => {
    const two = buildShoppingList([...oneDay, day('2026-09-25', [['red-lentil-soup', 2]])], FIXTURE_BY_ID, FIXTURE_INDEX, 1);
    expect(find(two, 'lentils-red-dry')?.grams).toBeCloseTo(95 + 190, 9);
    expect(find(two, 'onion')?.grams).toBeCloseTo(110 + 110, 9);
  });

  it('shows buyable grams, kg from 1000 g, and a whole-item hint when every line counts the same way', () => {
    const list = buildShoppingList(oneDay, FIXTURE_BY_ID, FIXTURE_INDEX, 1);
    expect(find(list, 'onion')).toMatchObject({ amount: '110 g', count: { qty: 1, unit: 'medium' }, countHint: '≈ 1 medium', countFirst: false });
    expect(find(list, 'tomato')).toMatchObject({ amount: '300 g', count: { qty: 3, unit: 'medium' }, countHint: '≈ 3 medium' });
    // Eggs are bought by count: the count leads, the grams follow.
    expect(find(list, 'egg-whole-raw')).toMatchObject({ amount: '2', countHint: '≈ 100 g', countFirst: true });
    expect(find(list, 'garlic')).toMatchObject({ amount: '5 g', countHint: '≈ 1 clove' }); // 3 g, rounded up to 5 g
    expect(find(list, 'lentils-red-dry')).toMatchObject({ amount: '100 g', grams: 95 }); // rounded up; grams stay exact
    expect(find(list, 'lentils-red-dry')?.countHint).toBeUndefined(); // cups are not counted things

    const week = buildShoppingList([day('2026-09-24', [['red-lentil-soup', 2], ['mujaddara', 2]])], FIXTURE_BY_ID, FIXTURE_INDEX, 4);
    expect(find(week, 'lentils-red-dry')?.amount).toBe('1.4 kg'); // 760 g + 560 g, rounded up to 100 g
    // Onion comes as "4 medium" in mujaddara but "2 medium" in the soup: same unit, so still counted.
    expect(find(week, 'onion')?.countHint).toBe('≈ 12 medium');
    // Mixed units (grams in one recipe, "medium" in another): no count.
    const mixed = buildShoppingList([day('2026-09-24', [['mujaddara', 1], ['vegetable-bulgur-pilaf', 1]])], FIXTURE_BY_ID, FIXTURE_INDEX, 1);
    expect(find(mixed, 'onion')?.countHint).toBeUndefined();
  });

  it('groups by aisle in AISLES order, puts spices, salt and oils in pantry staples and leaves out water', () => {
    const list = buildShoppingList(oneDay, FIXTURE_BY_ID, FIXTURE_INDEX, 1);
    expect(list.groups.map((g) => g.aisle)).toEqual(['produce', 'dairy-eggs', 'legumes']);
    const order = list.groups.map((g) => AISLES.indexOf(g.aisle));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(list.groups[0]?.items.map((i) => i.name)).toEqual(['Garlic', 'Onion', 'Tomato']);
    expect(list.staples.map((i) => i.ingredientId)).toEqual(['cumin-ground', 'olive-oil', 'salt']);
    expect(list.staples.every((i) => i.staple)).toBe(true);
    expect(find(list, 'water')).toBeUndefined();
    expect(list.itemCount).toBe(8);
  });

  it('ignores unknown recipes and clamps the household to 1-8', () => {
    const list = buildShoppingList([day('2026-09-24', [['no-such-recipe', 1], ['shakshuka', 1]])], FIXTURE_BY_ID, FIXTURE_INDEX, 0);
    expect(find(list, 'egg-whole-raw')?.grams).toBeCloseTo(100, 9);
    expect(find(buildShoppingList(oneDay, FIXTURE_BY_ID, FIXTURE_INDEX, 20), 'onion')?.grams).toBeCloseTo(880, 9);
    expect(find(buildShoppingList(oneDay, FIXTURE_BY_ID, FIXTURE_INDEX, Number.NaN), 'onion')?.grams).toBeCloseTo(110, 9);
    expect(buildShoppingList([], FIXTURE_BY_ID, FIXTURE_INDEX, 1)).toEqual({ groups: [], staples: [], itemCount: 0 });
  });

  it('builds from real plans: everything bought is used by a planned recipe', () => {
    const plans = planRange('2026-09-19', 7, { profile: makeProfile(), catalog: FIXTURE_CATALOG, ingredientIndex: FIXTURE_INDEX });
    const list = buildShoppingList(plans, FIXTURE_BY_ID, FIXTURE_INDEX, 2);
    const planned = new Set(plans.flatMap((p) => p.meals.map((m) => m.recipeId)));
    for (const item of [...list.groups.flatMap((g) => g.items), ...list.staples]) {
      expect(item.grams).toBeGreaterThan(0);
      expect(item.recipeIds.every((id) => planned.has(id))).toBe(true);
    }
  });
});

describe('water and staples', () => {
  it('recognises water but not watermelon or water chestnuts', () => {
    expect(isWater('water')).toBe(true);
    expect(isWater('water-boiling')).toBe(true);
    expect(isWater('tap', 'Water')).toBe(true);
    expect(isWater('watermelon')).toBe(false);
    expect(isWater('water-chestnut-canned')).toBe(false);
  });

  it('treats spices, oils, vinegars and any salt as staples', () => {
    expect(isStaple('cumin-ground', 'spices')).toBe(true);
    expect(isStaple('vinegar-apple', 'oils-vinegars')).toBe(true);
    expect(isStaple('sea-salt', 'condiments-sauces')).toBe(true);
    expect(isStaple('salted-butter', 'dairy-eggs')).toBe(false);
    expect(isStaple('onion', 'produce')).toBe(false);
  });
});

describe('toPlainText', () => {
  it('writes a copyable list', () => {
    const list = buildShoppingList(oneDay, FIXTURE_BY_ID, FIXTURE_INDEX, 1);
    expect(toPlainText(list)).toBe(
      [
        'Shopping list',
        '',
        'Produce',
        '- Garlic: 5 g (≈ 1 clove)',
        '- Onion: 110 g (≈ 1 medium)',
        '- Tomato: 300 g (≈ 3 medium)',
        '',
        'Dairy and eggs',
        '- Egg: 2 (≈ 100 g)',
        '',
        'Legumes',
        '- Red lentils (dry): 100 g',
        '',
        'Pantry staples',
        '- Cumin, ground: 3 g',
        '- Olive oil: 14 g',
        '- Salt: 3 g',
        '',
      ].join('\n'),
    );
  });

  it('can skip checked items and translate headings', () => {
    const list = buildShoppingList(oneDay, FIXTURE_BY_ID, FIXTURE_INDEX, 1);
    const text = toPlainText(list, { title: 'Sufra', skip: ['egg-whole-raw', 'salt', 'cumin-ground', 'olive-oil'], aisleLabel: (a) => a.toUpperCase(), staplesLabel: 'Pantry' });
    expect(text.startsWith('Sufra\n\nPRODUCE\n')).toBe(true);
    expect(text).not.toContain('Egg');
    expect(text).not.toContain('DAIRY-EGGS');
    expect(text).not.toContain('Pantry');
    expect(text).toContain('LEGUMES\n- Red lentils (dry): 100 g');
  });
});

describe('shoppingDates', () => {
  it('covers today, the next 3 days, or the rest of the week', () => {
    expect(shoppingDates('today', '2026-09-24', 'saturday')).toEqual(['2026-09-24']);
    expect(shoppingDates('next3', '2026-09-24', 'saturday')).toEqual(['2026-09-24', '2026-09-25', '2026-09-26']);
    // Thursday, Monday week: the rest of the week, through Sunday.
    expect(shoppingDates('week', '2026-09-24', 'monday')).toEqual(['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27']);
    expect(shoppingDates('week', '2026-09-19', 'saturday')).toHaveLength(7);
    // Wednesday, Saturday week: Wednesday to Friday, 3 days, no rollover yet.
    expect(shoppingDates('week', '2026-09-23', 'saturday')).toEqual(['2026-09-23', '2026-09-24', '2026-09-25']);
  });

  it("rolls 'week' over to the next week in the week's last days, so it is never shorter than 'next3' (regression)", () => {
    expect(WEEK_ROLLOVER_DAYS).toBe(3);
    // Friday with a Saturday week (the eve of the usual weekly shop): Friday plus the whole next week.
    expect(shoppingDates('week', '2026-09-25', 'saturday')).toEqual(dateRange('2026-09-25', 8));
    // Thursday with a Saturday week: Thursday through next Friday.
    expect(shoppingDates('week', '2026-09-24', 'saturday')).toEqual(dateRange('2026-09-24', 9));
    // Sunday with a Monday week.
    expect(shoppingDates('week', '2026-09-27', 'monday')).toEqual(dateRange('2026-09-27', 8));
    for (const ws of ['saturday', 'sunday', 'monday'] as const) {
      for (const today of dateRange('2026-09-19', 14)) {
        const week = shoppingDates('week', today, ws);
        expect(week.length, `${today} ${ws}`).toBeGreaterThanOrEqual(shoppingDates('next3', today, ws).length);
        expect(week.length).toBeLessThanOrEqual(9);
        expect(week[0]).toBe(today);
        expect(diffDays(today, week[week.length - 1] as string)).toBe(week.length - 1);
      }
    }
  });
});

describe('localized output', () => {
  const unitLabel = (unit: string, qty: number) => `[${unit}${qty > 1 ? 's' : ''}]`;

  it('formats amounts and count hints with the given locale and unit words (regression)', () => {
    const list = buildShoppingList([day('2026-09-24', [['red-lentil-soup', 2], ['mujaddara', 2]])], FIXTURE_BY_ID, FIXTURE_INDEX, 4, { locale: 'de', unitLabel });
    expect(find(list, 'lentils-red-dry')?.amount).toBe('1,4 [kgs]');
    expect(find(list, 'onion')?.countHint).toBe('≈ 12 [mediums]');
    // Defaults stay English.
    const en = buildShoppingList(oneDay, FIXTURE_BY_ID, FIXTURE_INDEX, 1);
    expect(itemAmount(find(en, 'onion') as ShoppingItem)).toBe('110 g');
    expect(itemCountHint(find(en, 'garlic') as ShoppingItem, { unitLabel })).toBe('≈ 1 [clove]');
    expect(itemCountHint(find(en, 'lentils-red-dry') as ShoppingItem)).toBeUndefined();
  });

  it('lets every word of the shared text be translated (regression)', () => {
    const list = buildShoppingList(oneDay, FIXTURE_BY_ID, FIXTURE_INDEX, 1);
    const text = toPlainText(list, {
      title: 'قائمة',
      aisleLabel: () => 'X',
      staplesLabel: 'Y',
      locale: 'ar-EG',
      unitLabel: (unit) => `{${unit}}`,
      itemName: (i) => `<${i.ingredientId}>`,
      formatLine: ({ name, amount, countHint }) => `* ${name} ${amount}${countHint ? ` / ${countHint}` : ''}`,
    });
    expect(text).not.toMatch(/Onion|Pantry|Shopping|\d g\b|≈ \d+ medium|: /);
    expect(text).toContain('* <onion> ١١٠ {g} / ≈ ١ {medium}');
    expect(text).toContain('* <garlic> ٥ {g} / ≈ ١ {clove}');
    expect(text.startsWith('قائمة\n\nX\n')).toBe(true);
  });
});

describe('buyable amounts, counts, variants and staples', () => {
  const nut = { kcal: 100, protein: 5, carbs: 10, fiber: 1, sugars: 1, fat: 4, satFat: 1, sodium: 50 };
  const ing = (id: string, name: string, aisle: Aisle, extra: Partial<Ingredient> = {}): Ingredient => ({ id, name, aisle, per100g: nut, allergens: [], ...extra });
  const INGS: Ingredient[] = [
    ing('beef-ground-90-raw', 'Ground beef, 90% lean (raw)', 'meat-poultry', { animal: 'meat' }),
    ing('beef-ground-95-raw', 'Ground beef, 95% lean (raw)', 'meat-poultry', { animal: 'meat' }),
    ing('beef-ground-85-raw', 'Ground beef, 85% lean (raw)', 'meat-poultry', { animal: 'meat' }),
    ing('black-beans-canned-drained', 'Black beans (canned, drained)', 'legumes'),
    ing('black-beans-canned-low-sodium-drained', 'Black beans, low-sodium (canned, drained)', 'legumes'),
    ing('yogurt-plain-low-fat', 'Plain yogurt, low-fat', 'dairy-eggs', { animal: 'dairy' }),
    ing('greek-yogurt-nonfat', 'Greek yogurt, plain, nonfat', 'dairy-eggs', { animal: 'dairy' }),
    ing('egg-raw', 'Egg', 'dairy-eggs', { animal: 'egg' }),
    ing('parsley-fresh', 'Parsley', 'herbs'),
    ing('yeast-dry', 'Active dry yeast', 'baking-sweeteners'),
    ing('sugar', 'Sugar', 'baking-sweeteners'),
    ing('pita-whole-wheat', 'Whole-wheat pita', 'bakery-grains'),
  ];
  const INDEX = indexIngredients(INGS);
  const line = (ingredientId: string, grams: number, qty: number, unit: RecipeIngredient['unit']): RecipeIngredient => ({ ingredientId, grams, qty, unit });
  const recipe = (id: string, ingredients: RecipeIngredient[]): CatalogRecipe =>
    toCatalogRecipe(
      { id, name: id, cuisine: 'iraqi', slots: ['lunch'], description: '', servings: 2, prepMinutes: 5, cookMinutes: 5, ingredients, steps: [], tags: [] } satisfies Recipe,
      INDEX,
    );
  const A = recipe('a', [
    line('beef-ground-90-raw', 250, 250, 'g'),
    line('black-beans-canned-drained', 240, 1, 'can'),
    line('yogurt-plain-low-fat', 245, 1, 'cup'),
    line('egg-raw', 100, 2, 'large'),
    line('parsley-fresh', 60, 1, 'cup'),
    line('yeast-dry', 3, 1, 'tsp'),
    line('sugar', 4, 1, 'tsp'),
    line('pita-whole-wheat', 120, 2, 'piece'),
  ]);
  const B = recipe('b', [
    line('beef-ground-95-raw', 250, 250, 'g'),
    line('black-beans-canned-low-sodium-drained', 240, 1, 'can'),
    line('greek-yogurt-nonfat', 200, 1, 'cup'),
    line('egg-raw', 50, 1, 'piece'),
    line('parsley-fresh', 10, 1, 'handful'),
  ]);
  const BY_ID = new Map([A, B].map((r) => [r.id, r]));
  const list = buildShoppingList([day('2026-09-24', [['a', 1], ['b', 1]])], BY_ID, INDEX, 1);
  const all = [...list.groups.flatMap((g) => g.items), ...list.staples];
  const byName = (name: string) => all.find((i) => i.name === name);

  it('rounds grams up to a buyable step, and pantry staples to whole grams', () => {
    expect([0, 0.4, 3, 6.3, 45, 50, 95, 110, 251, 999, 1320].map((g) => buyableGrams(g))).toEqual([0, 5, 5, 10, 45, 50, 100, 110, 300, 1000, 1400]);
    expect([0.04, 0.4, 2.3, 13.5, 60].map((g) => buyableGrams(g, true))).toEqual([0.1, 0.4, 3, 14, 60]);
    for (const item of all) expect(buyableGrams(item.grams, item.staple)).toBeGreaterThanOrEqual(item.grams);
  });

  it('merges variants of one product into one line, named after the lower-salt variant, keyed on a stable id', () => {
    expect(productName('Ground beef, 90% lean (raw)')).toBe(productName('Ground beef, 95% lean (raw)'));
    expect(productName('Black beans, low-sodium (canned, drained)')).toBe('black beans (canned, drained)');
    expect(productName('Milk, whole (3.25%)')).toBe(productName('Milk, 1%'));
    expect(productName('Greek yogurt, plain, nonfat')).not.toBe(productName('Plain yogurt, low-fat'));
    const beef = all.filter((i) => i.name.startsWith('Ground beef'));
    expect(beef).toHaveLength(1);
    // Keyed on the group's first id in the whole index (85% lean), which neither recipe uses: a stable checkmark key.
    expect(beef[0]).toMatchObject({ ingredientId: 'beef-ground-85-raw', ingredientIds: ['beef-ground-90-raw', 'beef-ground-95-raw'], grams: 250, amount: '250 g' });
    const beans = all.filter((i) => i.name.startsWith('Black beans'));
    expect(beans).toHaveLength(1);
    expect(beans[0]).toMatchObject({ name: 'Black beans, low-sodium (canned, drained)', amount: '1 can', countHint: '≈ 240 g', countFirst: true });
    // Greek and plain yogurt are different products.
    expect(all.filter((i) => /yogurt/i.test(i.name))).toHaveLength(2);
  });

  it('leads with the count for eggs, cans and pieces, and sells fresh herbs by the bunch', () => {
    // 2 large + 1 piece: mixed units, still counted (50 g an egg).
    expect(byName('Egg')).toMatchObject({ amount: '2', countHint: '≈ 80 g', countFirst: true });
    expect(byName('Whole-wheat pita')).toMatchObject({ amount: '1', countHint: '≈ 60 g', countFirst: true });
    expect(byName('Parsley')).toMatchObject({ count: { qty: 1, unit: 'bunch' }, amount: '1 bunch', countHint: '≈ 35 g', countFirst: true });
    const big = buildShoppingList([day('2026-09-24', [['a', 2], ['b', 2]])], BY_ID, INDEX, 4);
    expect(big.groups.flatMap((g) => g.items).find((i) => i.name === 'Parsley')?.amount).toBe('5 bunches'); // 280 g
  });

  it('puts leaveners and small amounts of sugar in the pantry staples', () => {
    expect(list.staples.map((i) => i.name)).toEqual(['Active dry yeast', 'Sugar']);
    expect(isStaple('yeast-dry', 'baking-sweeteners')).toBe(true);
    expect(isStaple('baking-powder', 'baking-sweeteners')).toBe(true);
    expect(isStaple('sugar', 'baking-sweeteners')).toBe(false);
    expect(isStaple('sugar', 'baking-sweeteners', 12)).toBe(true);
    expect(isStaple('sugar', 'baking-sweeteners', 200)).toBe(false);
    expect(isStaple('mustard-yellow', 'condiments-sauces', 6)).toBe(true);
    expect(isStaple('onion', 'produce', 1)).toBe(false);
    // The plain text uses the same amounts.
    const text = toPlainText(list);
    expect(text).toContain('- Egg: 2 (≈ 80 g)');
    expect(text).toContain('- Parsley: 1 bunch (≈ 35 g)');
    expect(text).toContain('- Active dry yeast: 2 g');
  });
});
