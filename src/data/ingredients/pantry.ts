// Pantry: nuts and seeds, oils and vinegars, condiments and sauces, canned and jarred goods,
// baking and sweeteners, water. Per 100 g in the state the id names, USDA FoodData Central.
// Where USDA has no entry for a food, the comment names the closest USDA food whose values stand in for it.
import type { Ingredient } from '../../types.ts';

export const ingredients: Ingredient[] = [
  // ---------- Nuts and seeds ----------
  // USDA SR Legacy 12061: Nuts, almonds
  { id: 'almonds', name: 'Almonds', aisle: 'nuts-seeds', allergens: ['tree-nut'],
    per100g: { kcal: 579, protein: 21.2, carbs: 21.6, fiber: 12.5, sugars: 4.35, fat: 49.9, satFat: 3.8, sodium: 1 } },
  // USDA SR Legacy 12155: Nuts, walnuts, english
  { id: 'walnuts', name: 'Walnuts', aisle: 'nuts-seeds', allergens: ['tree-nut'],
    per100g: { kcal: 654, protein: 15.2, carbs: 13.7, fiber: 6.7, sugars: 2.61, fat: 65.2, satFat: 6.13, sodium: 2 } },
  // USDA SR Legacy 12151: Nuts, pistachio nuts, raw
  { id: 'pistachios', name: 'Pistachios, unsalted', aisle: 'nuts-seeds', allergens: ['tree-nut'],
    per100g: { kcal: 560, protein: 20.2, carbs: 27.2, fiber: 10.6, sugars: 7.66, fat: 45.3, satFat: 5.91, sodium: 1 } },
  // USDA SR Legacy 12147: Nuts, pine nuts, dried
  { id: 'pine-nuts', name: 'Pine nuts', aisle: 'nuts-seeds', allergens: ['tree-nut'],
    per100g: { kcal: 673, protein: 13.7, carbs: 13.1, fiber: 3.7, sugars: 3.59, fat: 68.4, satFat: 4.9, sodium: 2 } },
  // USDA SR Legacy 16087: Peanuts, all types, raw
  { id: 'peanuts', name: 'Peanuts, raw', aisle: 'nuts-seeds', allergens: ['peanut'],
    per100g: { kcal: 567, protein: 25.8, carbs: 16.1, fiber: 8.5, sugars: 4.72, fat: 49.2, satFat: 6.28, sodium: 18 } },
  // USDA SR Legacy 12195: Nuts, almond butter, plain, without salt added
  { id: 'almond-butter', name: 'Almond butter, unsalted', aisle: 'nuts-seeds', allergens: ['tree-nut'],
    per100g: { kcal: 614, protein: 21, carbs: 18.8, fiber: 10.3, sugars: 4.43, fat: 55.5, satFat: 4.15, sodium: 7 } },
  // USDA SR Legacy 16390: Peanuts, all types, dry-roasted, without salt (natural peanut butter is only ground
  // roasted peanuts; SR 16398 smooth-style peanut butter has added sugar and hydrogenated oil)
  { id: 'peanut-butter', name: 'Peanut butter, natural, unsalted', aisle: 'nuts-seeds', allergens: ['peanut'],
    per100g: { kcal: 587, protein: 24.4, carbs: 21.3, fiber: 8.4, sugars: 4.9, fat: 49.7, satFat: 7.72, sodium: 6 } },
  // USDA SR Legacy 12166: Seeds, sesame butter, tahini, from roasted and toasted kernels (most common type)
  { id: 'tahini', name: 'Tahini', aisle: 'nuts-seeds', allergens: ['sesame'],
    per100g: { kcal: 595, protein: 17, carbs: 21.2, fiber: 9.3, sugars: 0.49, fat: 53.8, satFat: 7.53, sodium: 115 } },
  // USDA SR Legacy 12023: Seeds, sesame seeds, whole, dried
  { id: 'sesame-seeds', name: 'Sesame seeds', aisle: 'nuts-seeds', allergens: ['sesame'],
    per100g: { kcal: 573, protein: 17.7, carbs: 23.4, fiber: 11.8, sugars: 0.3, fat: 49.7, satFat: 6.96, sodium: 11 } },
  // USDA SR Legacy 12006: Seeds, chia seeds, dried
  { id: 'chia-seeds', name: 'Chia seeds', aisle: 'nuts-seeds', allergens: [],
    per100g: { kcal: 486, protein: 16.5, carbs: 42.1, fiber: 34.4, sugars: 0, fat: 30.7, satFat: 3.33, sodium: 16 } },
  // USDA SR Legacy 12220: Seeds, flaxseed
  { id: 'flaxseed-ground', name: 'Ground flaxseed', aisle: 'nuts-seeds', allergens: [],
    per100g: { kcal: 534, protein: 18.3, carbs: 28.9, fiber: 27.3, sugars: 1.55, fat: 42.2, satFat: 3.66, sodium: 30 } },
  // USDA SR Legacy 12014: Seeds, pumpkin and squash seed kernels, dried
  { id: 'pumpkin-seeds', name: 'Pumpkin seeds (pepitas)', aisle: 'nuts-seeds', allergens: [],
    per100g: { kcal: 559, protein: 30.2, carbs: 10.7, fiber: 6, sugars: 1.4, fat: 49, satFat: 8.66, sodium: 7 } },
  // USDA SR Legacy 12036: Seeds, sunflower seed kernels, dried
  { id: 'sunflower-seeds', name: 'Sunflower seeds, unsalted', aisle: 'nuts-seeds', allergens: [],
    per100g: { kcal: 584, protein: 20.8, carbs: 20, fiber: 8.6, sugars: 2.62, fat: 51.5, satFat: 4.46, sodium: 9 } },

  // ---------- Oils and vinegars ----------
  // USDA SR Legacy 4053: Oil, olive, salad or cooking
  { id: 'olive-oil', name: 'Olive oil', aisle: 'oils-vinegars', allergens: [],
    per100g: { kcal: 884, protein: 0, carbs: 0, fiber: 0, sugars: 0, fat: 100, satFat: 13.8, sodium: 2 } },
  // USDA SR Legacy 4582: Oil, canola
  { id: 'canola-oil', name: 'Canola oil', aisle: 'oils-vinegars', allergens: [],
    per100g: { kcal: 884, protein: 0, carbs: 0, fiber: 0, sugars: 0, fat: 100, satFat: 7.36, sodium: 0 } },
  // USDA SR Legacy 4506: Oil, sunflower, linoleic, (approx. 65%)
  { id: 'sunflower-oil', name: 'Sunflower oil', aisle: 'oils-vinegars', allergens: [],
    per100g: { kcal: 884, protein: 0, carbs: 0, fiber: 0, sugars: 0, fat: 100, satFat: 10.3, sodium: 0 } },
  // USDA SR Legacy 4058: Oil, sesame, salad or cooking
  { id: 'sesame-oil', name: 'Sesame oil', aisle: 'oils-vinegars', allergens: ['sesame'],
    per100g: { kcal: 884, protein: 0, carbs: 0, fiber: 0, sugars: 0, fat: 100, satFat: 14.2, sodium: 0 } },
  // USDA SR Legacy 2048: Vinegar, cider
  { id: 'vinegar-apple-cider', name: 'Apple cider vinegar', aisle: 'oils-vinegars', allergens: [],
    per100g: { kcal: 21, protein: 0, carbs: 0.93, fiber: 0, sugars: 0.4, fat: 0, satFat: 0, sodium: 5 } },
  // USDA SR Legacy 2053: Vinegar, distilled
  { id: 'vinegar-white', name: 'White vinegar', aisle: 'oils-vinegars', allergens: [],
    per100g: { kcal: 18, protein: 0, carbs: 0.04, fiber: 0, sugars: 0.04, fat: 0, satFat: 0, sodium: 2 } },
  // USDA SR Legacy 2053: Vinegar, distilled (SR has no rice vinegar entry)
  { id: 'vinegar-rice', name: 'Rice vinegar', aisle: 'oils-vinegars', allergens: [],
    halalNote: 'Use plain rice vinegar; some seasoned blends contain mirin (rice wine).',
    per100g: { kcal: 18, protein: 0, carbs: 0.04, fiber: 0, sugars: 0.04, fat: 0, satFat: 0, sodium: 2 } },

  // ---------- Condiments and sauces ----------
  // USDA SR Legacy 9152: Lemon juice, raw
  { id: 'lemon-juice', name: 'Lemon juice', aisle: 'condiments-sauces', allergens: [], freeSugar: true,
    per100g: { kcal: 22, protein: 0.35, carbs: 6.9, fiber: 0.3, sugars: 2.52, fat: 0.24, satFat: 0.04, sodium: 1 } },
  // USDA SR Legacy 9160: Lime juice, raw
  { id: 'lime-juice', name: 'Lime juice', aisle: 'condiments-sauces', allergens: [], freeSugar: true,
    per100g: { kcal: 25, protein: 0.42, carbs: 8.42, fiber: 0.4, sugars: 1.69, fat: 0.07, satFat: 0.008, sodium: 2 } },
  // USDA SR Legacy 19304: Molasses (USDA has no pomegranate molasses entry; a similar concentrated sugar syrup)
  { id: 'pomegranate-molasses', name: 'Pomegranate molasses', aisle: 'condiments-sauces', allergens: [], freeSugar: true,
    per100g: { kcal: 290, protein: 0, carbs: 74.7, fiber: 0, sugars: 74.7, fat: 0.1, satFat: 0.018, sodium: 37 } },
  // USDA SR Legacy 16424: Soy sauce made from soy and wheat (shoyu), low sodium
  { id: 'soy-sauce-reduced-sodium', name: 'Soy sauce, reduced-sodium', aisle: 'condiments-sauces', allergens: ['soy', 'gluten'],
    halalNote: 'Choose a halal-certified soy sauce; brewed soy sauce can contain alcohol.',
    per100g: { kcal: 57, protein: 9.05, carbs: 5.59, fiber: 0.7, sugars: 0.5, fat: 0.3, satFat: 0.035, sodium: 3600 } },
  // USDA SR Legacy 6179: Sauce, fish, ready-to-serve
  { id: 'fish-sauce', name: 'Fish sauce', aisle: 'condiments-sauces', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 35, protein: 5.06, carbs: 3.64, fiber: 0, sugars: 3.64, fat: 0.01, satFat: 0.003, sodium: 7850 } },
  // USDA SR Legacy 2046: Mustard, prepared, yellow
  { id: 'mustard-yellow', name: 'Yellow mustard', aisle: 'condiments-sauces', allergens: [],
    halalNote: 'Choose a mustard made without wine (plain yellow, not wine-based Dijon).',
    per100g: { kcal: 60, protein: 3.74, carbs: 5.83, fiber: 4, sugars: 0.92, fat: 3.34, satFat: 0.214, sodium: 1100 } },
  // USDA SR Legacy 6631: Sauce, hot chile, sriracha (USDA has no pepper paste entry; a similar salted chili paste)
  { id: 'red-pepper-paste', name: 'Red pepper paste (biber salçası)', aisle: 'condiments-sauces', allergens: [],
    per100g: { kcal: 93, protein: 1.93, carbs: 19.2, fiber: 2.2, sugars: 15.1, fat: 0.93, satFat: 0, sodium: 2120 } },
  // USDA has no curry paste entry, so these are label values of two vegan green curry pastes, per 100 g:
  // Thai Kitchen (1 tbsp/15 g label): 100 kcal, 20 g carbs, 6.7 g fiber, 13.3 g sugars, 2333 mg sodium;
  // A Taste of Thai (1 tsp/6 g label): 83 kcal, 17 g carbs, 0 g sugars, 4167 mg sodium.
  // kcal, carbs, sugars and sodium are the mean of the two; fiber is Thai Kitchen's (the other label rounds it to
  // equal total carbs); protein and fat, which both labels round to 0 g per serving, come from the chili, garlic
  // and oil base and stay within that rounding.
  // Allergens are those of the vegetarian paste named here; the note covers the many brands that are not.
  { id: 'green-curry-paste', name: 'Green curry paste, vegetarian', aisle: 'condiments-sauces', allergens: [],
    halalNote: 'Many green curry pastes contain shrimp paste (shellfish) or fish sauce: choose one labeled vegetarian or vegan, halal-certified if you can.',
    per100g: { kcal: 92, protein: 1.5, carbs: 18.5, fiber: 6.7, sugars: 6.7, fat: 1.5, satFat: 0.2, sodium: 3250 } },
  // USDA SR Legacy 9322: Tamarinds, raw (seedless pulp, as in tamarind paste)
  { id: 'tamarind-paste', name: 'Tamarind paste', aisle: 'condiments-sauces', allergens: [],
    per100g: { kcal: 239, protein: 2.8, carbs: 62.5, fiber: 5.1, sugars: 57.4, fat: 0.6, satFat: 0.272, sodium: 28 } },

  // ---------- Canned and jarred ----------
  // USDA SR Legacy 11546: Tomato products, canned, paste, without salt added
  { id: 'tomato-paste', name: 'Tomato paste (no salt added)', aisle: 'canned-jarred', allergens: [],
    per100g: { kcal: 82, protein: 4.32, carbs: 18.9, fiber: 4.1, sugars: 12.2, fat: 0.47, satFat: 0.1, sodium: 59 } },
  // USDA SR Legacy 11693: Tomatoes, crushed, canned
  { id: 'tomatoes-canned-crushed', name: 'Crushed tomatoes (canned)', aisle: 'canned-jarred', allergens: [],
    per100g: { kcal: 32, protein: 1.64, carbs: 7.29, fiber: 1.9, sugars: 4.4, fat: 0.28, satFat: 0.04, sodium: 186 } },
  // USDA SR Legacy 11531: Tomatoes, red, ripe, canned, packed in tomato juice
  { id: 'tomatoes-canned-diced', name: 'Diced tomatoes (canned)', aisle: 'canned-jarred', allergens: [],
    per100g: { kcal: 16, protein: 0.79, carbs: 3.47, fiber: 1.9, sugars: 2.55, fat: 0.25, satFat: 0.034, sodium: 115 } },
  // USDA SR Legacy 6970: Soup, chicken broth, low sodium, canned
  { id: 'chicken-broth-low-sodium', name: 'Chicken broth, low-sodium', aisle: 'canned-jarred', allergens: [], animal: 'poultry',
    halalNote: 'Choose a low-sodium, halal-certified chicken stock.',
    per100g: { kcal: 16, protein: 2, carbs: 1.2, fiber: 0, sugars: 0.13, fat: 0.6, satFat: 0.179, sodium: 30 } },
  // USDA SR Legacy 6611: Soup, SWANSON, beef broth, lower sodium
  { id: 'beef-broth-low-sodium', name: 'Beef broth, low-sodium', aisle: 'canned-jarred', allergens: [], animal: 'meat',
    halalNote: 'Choose a low-sodium, halal-certified beef stock.',
    per100g: { kcal: 6, protein: 1.2, carbs: 0.21, fiber: 0, sugars: 0.2, fat: 0.08, satFat: 0.03, sodium: 180 } },
  // USDA SR Legacy 6700: Soup, vegetable broth, ready to serve (SR has no low-sodium vegetable broth entry)
  { id: 'vegetable-broth', name: 'Vegetable broth', aisle: 'canned-jarred', allergens: [],
    halalNote: 'Choose a low-sodium vegetable stock made without wine or animal fat.',
    per100g: { kcal: 5, protein: 0.24, carbs: 0.93, fiber: 0, sugars: 0.55, fat: 0.07, satFat: 0.028, sodium: 296 } },
  // USDA SR Legacy 12118: Nuts, coconut milk, canned (liquid expressed from grated meat and water)
  { id: 'coconut-milk-canned', name: 'Coconut milk (canned)', aisle: 'canned-jarred', allergens: [],
    per100g: { kcal: 197, protein: 2.02, carbs: 2.81, fiber: 0, sugars: 0, fat: 21.3, satFat: 18.9, sodium: 13 } },
  // USDA SR Legacy 9195: Olives, pickled, canned or bottled, green
  { id: 'olives-green', name: 'Green olives', aisle: 'canned-jarred', allergens: [],
    per100g: { kcal: 145, protein: 1.03, carbs: 3.84, fiber: 3.3, sugars: 0.54, fat: 15.3, satFat: 2.03, sodium: 1560 } },
  // USDA SR Legacy 9193: Olives, ripe, canned (small-extra large)
  { id: 'olives-black', name: 'Black olives', aisle: 'canned-jarred', allergens: [],
    per100g: { kcal: 116, protein: 0.84, carbs: 6.04, fiber: 1.6, sugars: 0, fat: 10.9, satFat: 2.28, sodium: 735 } },
  // USDA SR Legacy 11937: Pickles, cucumber, dill or kosher dill
  { id: 'pickled-cucumber', name: 'Pickled cucumber', aisle: 'canned-jarred', allergens: [],
    per100g: { kcal: 12, protein: 0.5, carbs: 2.41, fiber: 1, sugars: 1.07, fat: 0.3, satFat: 0.079, sodium: 809 } },

  // ---------- Baking and sweeteners ----------
  // USDA SR Legacy 19296: Honey
  { id: 'honey', name: 'Honey', aisle: 'baking-sweeteners', allergens: [], animal: 'honey', freeSugar: true,
    per100g: { kcal: 304, protein: 0.3, carbs: 82.4, fiber: 0.2, sugars: 82.1, fat: 0, satFat: 0, sodium: 4 } },
  // USDA SR Legacy 19304: Molasses (USDA has no date syrup entry; a similar concentrated sugar syrup)
  { id: 'date-syrup', name: 'Date syrup (dibis)', aisle: 'baking-sweeteners', allergens: [], freeSugar: true,
    per100g: { kcal: 290, protein: 0, carbs: 74.7, fiber: 0, sugars: 74.7, fat: 0.1, satFat: 0.018, sodium: 37 } },
  // USDA SR Legacy 19335: Sugars, granulated
  { id: 'sugar', name: 'Sugar', aisle: 'baking-sweeteners', allergens: [], freeSugar: true,
    per100g: { kcal: 387, protein: 0, carbs: 100, fiber: 0, sugars: 99.8, fat: 0, satFat: 0, sodium: 1 } },
  // USDA SR Legacy 19165: Cocoa, dry powder, unsweetened
  // (USDA lists 228 kcal from cocoa-specific energy factors; kcal here is the Atwater value of its macros so the
  // table stays consistent. The branded HERSHEY'S entry 19171 is label-rounded, with 0 g saturated fat.)
  { id: 'cocoa-powder', name: 'Cocoa powder, unsweetened', aisle: 'baking-sweeteners', allergens: [],
    per100g: { kcal: 359, protein: 19.6, carbs: 57.9, fiber: 37, sugars: 1.75, fat: 13.7, satFat: 8.07, sodium: 21 } },
  // USDA SR Legacy 18369: Leavening agents, baking powder, double-acting, sodium aluminum sulfate
  // (USDA lists 53 kcal; kcal here is the Atwater value of its macros so the table stays consistent)
  { id: 'baking-powder', name: 'Baking powder', aisle: 'baking-sweeteners', allergens: [],
    per100g: { kcal: 110, protein: 0, carbs: 27.7, fiber: 0.2, sugars: 0, fat: 0, satFat: 0, sodium: 10600 } },
  // USDA SR Legacy 18372: Leavening agents, baking soda
  { id: 'baking-soda', name: 'Baking soda', aisle: 'baking-sweeteners', allergens: [],
    per100g: { kcal: 0, protein: 0, carbs: 0, fiber: 0, sugars: 0, fat: 0, satFat: 0, sodium: 27400 } },
  // USDA SR Legacy 18375: Leavening agents, yeast, baker's, active dry
  { id: 'yeast-dry', name: 'Active dry yeast', aisle: 'baking-sweeteners', allergens: [],
    per100g: { kcal: 325, protein: 40.4, carbs: 41.2, fiber: 26.9, sugars: 0, fat: 7.61, satFat: 1, sodium: 51 } },
  // USDA SR Legacy 20027: Cornstarch
  { id: 'cornstarch', name: 'Cornstarch', aisle: 'baking-sweeteners', allergens: [],
    per100g: { kcal: 381, protein: 0.26, carbs: 91.3, fiber: 0.9, sugars: 0, fat: 0.05, satFat: 0.009, sodium: 9 } },

  // ---------- Other ----------
  // Water: all zeros (USDA SR Legacy 14411: Beverages, water, tap, drinking, has only trace sodium)
  { id: 'water', name: 'Water', aisle: 'other', allergens: [],
    per100g: { kcal: 0, protein: 0, carbs: 0, fiber: 0, sugars: 0, fat: 0, satFat: 0, sodium: 0 } },

  // ---------- Shared staples added for the library expansion ----------
  // USDA SR Legacy 12087: Nuts, cashew nuts, raw
  { id: 'cashews', name: 'Cashews (raw, unsalted)', aisle: 'nuts-seeds', allergens: ['tree-nut'],
    per100g: { kcal: 553, protein: 18.2, carbs: 30.2, fiber: 3.3, sugars: 5.91, fat: 43.8, satFat: 7.78, sodium: 12 } },
  // USDA SR Legacy 12108: Nuts, coconut meat, dried (desiccated), not sweetened (very high in saturated fat: use by the spoonful)
  { id: 'coconut-desiccated', name: 'Desiccated coconut, unsweetened', aisle: 'nuts-seeds', allergens: [],
    per100g: { kcal: 660, protein: 6.88, carbs: 23.6, fiber: 16.3, sugars: 7.35, fat: 64.5, satFat: 57.2, sodium: 37 } },
  // USDA SR Legacy 02054: Capers, canned (drained; very salty, rinse and measure)
  { id: 'capers', name: 'Capers (drained)', aisle: 'canned-jarred', allergens: [],
    halalNote: 'Choose capers in brine or salt, not ones packed in wine vinegar.',
    per100g: { kcal: 23, protein: 2.36, carbs: 4.89, fiber: 3.2, sugars: 0.41, fat: 0.86, satFat: 0.233, sodium: 2350 } },
  // USDA SR Legacy 16112: Miso
  { id: 'miso', name: 'Miso paste', aisle: 'condiments-sauces', allergens: ['soy'],
    halalNote: 'Choose a miso made without added alcohol (some brands add ethanol as a preservative); barley miso contains gluten.',
    per100g: { kcal: 198, protein: 12.8, carbs: 25.4, fiber: 5.4, sugars: 6.2, fat: 6.01, satFat: 1.02, sodium: 3730 } },
  // USDA SR Legacy 06175: Sauce, hoisin, ready-to-serve (made with wheat and usually sesame)
  { id: 'hoisin-sauce', name: 'Hoisin sauce', aisle: 'condiments-sauces', allergens: ['soy', 'gluten', 'sesame'],
    halalNote: 'Choose a halal-certified hoisin sauce with no added alcohol.',
    per100g: { kcal: 220, protein: 3.31, carbs: 44.1, fiber: 2.8, sugars: 27.3, fat: 3.39, satFat: 0.568, sodium: 1620 } },
  // USDA SR Legacy 19353: Syrups, maple
  { id: 'maple-syrup', name: 'Maple syrup', aisle: 'baking-sweeteners', allergens: [], freeSugar: true,
    per100g: { kcal: 260, protein: 0.04, carbs: 67, fiber: 0, sugars: 60.5, fat: 0.06, satFat: 0.007, sodium: 12 } },
  // USDA SR Legacy 09401: Applesauce, canned, unsweetened, with added ascorbic acid. Sugars in fruit purées
  // count as free sugar (WHO/SACN), so this is flagged even though nothing is added.
  { id: 'applesauce-unsweetened', name: 'Applesauce, unsweetened', aisle: 'canned-jarred', allergens: [], freeSugar: true,
    per100g: { kcal: 42, protein: 0.17, carbs: 11.3, fiber: 1.1, sugars: 9.39, fat: 0.1, satFat: 0.008, sodium: 2 } },
];
