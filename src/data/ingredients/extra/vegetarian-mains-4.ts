// Ingredients added while writing recipes/vegetarian-mains-4.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  {
    // USDA FDC 174270, SR Legacy 16108 "Soybeans, mature seeds, raw".
    id: 'soybeans-dried',
    name: 'Soybeans (dried)',
    aisle: 'legumes',
    per100g: { kcal: 446, protein: 36.5, carbs: 30.2, fiber: 9.3, sugars: 7.33, fat: 19.9, satFat: 2.88, sodium: 2 },
    allergens: ['soy'],
  },
];
