// Ingredients added while writing recipes/snacks-desserts-3.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA FDC Branded 2053314: MyBio Argabio culinary argan oil (SR Legacy, Foundation and FNDDS have no argan oil)
  {
    id: 'argan-oil',
    name: 'Argan oil (culinary, roasted)',
    aisle: 'oils-vinegars',
    allergens: [],
    per100g: { kcal: 900, protein: 0, carbs: 0, fiber: 0, sugars: 0, fat: 100, satFat: 17.5, sodium: 0 },
  },
  // USDA FDC Branded 1886703: Spring roll pastry (wheat flour, water, oil, salt), the same thin wheat crepe sold as
  // popiah skin. SR Legacy and FNDDS only have egg-based wonton wrappers.
  {
    id: 'popiah-wrappers',
    name: 'Popiah or spring roll wrappers (egg-free)',
    aisle: 'frozen',
    allergens: ['gluten'],
    per100g: { kcal: 333, protein: 8.33, carbs: 66.7, fiber: 2.8, sugars: 2.78, fat: 5.56, satFat: 1.39, sodium: 611 },
  },
  // USDA SR Legacy 11009 (FDC 168387): Artichokes, (globe or french), frozen, unprepared (sold as frozen artichoke
  // hearts). SR reports no sugars for this entry, so sugars are from SR 11007: Artichokes, raw.
  {
    id: 'artichoke-hearts-frozen',
    name: 'Artichoke hearts (frozen)',
    aisle: 'frozen',
    allergens: [],
    per100g: { kcal: 38, protein: 2.63, carbs: 7.75, fiber: 3.9, sugars: 0.99, fat: 0.43, satFat: 0.099, sodium: 47 },
  },
  // USDA FNDDS 2709988: Seaweed, dried (SR Legacy only has raw laver). kcal = Atwater general factors (FNDDS
  // reports 298 from seaweed-specific factors). Used in grams-per-sheet amounts, so energy barely moves.
  {
    id: 'nori',
    name: 'Nori (roasted seaweed sheets)',
    aisle: 'other',
    allergens: [],
    per100g: { kcal: 362, protein: 31.84, carbs: 52.39, fiber: 5.6, sugars: 3.04, fat: 4.01, satFat: 1.356, sodium: 575 },
  },
];
