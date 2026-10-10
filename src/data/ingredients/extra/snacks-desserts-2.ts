// Ingredients added while writing recipes/snacks-desserts-2.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy 16076 (FDC 172423): Lupins, mature seeds, raw. Sugars not reported, set to 0.
  // Lupin is not one of the app's nine allergens, but it cross-reacts with peanut: the termes recipe says so.
  {
    id: 'lupini-beans-dried',
    name: 'Lupini beans (dried)',
    aisle: 'legumes',
    allergens: [],
    per100g: { kcal: 371, protein: 36.2, carbs: 40.4, fiber: 18.9, sugars: 0, fat: 9.74, satFat: 1.16, sodium: 15 },
  },
];
