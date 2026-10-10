// Ingredients added while writing recipes/snacks-desserts-5.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy 11663 (FDC 170090): Seaweed, agar, dried
  { id: 'agar-powder', name: 'Agar powder (kanten)', aisle: 'baking-sweeteners', allergens: [],
    per100g: { kcal: 306, protein: 6.21, carbs: 80.9, fiber: 7.7, sugars: 2.97, fat: 0.3, satFat: 0.061, sodium: 102 } },
  // USDA SR Legacy 11141 (FDC 170400): Celeriac, raw
  { id: 'celeriac-raw', name: 'Celeriac (celery root)', aisle: 'produce', allergens: [],
    per100g: { kcal: 42, protein: 1.5, carbs: 9.2, fiber: 1.8, sugars: 1.6, fat: 0.3, satFat: 0.079, sodium: 100 } },
  // USDA SR Legacy 9326 (FDC 167765): Watermelon, raw
  { id: 'watermelon-raw', name: 'Watermelon', aisle: 'produce', allergens: [],
    per100g: { kcal: 30, protein: 0.61, carbs: 7.55, fiber: 0.4, sugars: 6.2, fat: 0.15, satFat: 0.016, sodium: 1 } },
];
