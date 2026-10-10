// Ingredients added while writing recipes/fish-meat-5.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA FoodData Central has no raw sardine entry (SR Legacy, Foundation and FNDDS only list canned sardines).
  // Values are SR Legacy 15039 (FDC 175116) "Fish, herring, Atlantic, raw", the closest raw oily fish of the same
  // family (Clupeidae); published raw-sardine figures (about 20 g protein, 5-10 g fat per 100 g) sit in this range.
  { id: 'sardines-raw', name: 'Fresh sardines (raw, cleaned)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 158, protein: 18, carbs: 0, fiber: 0, sugars: 0, fat: 9.04, satFat: 2.04, sodium: 90 } },
];
