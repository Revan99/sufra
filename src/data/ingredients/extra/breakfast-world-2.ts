// Ingredients added while writing recipes/breakfast-world-2.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA FDC SR Legacy 172443 (NDB 16113): Natto.
  { id: 'natto', name: 'Natto (fermented soybeans)', aisle: 'frozen', allergens: ['soy'],
    halalNote: 'Natto itself is just soybeans; set aside the sauce sachet in the pack, which is salty and may contain alcohol-based seasoning.',
    per100g: { kcal: 211, protein: 19.4, carbs: 12.7, fiber: 5.4, sugars: 4.89, fat: 11, satFat: 1.59, sodium: 7 } },
  // USDA FDC SR Legacy 174224 (NDB 15180): Fish, salmon, chum, canned, without salt, drained solids with bone.
  // Sugars are not reported (no carbohydrate), so 0.
  { id: 'salmon-canned-no-salt-drained', name: 'Salmon, canned, no salt added (drained)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 141, protein: 21.4, carbs: 0, fiber: 0, sugars: 0, fat: 5.5, satFat: 1.49, sodium: 75 } },
];
