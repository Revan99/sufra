// Ingredients added in the healthy-library pass for the vegetarian-mains and snacks/desserts chunks.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy 20004: Barley, hulled. The whole grain with only the inedible husk removed (pot barley is close).
  { id: 'barley-hulled-dry', name: 'Hulled barley (dry)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 354, protein: 12.48, carbs: 73.48, fiber: 17.3, sugars: 0.8, fat: 2.3, satFat: 0.482, sodium: 12 } },
  // USDA SR Legacy 20090: Rice flour, brown.
  { id: 'flour-brown-rice', name: 'Brown rice flour', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 363, protein: 7.23, carbs: 76.48, fiber: 4.6, sugars: 0.85, fat: 2.78, satFat: 0.556, sodium: 8 } },
];
