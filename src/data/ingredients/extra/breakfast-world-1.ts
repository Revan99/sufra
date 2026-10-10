// Ingredients added while writing recipes/breakfast-world-1.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA FoodData Central Branded 2503938: Mango curry amba sauce & dressing (SR Legacy and FNDDS have no amba
  // or mango pickle entry). kcal is general Atwater from the label macros (the label's rounded 67 kcal does not
  // agree with 13.3 g carbs, 3.3 g fiber and 0 g fat).
  { id: 'amba', name: 'Amba (pickled mango sauce)', aisle: 'condiments-sauces', allergens: [],
    per100g: { kcal: 47, protein: 0, carbs: 13.3, fiber: 3.3, sugars: 0, fat: 0, satFat: 0, sodium: 1100 } },
];
