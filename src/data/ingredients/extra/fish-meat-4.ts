// Ingredients added while writing recipes/fish-meat-4.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  {
    // USDA FDC 173703, SR Legacy 15110 "Fish, swordfish, raw".
    id: 'swordfish-raw',
    name: 'Swordfish steak (raw)',
    aisle: 'seafood',
    per100g: { kcal: 144, protein: 19.7, carbs: 0, fiber: 0, sugars: 0, fat: 6.65, satFat: 1.61, sodium: 81 },
    allergens: ['fish'],
    animal: 'fish',
  },
  {
    // USDA FDC 2747662, Foundation "Peppers, poblano, seeded, raw". Saturated fat is not reported;
    // 0.02 g is estimated at about 10% of total fat, as for other fresh chili peppers in SR Legacy.
    id: 'poblano-peppers-raw',
    name: 'Poblano pepper',
    aisle: 'produce',
    per100g: { kcal: 28, protein: 1.43, carbs: 5.14, fiber: 2.07, sugars: 2.68, fat: 0.19, satFat: 0.02, sodium: 0 },
    allergens: [],
  },
];
