// Ingredients added while writing recipes/vegetarian-mains-2.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy 16117 (FDC 174275): Soy flour, defatted. Dry textured soy mince (TVP, soya chunks/granules) is
  // extruded defatted soy flour, so its dry composition is the same. The sugars are soy oligosaccharides, not free sugar.
  { id: 'soy-mince-dry', name: 'Soy mince, dry (textured soy protein)', aisle: 'legumes', allergens: ['soy'],
    per100g: { kcal: 327, protein: 51.5, carbs: 33.9, fiber: 17.5, sugars: 16.4, fat: 1.22, satFat: 0.136, sodium: 20 } },
];
