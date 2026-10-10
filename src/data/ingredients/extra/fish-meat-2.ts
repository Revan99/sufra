// Ingredients added while writing recipes/fish-meat-2.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy 15001 (FDC 174182): Fish, anchovy, european, raw
  { id: 'anchovy-raw', name: 'Fresh anchovies (raw, cleaned)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 131, protein: 20.4, carbs: 0, fiber: 0, sugars: 0, fat: 4.84, satFat: 1.28, sodium: 104 } },
];
