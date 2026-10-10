// Ingredients added while writing recipes/chicken-southeast-asian-1.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy NDB 02002: Spices, anise seed (SR Legacy and Foundation have no star anise entry; anise seed is
  // the closest spice, and the 1-3 g used per pot barely moves the totals). Sugars are not reported, so 0.
  // kcal is the Atwater value of the macros (USDA lists 337 from spice-specific energy factors).
  { id: 'star-anise', name: 'Star anise (whole)', aisle: 'spices', allergens: [],
    per100g: { kcal: 384, protein: 17.6, carbs: 50.02, fiber: 14.6, sugars: 0, fat: 15.9, satFat: 0.586, sodium: 16 } },
];
