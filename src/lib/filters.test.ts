import { describe, expect, it } from 'vitest';
import type { Diet } from '../types.ts';
import {
  QUICK_MINUTES,
  cuisinesIn,
  eligibleRecipes,
  filterRecipes,
  fitsDiet,
  ineligibleReasons,
  isEligible,
  matchesQuery,
  normalizeText,
  queryWordForms,
  searchScore,
} from './filters.ts';
import { FIXTURE_BY_ID, FIXTURE_CATALOG, FIXTURE_INDEX, makeProfile } from './test-fixtures.ts';

const r = (id: string) => {
  const found = FIXTURE_BY_ID.get(id);
  if (!found) throw new Error(`no fixture ${id}`);
  return found;
};
const ids = (list: readonly { id: string }[]) => list.map((x) => x.id);
const ctx = { ingredientIndex: FIXTURE_INDEX, favorites: [] as string[] };

describe('diet hierarchy', () => {
  it('nests vegan ⊂ vegetarian ⊂ pescatarian ⊂ omnivore', () => {
    const diets: Diet[] = ['vegan', 'vegetarian', 'pescatarian', 'omnivore'];
    const sets = diets.map((d) => new Set(FIXTURE_CATALOG.filter((x) => fitsDiet(x, d)).map((x) => x.id)));
    for (let i = 0; i < sets.length - 1; i++) {
      for (const id of sets[i] as Set<string>) expect(sets[i + 1]?.has(id), `${id} in ${diets[i + 1]}`).toBe(true);
      expect((sets[i] as Set<string>).size).toBeLessThan((sets[i + 1] as Set<string>).size);
    }
    expect(sets[3]?.size).toBe(FIXTURE_CATALOG.length);
  });

  it('places animal products correctly', () => {
    expect(fitsDiet(r('salmon-rice-plate'), 'pescatarian')).toBe(true);
    expect(fitsDiet(r('salmon-rice-plate'), 'vegetarian')).toBe(false);
    expect(fitsDiet(r('chicken-bulgur-pilaf'), 'pescatarian')).toBe(false);
    expect(fitsDiet(r('chicken-bulgur-pilaf'), 'omnivore')).toBe(true);
    expect(fitsDiet(r('yogurt-oat-bowl'), 'vegetarian')).toBe(true);
    expect(fitsDiet(r('yogurt-oat-bowl'), 'vegan')).toBe(false);
    expect(fitsDiet(r('apple-oat-porridge'), 'vegan')).toBe(true);
    expect(fitsDiet(r('shakshuka'), 'vegan')).toBe(false);
  });
});

describe('isEligible', () => {
  it('checks the slot only when one is given', () => {
    const p = makeProfile();
    expect(isEligible(r('shakshuka'), p)).toBe(true);
    expect(isEligible(r('shakshuka'), p, 'breakfast')).toBe(true);
    expect(isEligible(r('shakshuka'), p, 'dinner')).toBe(false);
    expect(isEligible(r('boiled-eggs'), p, 'snack')).toBe(true);
    expect(ineligibleReasons(r('shakshuka'), p, 'dinner')).toEqual(['slot']);
  });

  it('excludes allergens, disliked ingredients and long recipes', () => {
    const noGluten = makeProfile({ excludeAllergens: ['gluten'] });
    expect(isEligible(r('mujaddara'), noGluten)).toBe(false);
    expect(isEligible(r('red-lentil-soup'), noGluten)).toBe(true);
    const noNuts = makeProfile({ excludeAllergens: ['tree-nut', 'sesame'] });
    expect(isEligible(r('apple-walnuts'), noNuts)).toBe(false);
    expect(isEligible(r('hummus-tomato'), noNuts)).toBe(false);
    const noOnion = makeProfile({ dislikedIngredients: ['onion'] });
    expect(isEligible(r('red-lentil-soup'), noOnion)).toBe(false);
    expect(isEligible(r('tofu-stir-fry'), noOnion)).toBe(true);
    const quick = makeProfile({ maxTotalMinutes: 20 });
    expect(isEligible(r('lamb-rice-quzi'), quick)).toBe(false);
    expect(isEligible(r('yogurt-oat-bowl'), quick)).toBe(true);
    expect(isEligible(r('chicken-tahini-wrap'), quick)).toBe(true);
    expect(r('chicken-tahini-wrap').totalMinutes).toBe(20);
  });

  it('lists every reason at once', () => {
    const p = makeProfile({ diet: 'vegan', excludeAllergens: ['gluten'], dislikedIngredients: ['chicken-breast-raw'], maxTotalMinutes: 10 });
    expect(ineligibleReasons(r('chicken-bulgur-pilaf'), p, 'breakfast')).toEqual(['slot', 'diet', 'allergen', 'disliked', 'time']);
    expect(ineligibleReasons(r('apple-walnuts'), p, 'snack')).toEqual([]);
  });

  it('eligibleRecipes keeps catalog order and matches isEligible', () => {
    const p = makeProfile({ diet: 'vegetarian', excludeAllergens: ['gluten'] });
    const got = eligibleRecipes(FIXTURE_CATALOG, p, 'lunch');
    expect(ids(got)).toEqual(ids(FIXTURE_CATALOG.filter((x) => isEligible(x, p, 'lunch'))));
    expect(got.every((x) => x.slots.includes('lunch') && x.flags.vegetarian && x.flags.glutenFree)).toBe(true);
  });
});

describe('search', () => {
  it('normalizes case, accents and spaces', () => {
    expect(normalizeText('  Crème   Brûlée ')).toBe('creme brulee');
    expect(normalizeText('KUBBA')).toBe('kubba');
  });

  it('matches names, native names and ingredient names', () => {
    expect(matchesQuery(r('red-lentil-soup'), 'lentil', FIXTURE_INDEX)).toBe(true);
    expect(matchesQuery(r('red-lentil-soup'), 'adas', FIXTURE_INDEX)).toBe(true);
    expect(matchesQuery(r('red-lentil-soup'), 'shorbat', FIXTURE_INDEX)).toBe(true);
    expect(matchesQuery(r('hummus-tomato'), 'tahini', FIXTURE_INDEX)).toBe(true);
    expect(matchesQuery(r('hummus-tomato'), 'Tahíni', FIXTURE_INDEX)).toBe(true);
    expect(matchesQuery(r('hummus-tomato'), 'lamb', FIXTURE_INDEX)).toBe(false);
    expect(matchesQuery(r('hummus-tomato'), '', FIXTURE_INDEX)).toBe(true);
  });

  it('needs every word to match somewhere', () => {
    const got = filterRecipes(FIXTURE_CATALOG, { query: 'walnut salad' }, ctx);
    expect(ids(got)).toEqual(['walnut-lentil-salad']);
  });

  it('ranks name matches above native-name and ingredient matches', () => {
    const got = filterRecipes(FIXTURE_CATALOG, { query: 'chickpea' }, ctx);
    const scores = got.map((x) => searchScore(x, 'chickpea', FIXTURE_INDEX));
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(got[0]?.name.toLowerCase()).toContain('chickpea');
    expect(ids(got)).toContain('hummus-tomato');
    expect(got.findIndex((x) => x.id === 'hummus-tomato')).toBeGreaterThan(got.findIndex((x) => x.id === 'roasted-chickpeas'));
  });

  it('matches plurals and the British and regional names people type (regression)', () => {
    const count = (query: string) => filterRecipes(FIXTURE_CATALOG, { query }, ctx).length;
    for (const [plural, singular] of [['eggs', 'egg'], ['tomatoes', 'tomato'], ['lentils', 'lentil'], ['chickpeas', 'chickpea'], ['apples', 'apple']]) {
      expect(count(plural as string), plural).toBe(count(singular as string));
      expect(count(plural as string), plural).toBeGreaterThan(0);
    }
    expect(count('yoghurt')).toBe(count('yogurt'));
    expect(count('garbanzos')).toBe(count('chickpea'));
    expect(count('aubergine')).toBe(count('eggplant'));
    expect(queryWordForms('berries')).toContain('berry');
    expect(queryWordForms('aubergines')).toContain('eggplant');
    expect(queryWordForms('courgette')).toContain('zucchini');
    expect(queryWordForms('coriander')).toContain('cilantro');
    expect(queryWordForms('minced')).toContain('ground lamb');
    expect(queryWordForms('gas')).toEqual(['gas']); // short words keep their ending
    expect(queryWordForms('hummus')).toContain('hummus');
    // A plural means the food, not the oil pressed from it.
    expect(matchesQuery(r('shakshuka'), 'olives', FIXTURE_INDEX)).toBe(false);
    expect(matchesQuery(r('shakshuka'), 'olive', FIXTURE_INDEX)).toBe(true);
    expect(normalizeText("Za'atar Manakish")).toBe('zaatar manakish');
    expect(normalizeText('Za’atar')).toBe(normalizeText('zaatar'));
  });
});

describe('filterRecipes', () => {
  it('keeps catalog order without a query', () => {
    expect(ids(filterRecipes(FIXTURE_CATALOG, {}, ctx))).toEqual(ids(FIXTURE_CATALOG));
  });

  it('filters by slot, diet, flags, quick, cuisine and favorites', () => {
    const snacks = filterRecipes(FIXTURE_CATALOG, { slot: 'snack' }, ctx);
    expect(snacks.every((x) => x.slots.includes('snack'))).toBe(true);
    expect(ids(snacks)).toContain('boiled-eggs');

    const vegan = filterRecipes(FIXTURE_CATALOG, { diet: 'vegan', slot: 'lunch' }, ctx);
    expect(vegan.length).toBeGreaterThan(0);
    expect(vegan.every((x) => x.flags.vegan)).toBe(true);

    const gfdf = filterRecipes(FIXTURE_CATALOG, { flags: ['glutenFree', 'dairyFree'] }, ctx);
    expect(gfdf.every((x) => x.flags.glutenFree && x.flags.dairyFree)).toBe(true);
    expect(ids(gfdf)).not.toContain('yogurt-apple-walnut');

    const quick = filterRecipes(FIXTURE_CATALOG, { quick: true }, ctx);
    expect(quick.every((x) => x.totalMinutes <= QUICK_MINUTES)).toBe(true);
    expect(ids(quick)).not.toContain('lamb-rice-quzi');

    const kurdish = filterRecipes(FIXTURE_CATALOG, { cuisine: 'kurdish' }, ctx);
    expect(kurdish.length).toBeGreaterThan(0);
    expect(kurdish.every((x) => x.cuisine === 'kurdish')).toBe(true);

    const favs = filterRecipes(FIXTURE_CATALOG, { favoritesOnly: true }, { ...ctx, favorites: ['shakshuka', 'mujaddara', 'missing'] });
    expect(ids(favs)).toEqual(['shakshuka', 'mujaddara']);

    const combined = filterRecipes(FIXTURE_CATALOG, { query: 'lentil', slot: 'dinner', diet: 'vegan', quick: false, cuisine: null }, ctx);
    expect(combined.length).toBeGreaterThan(0);
    expect(combined.every((x) => x.flags.vegan && x.slots.includes('dinner'))).toBe(true);
  });

  it('lists cuisines by frequency', () => {
    const list = cuisinesIn(FIXTURE_CATALOG);
    expect(new Set(list).size).toBe(list.length);
    const count = (c: string) => FIXTURE_CATALOG.filter((x) => x.cuisine === c).length;
    for (let i = 1; i < list.length; i++) expect(count(list[i - 1] as string)).toBeGreaterThanOrEqual(count(list[i] as string));
    expect(cuisinesIn([])).toEqual([]);
  });
});
