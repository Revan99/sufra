// Ingredients added while writing recipes/vegetarian-mains-1.ts. Merged into the main tables at the end.
import type { Ingredient } from '../../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy 11207 (FDC 169226): Dandelion greens, raw
  { id: 'dandelion-greens-raw', name: 'Dandelion greens', aisle: 'produce', allergens: [],
    per100g: { kcal: 45, protein: 2.7, carbs: 9.2, fiber: 3.5, sugars: 0.71, fat: 0.7, satFat: 0.17, sodium: 76 } },
  // USDA FoodData Central has no doubanjiang (fermented broad bean and chili paste) entry, in SR Legacy, Foundation
  // or Branded. These are approximate retail-label values for Sichuan-style chili bean paste (broad beans, chili,
  // salt, wheat flour, oil), per 100 g, rounded: about 7.8 g sodium per 100 g, as on Lee Kum Kee Toban Djan style
  // labels. kcal is set from the macros (Atwater). Allergens cover brands made with wheat flour and soybean oil.
  { id: 'doubanjiang', name: 'Doubanjiang (chili bean paste)', aisle: 'condiments-sauces', allergens: ['gluten', 'soy'],
    halalNote: 'Some chili bean pastes add alcohol as a preservative: check the label, halal-certified if you can.',
    per100g: { kcal: 120, protein: 7, carbs: 14, fiber: 4, sugars: 3, fat: 5, satFat: 0.7, sodium: 7800 } },
  // USDA FoodData Central has no kashk entry. Approximate retail-label values for Iranian liquid kashk (cooked,
  // salted fermented whey/yogurt), per 100 g, rounded; kcal set from the macros (Atwater).
  { id: 'kashk', name: 'Kashk (liquid whey)', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 112, protein: 10, carbs: 6.7, fiber: 0, sugars: 4, fat: 5, satFat: 3.3, sodium: 970 } },
];
