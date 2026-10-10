// Ingredients added while writing recipes/chicken-latin-american-1.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy 20030 (FDC 169701): Hominy, canned, white (drained)
  { id: 'hominy-canned', name: 'Hominy (canned, drained)', aisle: 'canned-jarred', allergens: [],
    per100g: { kcal: 72, protein: 1.48, carbs: 14.3, fiber: 2.5, sugars: 1.51, fat: 0.88, satFat: 0.123, sodium: 267 } },
  // USDA SR Legacy 11149 (FDC 170402): Chayote, fruit, raw
  { id: 'chayote-raw', name: 'Chayote', aisle: 'produce', allergens: [],
    per100g: { kcal: 19, protein: 0.82, carbs: 4.51, fiber: 1.7, sugars: 1.66, fat: 0.13, satFat: 0.028, sodium: 2 } },
  // USDA FDC Branded 1941120: Spiced annatto seed paste (achiote). No SR Legacy or Foundation entry exists.
  // Macros from the label; kcal set to the Atwater value of those macros (label states 200).
  { id: 'achiote-paste', name: 'Achiote paste', aisle: 'condiments-sauces', allergens: [],
    halalNote: 'Choose a plain achiote paste of annatto, spices and citrus or vinegar made from cane or apple, not wine vinegar.',
    per100g: { kcal: 180, protein: 4, carbs: 44, fiber: 8, sugars: 4, fat: 0, satFat: 0, sodium: 2240 } },
  // USDA SR Legacy 09206 (FDC 169098): Orange juice, raw (freshly squeezed; counts as free sugar)
  { id: 'orange-juice-raw', name: 'Orange juice, freshly squeezed', aisle: 'produce', allergens: [], freeSugar: true,
    per100g: { kcal: 45, protein: 0.7, carbs: 10.4, fiber: 0.2, sugars: 8.4, fat: 0.2, satFat: 0.024, sodium: 1 } },
  // No USDA entry exists for guascas (Galinsoga parviflora). Proxy: USDA SR Legacy 02029 (FDC 170930),
  // Spices, parsley, dried, the closest dried leafy herb; used by the pinch, so its effect on totals is negligible.
  { id: 'guascas-dried', name: 'Dried guascas', aisle: 'spices', allergens: [],
    per100g: { kcal: 292, protein: 26.6, carbs: 50.6, fiber: 26.7, sugars: 7.27, fat: 5.48, satFat: 1.38, sodium: 452 } },
];
