// Ingredients added while writing recipes/snacks-international.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy 19904: Chocolate, dark, 70-85% cacao solids. Almost all of its sugar is added sugar, so the
  // whole sugars value counts as free sugar. Many bars contain soy lecithin and are made on lines shared with milk
  // chocolate, so soy and dairy are flagged to keep the allergen filters safe.
  { id: 'dark-chocolate-70-85', name: 'Dark chocolate, 70-85% cacao', aisle: 'baking-sweeteners', allergens: ['dairy', 'soy'], animal: 'dairy', freeSugar: true,
    per100g: { kcal: 598, protein: 7.79, carbs: 45.9, fiber: 10.9, sugars: 23.99, fat: 42.63, satFat: 24.489, sodium: 20 },
    halalNote: 'Choose a plain dark chocolate free of alcohol-based flavourings; many bars contain soy lecithin or traces of milk, so check the label.' },
];
