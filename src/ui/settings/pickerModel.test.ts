import { describe, expect, it } from 'vitest';
import type { Ingredient } from '../../types.ts';
import { ingredientFamily, ingredientMatches } from './pickerModel.ts';

const ing = (id: string, name: string): Ingredient => ({
  id,
  name,
  aisle: 'produce',
  allergens: [],
  per100g: { kcal: 0, protein: 0, carbs: 0, fiber: 0, sugars: 0, fat: 0, satFat: 0, sodium: 0 },
});

const LIST = [
  ing('onion-raw', 'Onion'),
  ing('red-onion-raw', 'Red onion'),
  ing('scallion-raw', 'Scallion (green onion)'),
  ing('onion-powder', 'Onion powder'),
  ing('red-bell-pepper-raw', 'Red bell pepper'),
  ing('tomato-raw', 'Tomato'),
  ing('tomatoes-canned-diced', 'Tomatoes, canned, diced'),
  ing('mushroom-white-raw', 'White mushroom'),
];

describe('ingredientFamily', () => {
  it('gathers every ingredient named with the word, so one tap rules out all onions', () => {
    const f = ingredientFamily('onion', LIST);
    expect(f?.word).toBe('onion');
    expect(f?.members.map((i) => i.id)).toEqual(['onion-raw', 'red-onion-raw', 'scallion-raw', 'onion-powder']);
  });

  it('folds plurals, in the query and in names', () => {
    expect(ingredientFamily('Onions', LIST)?.members).toHaveLength(4);
    expect(ingredientFamily('tomatoes', LIST)?.members.map((i) => i.id)).toEqual(['tomato-raw', 'tomatoes-canned-diced']);
  });

  it('needs a whole word and at least two members', () => {
    expect(ingredientFamily('oni', LIST)).toBeNull();
    expect(ingredientFamily('mushroom', LIST)).toBeNull();
    expect(ingredientFamily('red onion', LIST)).toBeNull();
    expect(ingredientFamily('', LIST)).toBeNull();
  });
});

describe('ingredientMatches', () => {
  it('matches anywhere in the name, ignoring case and accents', () => {
    expect(ingredientMatches('RED', LIST).map((i) => i.id)).toEqual(['red-onion-raw', 'red-bell-pepper-raw']);
    expect(ingredientMatches('  ', LIST)).toEqual([]);
  });
});
