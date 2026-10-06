// Eggs, milk, yogurt, cheese, butter and plant milks. Per 100 g, USDA FoodData Central
// (SR Legacy unless a comment says Foundation).
import type { Ingredient } from '../../types.ts';

const RENNET = 'Choose cheese made with microbial rennet, or halal-certified.';
const NO_GELATIN = 'Choose plain yogurt made from milk and cultures only (no gelatin).';

export const ingredients: Ingredient[] = [
  // ---------- Eggs ----------
  // USDA SR Legacy 01123: Egg, whole, raw, fresh
  { id: 'egg-raw', name: 'Egg', aisle: 'dairy-eggs', allergens: ['egg'], animal: 'egg',
    per100g: { kcal: 143, protein: 12.6, carbs: 0.72, fiber: 0, sugars: 0.37, fat: 9.51, satFat: 3.13, sodium: 142 } },
  // USDA SR Legacy 01124: Egg, white, raw, fresh
  { id: 'egg-white-raw', name: 'Egg white', aisle: 'dairy-eggs', allergens: ['egg'], animal: 'egg',
    per100g: { kcal: 52, protein: 10.9, carbs: 0.73, fiber: 0, sugars: 0.71, fat: 0.17, satFat: 0, sodium: 166 } },
  // USDA SR Legacy 01125: Egg, yolk, raw, fresh
  { id: 'egg-yolk-raw', name: 'Egg yolk', aisle: 'dairy-eggs', allergens: ['egg'], animal: 'egg',
    per100g: { kcal: 322, protein: 15.9, carbs: 3.59, fiber: 0, sugars: 0.56, fat: 26.5, satFat: 9.55, sodium: 48 } },
  // USDA SR Legacy 01129: Egg, whole, cooked, hard-boiled
  { id: 'egg-hard-boiled', name: 'Egg, hard-boiled', aisle: 'dairy-eggs', allergens: ['egg'], animal: 'egg',
    per100g: { kcal: 155, protein: 12.6, carbs: 1.12, fiber: 0, sugars: 1.12, fat: 10.6, satFat: 3.27, sodium: 124 } },

  // ---------- Milk ----------
  // USDA SR Legacy 01077: Milk, whole, 3.25% milkfat, with added vitamin D
  { id: 'milk-whole', name: 'Milk, whole (3.25%)', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 61, protein: 3.15, carbs: 4.8, fiber: 0, sugars: 5.05, fat: 3.25, satFat: 1.86, sodium: 43 } },
  // USDA SR Legacy 01079: Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D
  { id: 'milk-2-percent', name: 'Milk, 2%', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 50, protein: 3.3, carbs: 4.8, fiber: 0, sugars: 5.06, fat: 1.98, satFat: 1.26, sodium: 47 } },
  // USDA SR Legacy 01082: Milk, lowfat, fluid, 1% milkfat, with added vitamin A and vitamin D
  { id: 'milk-1-percent', name: 'Milk, 1%', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 42, protein: 3.37, carbs: 4.99, fiber: 0, sugars: 5.2, fat: 0.97, satFat: 0.633, sodium: 44 } },
  // USDA SR Legacy 01085: Milk, nonfat, fluid, with added vitamin A and vitamin D (fat free or skim)
  { id: 'milk-skim', name: 'Milk, skim', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 34, protein: 3.37, carbs: 4.96, fiber: 0, sugars: 5.09, fat: 0.08, satFat: 0.056, sodium: 42 } },

  // ---------- Yogurt and labneh ----------
  // USDA SR Legacy 01116: Yogurt, plain, whole milk
  { id: 'yogurt-plain-whole', name: 'Plain yogurt, whole milk', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 61, protein: 3.47, carbs: 4.66, fiber: 0, sugars: 4.66, fat: 3.25, satFat: 2.1, sodium: 46 },
    halalNote: NO_GELATIN },
  // USDA SR Legacy 01117: Yogurt, plain, low fat
  { id: 'yogurt-plain-low-fat', name: 'Plain yogurt, low-fat', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 63, protein: 5.25, carbs: 7.04, fiber: 0, sugars: 7.04, fat: 1.55, satFat: 1, sodium: 70 },
    halalNote: NO_GELATIN },
  // USDA SR Legacy 01118: Yogurt, plain, skim milk
  { id: 'yogurt-plain-nonfat', name: 'Plain yogurt, nonfat', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 56, protein: 5.73, carbs: 7.68, fiber: 0, sugars: 7.68, fat: 0.18, satFat: 0.116, sodium: 77 },
    halalNote: NO_GELATIN },
  // USDA SR Legacy 01256: Yogurt, Greek, plain, nonfat
  { id: 'greek-yogurt-nonfat', name: 'Greek yogurt, plain, nonfat', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 59, protein: 10.2, carbs: 3.6, fiber: 0, sugars: 3.24, fat: 0.39, satFat: 0.117, sodium: 36 },
    halalNote: NO_GELATIN },
  // USDA SR Legacy 01287: Yogurt, Greek, plain, lowfat
  { id: 'greek-yogurt-2-percent', name: 'Greek yogurt, plain, 2%', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 73, protein: 9.95, carbs: 3.94, fiber: 0, sugars: 3.56, fat: 1.92, satFat: 1.23, sodium: 34 },
    halalNote: NO_GELATIN },
  // USDA SR Legacy 01293: Yogurt, Greek, plain, whole milk
  { id: 'greek-yogurt-whole', name: 'Greek yogurt, plain, whole milk', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 97, protein: 9, carbs: 3.98, fiber: 0, sugars: 4, fat: 5, satFat: 2.4, sodium: 35 },
    halalNote: NO_GELATIN },
  // USDA has no labneh. Proxy: SR Legacy 01293: Yogurt, Greek, plain, whole milk (strained whole-milk yogurt,
  // unsalted; add salt to the recipe separately). Shop labneh is richer and salted.
  { id: 'labneh', name: 'Labneh (strained yogurt, unsalted)', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 97, protein: 9, carbs: 3.98, fiber: 0, sugars: 4, fat: 5, satFat: 2.4, sodium: 35 },
    halalNote: 'Choose labneh made from milk and cultures only (no gelatin), or strain plain yogurt at home.' },

  // ---------- Cheese ----------
  // USDA SR Legacy 01019: Cheese, feta (also stands in for Kurdish and Arabic brined white cheese)
  { id: 'feta-cheese', name: 'Feta or white cheese (brined)', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 265, protein: 14.2, carbs: 3.88, fiber: 0, sugars: 0, fat: 21.5, satFat: 13.3, sodium: 1140 },
    halalNote: RENNET },
  // USDA SR Legacy 01016: Cheese, cottage, lowfat, 1% milkfat
  { id: 'cottage-cheese-1-percent', name: 'Cottage cheese, 1% fat', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 72, protein: 12.4, carbs: 2.72, fiber: 0, sugars: 2.72, fat: 1.02, satFat: 0.645, sodium: 406 },
    halalNote: RENNET },
  // USDA SR Legacy 43352: Cheese, cottage, lowfat, 1% milkfat, no sodium added
  { id: 'cottage-cheese-1-percent-no-salt', name: 'Cottage cheese, 1% fat, no salt added', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 72, protein: 12.4, carbs: 2.7, fiber: 0, sugars: 2.7, fat: 1, satFat: 0.632, sodium: 13 },
    halalNote: RENNET },
  // USDA SR Legacy 01037: Cheese, ricotta, part skim milk
  { id: 'ricotta-part-skim', name: 'Ricotta, part-skim', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 138, protein: 11.4, carbs: 5.14, fiber: 0, sugars: 0.31, fat: 7.91, satFat: 4.93, sodium: 99 },
    halalNote: RENNET },
  // USDA SR Legacy 01028: Cheese, mozzarella, part skim milk
  { id: 'mozzarella-part-skim', name: 'Mozzarella, part-skim', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 254, protein: 24.3, carbs: 2.77, fiber: 0, sugars: 1.13, fat: 15.9, satFat: 10.1, sodium: 619 },
    halalNote: RENNET },
  // USDA SR Legacy 01026: Cheese, mozzarella, whole milk
  { id: 'mozzarella-whole', name: 'Mozzarella, whole milk', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 299, protein: 22.2, carbs: 2.4, fiber: 0, sugars: 0, fat: 22.1, satFat: 13.9, sodium: 486 },
    halalNote: RENNET },
  // USDA SR Legacy 01228: Cheese, fresh, queso fresco
  { id: 'queso-fresco', name: 'Queso fresco', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 299, protein: 18.1, carbs: 2.98, fiber: 0, sugars: 2.32, fat: 23.8, satFat: 12.9, sodium: 751 },
    halalNote: RENNET },
  // USDA SR Legacy 01159: Cheese, goat, soft type
  { id: 'goat-cheese-soft', name: 'Goat cheese, soft', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 264, protein: 18.5, carbs: 0, fiber: 0, sugars: 0, fat: 21.1, satFat: 14.6, sodium: 459 },
    halalNote: RENNET },
  // USDA SR Legacy 01260: Cheese, cheddar, reduced fat
  { id: 'cheddar-reduced-fat', name: 'Cheddar cheese, reduced-fat', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 316, protein: 27.4, carbs: 2.67, fiber: 0, sugars: 0.26, fat: 20.4, satFat: 12.6, sodium: 628 },
    halalNote: RENNET },
  // USDA SR Legacy 01033: Cheese, parmesan, hard
  { id: 'parmesan', name: 'Parmesan cheese', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 392, protein: 35.8, carbs: 3.22, fiber: 0, sugars: 0.11, fat: 25, satFat: 14.8, sodium: 1180 },
    halalNote: 'Traditional Parmesan uses calf rennet: choose a halal-certified or microbial-rennet hard cheese.' },
  // USDA SR Legacy 43274: Cheese, cream, low fat
  { id: 'cream-cheese-low-fat', name: 'Cream cheese, low-fat', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 208, protein: 7.85, carbs: 6.73, fiber: 0, sugars: 3.3, fat: 16.7, satFat: 10, sodium: 317 },
    halalNote: 'Check the label for gelatin; choose a halal-certified brand.' },

  // ---------- Butter and ghee ----------
  // USDA SR Legacy 01145: Butter, without salt
  { id: 'butter-unsalted', name: 'Butter, unsalted', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 717, protein: 0.85, carbs: 0.06, fiber: 0, sugars: 0.06, fat: 81.1, satFat: 50.5, sodium: 11 } },
  // USDA SR Legacy 01001: Butter, salted
  { id: 'butter-salted', name: 'Butter, salted', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 717, protein: 0.85, carbs: 0.06, fiber: 0, sugars: 0.06, fat: 81.1, satFat: 51.4, sodium: 643 } },
  // USDA SR Legacy 01323: Butter, Clarified butter (ghee)
  { id: 'ghee', name: 'Ghee (clarified butter)', aisle: 'dairy-eggs', allergens: ['dairy'], animal: 'dairy',
    per100g: { kcal: 900, protein: 0, carbs: 0, fiber: 0, sugars: 0, fat: 100, satFat: 60, sodium: 0 } },

  // ---------- Plant milks (unsweetened) ----------
  // USDA SR Legacy 16222: Soymilk (all flavors), unsweetened, with added calcium, vitamins A and D
  { id: 'soy-milk-unsweetened', name: 'Soy milk, unsweetened', aisle: 'dairy-eggs', allergens: ['soy'],
    per100g: { kcal: 33, protein: 2.86, carbs: 1.74, fiber: 0.5, sugars: 0.41, fat: 1.61, satFat: 0.206, sodium: 37 } },
  // USDA SR Legacy 14091: Beverages, almond milk, unsweetened, shelf stable
  { id: 'almond-milk-unsweetened', name: 'Almond milk, unsweetened', aisle: 'dairy-eggs', allergens: ['tree-nut'],
    per100g: { kcal: 15, protein: 0.4, carbs: 1.31, fiber: 0.2, sugars: 0.81, fat: 0.96, satFat: 0.08, sodium: 72 } },
  // USDA Foundation 2257046: Oat milk, unsweetened, plain, refrigerated (kcal = Atwater general factors;
  // USDA reports no saturated fat, so 0.28 g is estimated at ~10% of fat, typical of rapeseed-oil oat drinks)
  { id: 'oat-milk-unsweetened', name: 'Oat milk, unsweetened', aisle: 'dairy-eggs', allergens: ['gluten'],
    per100g: { kcal: 48, protein: 0.8, carbs: 5.1, fiber: 0, sugars: 2.32, fat: 2.75, satFat: 0.28, sodium: 42 } },
];
