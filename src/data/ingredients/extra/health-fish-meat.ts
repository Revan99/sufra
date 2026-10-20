// Ingredients added in the healthy-library pass over recipes/fish-meat-*.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy 11957: Fennel, bulb, raw
  { id: 'fennel-bulb-raw', name: 'Fennel bulb', aisle: 'produce', allergens: [],
    per100g: { kcal: 31, protein: 1.24, carbs: 7.3, fiber: 3.1, sugars: 3.93, fat: 0.2, satFat: 0.09, sodium: 52 } },
];
