// Ingredients added while writing recipes/chicken-world-1.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy 09279: Plums, raw. USDA has no separate entry for unripe green plums (gojeh sabz); ripe raw
  // plums are the closest match (green plums are tarter, with somewhat less sugar). Whole fruit is not free sugar.
  { id: 'green-plums-raw', name: 'Green plums (sour, unripe)', aisle: 'produce', allergens: [],
    per100g: { kcal: 46, protein: 0.7, carbs: 11.42, fiber: 1.4, sugars: 9.92, fat: 0.28, satFat: 0.017, sodium: 0 } },
];
