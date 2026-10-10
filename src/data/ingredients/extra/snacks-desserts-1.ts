// Ingredients added while writing recipes/snacks-desserts-1.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy 12120 (FDC 170581): Nuts, hazelnuts or filberts
  {
    id: 'hazelnuts',
    name: 'Hazelnuts',
    aisle: 'nuts-seeds',
    allergens: ['tree-nut'],
    per100g: { kcal: 628, protein: 15, carbs: 16.7, fiber: 9.7, sugars: 4.34, fat: 60.8, satFat: 4.46, sodium: 0 },
  },
  // USDA SR Legacy 08156 (FDC 173912): Cereals ready-to-eat, rice, puffed, fortified (plain puffed rice, murmura; SR reports no sugars)
  {
    id: 'puffed-rice',
    name: 'Puffed rice (plain)',
    aisle: 'bakery-grains',
    allergens: [],
    per100g: { kcal: 402, protein: 6.3, carbs: 89.8, fiber: 1.7, sugars: 0, fat: 0.5, satFat: 0.13, sodium: 3 },
  },
  // USDA SR Legacy 20054 (FDC 168883): Rice, white, glutinous, unenriched, uncooked (SR reports no sugars)
  {
    id: 'rice-glutinous-raw',
    name: 'Glutinous (sticky) rice (raw)',
    aisle: 'bakery-grains',
    allergens: [],
    per100g: { kcal: 370, protein: 6.81, carbs: 81.7, fiber: 2.8, sugars: 0, fat: 0.55, satFat: 0.111, sodium: 7 },
  },
];
