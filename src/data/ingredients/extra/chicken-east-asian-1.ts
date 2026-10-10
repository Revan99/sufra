// Ingredients added while writing recipes/chicken-east-asian-1.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA FoodData Central has no entry for salted fermented black soybeans (douchi) in SR Legacy, Foundation, FNDDS
  // or Branded. These are approximate retail-label values for dry salted black beans (black soybeans, salt, sometimes
  // ginger), per 100 g, rounded, unrinsed: about 4 g sodium per 100 g. kcal is set from the macros (Atwater).
  { id: 'fermented-black-beans', name: 'Fermented black beans (douchi)', aisle: 'condiments-sauces', allergens: ['soy'],
    halalNote: 'Plain salted black beans are just soybeans and salt; check the label and skip any with added alcohol.',
    per100g: { kcal: 228, protein: 19, carbs: 28, fiber: 7, sugars: 2, fat: 6, satFat: 0.9, sodium: 4000 } },
];
