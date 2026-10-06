// Ingredients added while writing recipes/desserts.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA FoodData Central has no rose water entry. Rose water is steam-distilled from rose petals and is
  // nutritionally plain water, so values follow SR Legacy 14411 (Beverages, water, tap, drinking): zero energy,
  // only trace sodium.
  { id: 'rosewater', name: 'Rose water', aisle: 'baking-sweeteners', allergens: [],
    per100g: { kcal: 0, protein: 0, carbs: 0, fiber: 0, sugars: 0, fat: 0, satFat: 0, sodium: 0 },
    halalNote: 'Use plain distilled rose water; rose essences and flavourings can be made with alcohol.' },
  // USDA SR Legacy 02011: Spices, cloves, ground (same dried bud, whole). kcal is general Atwater
  // (USDA lists 274 from spice-specific factors, which the macro check rejects).
  { id: 'cloves-whole', name: 'Cloves, whole', aisle: 'spices', allergens: [],
    per100g: { kcal: 335, protein: 5.97, carbs: 65.53, fiber: 33.9, sugars: 2.38, fat: 13, satFat: 3.952, sodium: 277 } },
];
