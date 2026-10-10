// Ingredients added while writing recipes/chicken-levantine-1.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  {
    // USDA FDC 169699, SR Legacy 20028 "Couscous, dry" (SR has no separate pearl couscous entry; moghrabieh
    // and ptitim are the same semolina dough rolled into larger pearls). Sugars not reported.
    id: 'pearl-couscous-dry',
    name: 'Pearl couscous (moghrabieh, dry)',
    aisle: 'bakery-grains',
    per100g: { kcal: 376, protein: 12.76, carbs: 77.43, fiber: 5, sugars: 0, fat: 0.64, satFat: 0.117, sodium: 10 },
    allergens: ['gluten'],
  },
];
