// Ingredients added while writing recipes/breakfast-world-3.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy 20031 (FDC 169702): Millet, raw (sugars not reported)
  { id: 'millet-dry', name: 'Millet (dry)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 378, protein: 11, carbs: 72.8, fiber: 8.5, sugars: 0, fat: 4.22, satFat: 0.723, sodium: 5 } },
  // USDA SR Legacy 20009 (FDC 170685): Buckwheat groats, roasted, dry (kasha; sugars not reported)
  { id: 'buckwheat-groats-dry', name: 'Buckwheat groats, roasted (dry)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 346, protein: 11.7, carbs: 75, fiber: 10.3, sugars: 0, fat: 2.71, satFat: 0.591, sodium: 11 } },
  // USDA SR Legacy 14355 (FDC 173227): Beverages, tea, black, brewed, prepared with tap water
  { id: 'tea-black-brewed', name: 'Black tea (brewed)', aisle: 'other', allergens: [],
    per100g: { kcal: 1, protein: 0, carbs: 0.3, fiber: 0, sugars: 0, fat: 0, satFat: 0.002, sodium: 3 } },
];
