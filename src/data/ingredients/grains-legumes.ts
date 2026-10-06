// Grains, breads, pasta (aisle bakery-grains) and legumes, tofu, tempeh (aisle legumes).
// Per 100 g in the state the id names, USDA FoodData Central. Where USDA has no entry for a food,
// the comment names the closest USDA food whose values stand in for it.
import type { Ingredient } from '../../types.ts';

export const ingredients: Ingredient[] = [
  // ---------- Rice ----------
  // USDA SR Legacy 20444: Rice, white, long-grain, regular, raw, unenriched (SR has no separate basmati entry)
  { id: 'rice-basmati-raw', name: 'Basmati rice (raw)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 365, protein: 7.13, carbs: 80, fiber: 1.3, sugars: 0.12, fat: 0.66, satFat: 0.18, sodium: 5 } },
  // USDA SR Legacy 20445: Rice, white, long-grain, regular, unenriched, cooked without salt
  { id: 'rice-basmati-cooked', name: 'Basmati rice (cooked)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 130, protein: 2.69, carbs: 28.2, fiber: 0.4, sugars: 0.05, fat: 0.28, satFat: 0.077, sodium: 1 } },
  // USDA SR Legacy 20452: Rice, white, short-grain, raw, unenriched (USDA reports no fiber value)
  { id: 'rice-short-grain-raw', name: 'Short-grain rice (raw)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 358, protein: 6.5, carbs: 79.2, fiber: 0, sugars: 0, fat: 0.52, satFat: 0.14, sodium: 1 } },
  // USDA SR Legacy 20036: Rice, brown, long-grain, raw (also stands in for brown basmati and brown jasmine)
  { id: 'rice-brown-raw', name: 'Brown rice (raw)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 367, protein: 7.54, carbs: 76.2, fiber: 3.6, sugars: 0.66, fat: 3.2, satFat: 0.591, sodium: 5 } },
  // USDA SR Legacy 20037: Rice, brown, long-grain, cooked
  { id: 'rice-brown-cooked', name: 'Brown rice (cooked)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 123, protein: 2.74, carbs: 25.6, fiber: 1.6, sugars: 0.24, fat: 0.97, satFat: 0.26, sodium: 4 } },
  // USDA SR Legacy 20444: Rice, white, long-grain, regular, raw, unenriched (SR has no flattened rice entry)
  { id: 'poha-dry', name: 'Flattened rice (poha, dry)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 365, protein: 7.13, carbs: 80, fiber: 1.3, sugars: 0.12, fat: 0.66, satFat: 0.18, sodium: 5 } },

  // ---------- Wheat grains ----------
  // USDA SR Legacy 20012: Bulgur, dry
  { id: 'bulgur-fine-dry', name: 'Fine bulgur (dry)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 342, protein: 12.3, carbs: 75.9, fiber: 12.5, sugars: 0.41, fat: 1.33, satFat: 0.232, sodium: 17 } },
  // USDA SR Legacy 20012: Bulgur, dry
  { id: 'bulgur-coarse-dry', name: 'Coarse bulgur (dry)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 342, protein: 12.3, carbs: 75.9, fiber: 12.5, sugars: 0.41, fat: 1.33, satFat: 0.232, sodium: 17 } },
  // USDA SR Legacy 20013: Bulgur, cooked
  { id: 'bulgur-cooked', name: 'Bulgur (cooked)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 83, protein: 3.08, carbs: 18.6, fiber: 4.5, sugars: 0.1, fat: 0.24, satFat: 0.042, sodium: 5 } },
  // USDA SR Legacy 20012: Bulgur, dry (USDA has no freekeh entry; both are cracked durum wheat)
  { id: 'freekeh-dry', name: 'Freekeh, cracked (dry)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 342, protein: 12.3, carbs: 75.9, fiber: 12.5, sugars: 0.41, fat: 1.33, satFat: 0.232, sodium: 17 } },
  // USDA SR Legacy 20124: Pasta, whole-wheat, dry (USDA has no whole-wheat couscous entry)
  { id: 'couscous-whole-wheat-dry', name: 'Whole-wheat couscous (dry)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 352, protein: 13.9, carbs: 73.4, fiber: 9.2, sugars: 2.74, fat: 2.93, satFat: 0.428, sodium: 6 } },
  // USDA SR Legacy 20072: Wheat, hard red winter
  { id: 'wheat-berries-dry', name: 'Wheat berries (dry)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 327, protein: 12.6, carbs: 71.2, fiber: 12.2, sugars: 0.41, fat: 1.54, satFat: 0.269, sodium: 2 } },

  // ---------- Other grains ----------
  // USDA SR Legacy 20035: Quinoa, uncooked
  { id: 'quinoa-dry', name: 'Quinoa (dry)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 368, protein: 14.1, carbs: 64.2, fiber: 7, sugars: 0, fat: 6.07, satFat: 0.706, sodium: 5 } },
  // USDA SR Legacy 20137: Quinoa, cooked
  { id: 'quinoa-cooked', name: 'Quinoa (cooked)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 120, protein: 4.4, carbs: 21.3, fiber: 2.8, sugars: 0.87, fat: 1.92, satFat: 0.231, sodium: 7 } },
  // USDA SR Legacy 8120: Cereals, oats, regular and quick, not fortified, dry
  { id: 'oats-rolled-dry', name: 'Rolled oats (dry)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 379, protein: 13.2, carbs: 67.7, fiber: 10.1, sugars: 0.99, fat: 6.52, satFat: 1.11, sodium: 6 } },
  // USDA SR Legacy 19806: Snacks, popcorn, air-popped (Unsalted) (kernels lose little weight when popped)
  { id: 'popcorn-kernels', name: 'Popcorn kernels (unpopped)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 382, protein: 12, carbs: 77.9, fiber: 15.1, sugars: 0, fat: 4.2, satFat: 0.57, sodium: 4 } },
  // USDA SR Legacy 19816: Snacks, rice cakes, brown rice, plain, unsalted
  { id: 'rice-cakes-brown-unsalted', name: 'Brown rice cake, unsalted', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 387, protein: 8.2, carbs: 81.5, fiber: 4.2, sugars: 0.88, fat: 2.8, satFat: 0.57, sodium: 26 } },

  // ---------- Flours ----------
  // USDA SR Legacy 20080: Wheat flour, whole-grain (also for atta)
  { id: 'flour-whole-wheat', name: 'Whole-wheat flour', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 340, protein: 13.2, carbs: 72, fiber: 10.7, sugars: 0.41, fat: 2.5, satFat: 0.43, sodium: 2 } },
  // USDA SR Legacy 20081: Wheat flour, white, all-purpose, enriched, bleached
  { id: 'flour-all-purpose', name: 'All-purpose flour', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 364, protein: 10.3, carbs: 76.3, fiber: 2.7, sugars: 0.27, fat: 0.98, satFat: 0.155, sodium: 2 } },
  // USDA SR Legacy 20061: Rice flour, white, unenriched
  { id: 'flour-rice-white', name: 'Rice flour', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 366, protein: 5.95, carbs: 80.1, fiber: 2.4, sugars: 0.12, fat: 1.42, satFat: 0.386, sodium: 0 } },
  // USDA SR Legacy 16157: Chickpea flour (besan)
  { id: 'flour-chickpea', name: 'Chickpea flour (besan)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 387, protein: 22.4, carbs: 57.8, fiber: 10.8, sugars: 10.8, fat: 6.69, satFat: 0.693, sodium: 64 } },
  // USDA SR Legacy 20322: Cornmeal, degermed, enriched, white (SR has no precooked corn flour entry)
  { id: 'masarepa', name: 'Precooked white corn flour (masarepa)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 370, protein: 7.11, carbs: 79.4, fiber: 3.9, sugars: 1.61, fat: 1.75, satFat: 0.22, sodium: 7 } },

  // ---------- Breads ----------
  // USDA SR Legacy 18042: Bread, pita, whole-wheat
  { id: 'pita-whole-wheat', name: 'Whole-wheat pita', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 262, protein: 9.8, carbs: 55.9, fiber: 6.1, sugars: 2.87, fat: 1.71, satFat: 0.208, sodium: 421 } },
  // USDA SR Legacy 18042: Bread, pita, whole-wheat (SR has no markook or lavash entry)
  { id: 'flatbread-whole-wheat', name: 'Whole-wheat flatbread (markook, lavash)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 262, protein: 9.8, carbs: 55.9, fiber: 6.1, sugars: 2.87, fat: 1.71, satFat: 0.208, sodium: 421 } },
  // USDA SR Legacy 18075: Bread, whole-wheat, commercially prepared
  { id: 'bread-whole-wheat', name: 'Whole-wheat bread', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 252, protein: 12.4, carbs: 42.7, fiber: 6, sugars: 4.34, fat: 3.5, satFat: 0.722, sodium: 455 } },
  // USDA SR Legacy 18348: Rolls, dinner, whole-wheat
  { id: 'roll-whole-wheat', name: 'Whole-wheat bread roll', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 266, protein: 8.7, carbs: 51.1, fiber: 7.5, sugars: 8.46, fat: 4.7, satFat: 0.836, sodium: 521 } },
  // USDA SR Legacy 18044: Bread, pumpernickel
  { id: 'bread-rye-whole-grain', name: 'Whole-grain rye bread (pumpernickel)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 250, protein: 8.7, carbs: 47.5, fiber: 6.5, sugars: 0.53, fat: 3.1, satFat: 0.437, sodium: 596 } },
  // USDA SR Legacy 18216: Crackers, crispbread, rye
  { id: 'crispbread-rye', name: 'Rye crispbread', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 366, protein: 7.9, carbs: 82.2, fiber: 16.5, sugars: 1.07, fat: 1.3, satFat: 0.145, sodium: 410 } },
  // USDA SR Legacy 18363: Tortillas, ready-to-bake or -fry, corn
  { id: 'tortilla-corn', name: 'Corn tortilla', aisle: 'bakery-grains', allergens: [],
    halalNote: 'Choose corn tortillas made only from corn, water and lime (no lard); some brands also add wheat flour.',
    per100g: { kcal: 218, protein: 5.7, carbs: 44.6, fiber: 6.3, sugars: 0.88, fat: 2.85, satFat: 0.453, sodium: 45 } },
  // USDA SR Legacy 28295: Tortillas, ready-to-bake or -fry, whole wheat
  { id: 'tortilla-whole-wheat', name: 'Whole-wheat tortilla', aisle: 'bakery-grains', allergens: ['gluten'],
    halalNote: 'Choose tortillas made with vegetable oil, not lard.',
    per100g: { kcal: 310, protein: 9.76, carbs: 45.9, fiber: 9.8, sugars: 2.44, fat: 9.76, satFat: 4.88, sodium: 617 } },

  // ---------- Pasta and noodles ----------
  // USDA SR Legacy 20124: Pasta, whole-wheat, dry (any shape: spaghetti, macaroni, small shapes, noodles, vermicelli)
  { id: 'pasta-whole-wheat-dry', name: 'Whole-wheat pasta (dry)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 352, protein: 13.9, carbs: 73.4, fiber: 9.2, sugars: 2.74, fat: 2.93, satFat: 0.428, sodium: 6 } },
  // USDA SR Legacy 20125: Pasta, whole-wheat, cooked
  { id: 'pasta-whole-wheat-cooked', name: 'Whole-wheat pasta (cooked)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 149, protein: 5.99, carbs: 30.1, fiber: 3.9, sugars: 0.75, fat: 1.71, satFat: 0.243, sodium: 4 } },
  // USDA SR Legacy 20120: Pasta, dry, enriched (wheat vermicelli, sh'ariya)
  { id: 'vermicelli-dry', name: 'Vermicelli (dry)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 371, protein: 13, carbs: 74.7, fiber: 3.2, sugars: 2.67, fat: 1.51, satFat: 0.277, sodium: 6 } },
  // USDA SR Legacy 20133: Rice noodles, dry (also rice vermicelli)
  { id: 'rice-noodles-dry', name: 'Rice noodles (dry)', aisle: 'bakery-grains', allergens: [],
    per100g: { kcal: 364, protein: 5.95, carbs: 80.2, fiber: 1.6, sugars: 0.12, fat: 0.56, satFat: 0.153, sodium: 182 } },
  // USDA SR Legacy 20114: Noodles, japanese, soba, dry (USDA reports no fiber value; most soba contains wheat),
  // except sodium. Soba is always boiled and drained, and most of its 792 mg salt leaches into the cooking water:
  // USDA 20115 (soba, cooked) has 60 mg per 100 g, and 100 g dry gives about 290-340 g cooked, so ~200 mg per
  // 100 g dry is what reaches the plate.
  { id: 'soba-noodles-dry', name: 'Soba noodles (dry)', aisle: 'bakery-grains', allergens: ['gluten'],
    per100g: { kcal: 336, protein: 14.4, carbs: 74.6, fiber: 0, sugars: 0, fat: 0.71, satFat: 0.136, sodium: 200 } },

  // ---------- Chickpeas ----------
  // USDA SR Legacy 16056: Chickpeas (garbanzo beans, bengal gram), mature seeds, raw
  { id: 'chickpeas-dried', name: 'Chickpeas (dried)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 378, protein: 20.5, carbs: 63, fiber: 12.2, sugars: 10.7, fat: 6.04, satFat: 0.603, sodium: 24 } },
  // USDA SR Legacy 16057: Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt
  { id: 'chickpeas-cooked', name: 'Chickpeas (cooked from dried)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 164, protein: 8.86, carbs: 27.4, fiber: 7.6, sugars: 4.8, fat: 2.59, satFat: 0.269, sodium: 7 } },
  // USDA SR Legacy 16359: Chickpeas (garbanzo beans, bengal gram), mature seeds, canned, drained, rinsed in tap water
  { id: 'chickpeas-canned-drained', name: 'Chickpeas (canned, drained)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 138, protein: 7.04, carbs: 22.9, fiber: 6.3, sugars: 4, fat: 2.47, satFat: 0.213, sodium: 212 } },
  // USDA SR Legacy 16359 as above; sodium from SR 16360: Chickpeas (garbanzo beans, bengal gram), mature seeds,
  // canned, solids and liquids, low sodium (317 mg per 240 g cup; draining and rinsing only lowers it)
  { id: 'chickpeas-canned-low-sodium-drained', name: 'Chickpeas, low-sodium (canned, drained)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 138, protein: 7.04, carbs: 22.9, fiber: 6.3, sugars: 4, fat: 2.47, satFat: 0.213, sodium: 132 } },
  // USDA SR Legacy 16056: Chickpeas (garbanzo beans, bengal gram), mature seeds, raw (SR has no split chickpea entry)
  { id: 'chana-dal-dried', name: 'Split chickpeas (chana dal, dried)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 378, protein: 20.5, carbs: 63, fiber: 12.2, sugars: 10.7, fat: 6.04, satFat: 0.603, sodium: 24 } },
  // USDA SR Legacy 16056: Chickpeas (garbanzo beans, bengal gram), mature seeds, raw (SR has no dry-roasted chickpea entry)
  { id: 'chickpeas-roasted-unsalted', name: 'Roasted chickpeas (leblebi), unsalted', aisle: 'legumes', allergens: [],
    per100g: { kcal: 378, protein: 20.5, carbs: 63, fiber: 12.2, sugars: 10.7, fat: 6.04, satFat: 0.603, sodium: 24 } },

  // ---------- Lentils, peas and dals ----------
  // USDA SR Legacy 16144: Lentils, pink or red, raw
  { id: 'lentils-red-dried', name: 'Red lentils (dried)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 358, protein: 23.9, carbs: 63.1, fiber: 10.8, sugars: 0, fat: 2.17, satFat: 0.379, sodium: 7 } },
  // USDA SR Legacy 16069: Lentils, raw
  { id: 'lentils-green-dried', name: 'Green or brown lentils (dried)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 352, protein: 24.6, carbs: 63.4, fiber: 10.7, sugars: 2.03, fat: 1.06, satFat: 0.154, sodium: 6 } },
  // USDA SR Legacy 16070: Lentils, mature seeds, cooked, boiled, without salt
  { id: 'lentils-cooked', name: 'Lentils (cooked)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 116, protein: 9.02, carbs: 20.1, fiber: 7.9, sugars: 1.8, fat: 0.38, satFat: 0.053, sodium: 2 } },
  // USDA SR Legacy 16085: Peas, green, split, mature seeds, raw
  { id: 'split-peas-dried', name: 'Split peas (dried)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 364, protein: 23.1, carbs: 61.6, fiber: 22.2, sugars: 3.14, fat: 3.89, satFat: 0.408, sodium: 5 } },
  // USDA SR Legacy 16101: Pigeon peas (red gram), mature seeds, raw
  { id: 'toor-dal-dried', name: 'Split pigeon peas (toor dal, dried)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 343, protein: 21.7, carbs: 62.8, fiber: 15, sugars: 0, fat: 1.49, satFat: 0.33, sodium: 17 } },
  // USDA SR Legacy 16080: Mung beans, mature seeds, raw
  { id: 'mung-beans-dried', name: 'Mung beans (dried)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 347, protein: 23.9, carbs: 62.6, fiber: 16.3, sugars: 6.6, fat: 1.15, satFat: 0.348, sodium: 15 } },

  // ---------- Beans ----------
  // USDA Foundation 2644285: Beans, black, canned, sodium added, drained and rinsed (Foundation reports no sugars
  // or saturated fat; satFat is set at the saturated share of fat in SR 16018 Beans, black turtle, canned)
  { id: 'black-beans-canned-drained', name: 'Black beans (canned, drained)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 118, protein: 6.91, carbs: 19.8, fiber: 6.69, sugars: 0, fat: 1.27, satFat: 0.33, sodium: 218 } },
  // USDA Foundation 2644285 as above; sodium from SR 16316: Beans, black, mature seeds, canned, low sodium
  // (solids and liquids, so draining only lowers it)
  { id: 'black-beans-canned-low-sodium-drained', name: 'Black beans, low-sodium (canned, drained)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 118, protein: 6.91, carbs: 19.8, fiber: 6.69, sugars: 0, fat: 1.27, satFat: 0.33, sodium: 138 } },
  // USDA SR Legacy 16032: Beans, kidney, red, mature seeds, raw
  { id: 'kidney-beans-dried', name: 'Red kidney beans (dried)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 337, protein: 22.5, carbs: 61.3, fiber: 15.2, sugars: 2.1, fat: 1.06, satFat: 0.154, sodium: 12 } },
  // USDA SR Legacy 16145: Beans, kidney, red, mature seeds, canned, drained solids
  { id: 'kidney-beans-canned-drained', name: 'Red kidney beans (canned, drained)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 124, protein: 7.98, carbs: 21.5, fiber: 5.5, sugars: 3.8, fat: 1.05, satFat: 0.181, sodium: 231 } },
  // USDA SR Legacy 16145 as above; sodium from SR 16337: Beans, kidney, red, mature seeds, canned, solids and
  // liquid, low sodium (draining only lowers it)
  { id: 'kidney-beans-canned-low-sodium-drained', name: 'Red kidney beans, low-sodium (canned, drained)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 124, protein: 7.98, carbs: 21.5, fiber: 5.5, sugars: 3.8, fat: 1.05, satFat: 0.181, sodium: 117 } },
  // USDA Foundation 2644292: Beans, pinto, canned, sodium added, drained and rinsed (no sugars or satFat reported;
  // satFat is set at the saturated share of fat in SR 16146 Beans, pinto, canned, drained solids)
  { id: 'pinto-beans-canned-drained', name: 'Pinto beans (canned, drained)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 117, protein: 6.69, carbs: 19.6, fiber: 7.09, sugars: 0, fat: 1.27, satFat: 0.22, sodium: 202 } },
  // USDA Foundation 2644292 as above; sodium from SR 16347: Beans, pinto, mature seeds, canned, solids and
  // liquids, low sodium (draining only lowers it)
  { id: 'pinto-beans-canned-low-sodium-drained', name: 'Pinto beans, low-sodium (canned, drained)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 117, protein: 6.69, carbs: 19.6, fiber: 7.09, sugars: 0, fat: 1.27, satFat: 0.22, sodium: 146 } },
  // USDA Foundation 2644287: Beans, cannellini, canned, sodium added, drained and rinsed (no sugars or satFat
  // reported; satFat is set at the saturated share of fat in SR 16049 Beans, white, mature seeds, raw)
  { id: 'cannellini-beans-canned-drained', name: 'Cannellini beans (canned, drained)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 115, protein: 7.41, carbs: 18.8, fiber: 6.76, sugars: 0, fat: 1.17, satFat: 0.3, sodium: 164 } },
  // USDA SR Legacy 16049: Beans, white, mature seeds, raw
  { id: 'white-beans-dried', name: 'White beans (dried)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 333, protein: 23.4, carbs: 60.3, fiber: 15.2, sugars: 2.11, fat: 0.85, satFat: 0.219, sodium: 16 } },
  // USDA SR Legacy 16019: Beans, cranberry (roman), mature seeds, raw
  { id: 'borlotti-beans-dried', name: 'Borlotti beans (dried)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 335, protein: 23, carbs: 60, fiber: 24.7, sugars: 0, fat: 1.23, satFat: 0.316, sodium: 6 } },
  // USDA SR Legacy 16071: Lima beans, large, mature seeds, raw
  { id: 'lima-beans-large-dried', name: 'Large lima beans (gigantes, dried)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 338, protein: 21.5, carbs: 63.4, fiber: 19, sugars: 8.5, fat: 0.69, satFat: 0.161, sodium: 18 } },
  // USDA SR Legacy 16052: Broadbeans (fava beans), mature seeds, raw
  { id: 'fava-beans-dried', name: 'Fava beans (dried, whole)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 341, protein: 26.1, carbs: 58.3, fiber: 25, sugars: 5.7, fat: 1.53, satFat: 0.254, sodium: 13 } },
  // USDA SR Legacy 16052: Broadbeans (fava beans), mature seeds, raw (SR has no split fava entry), except fiber:
  // split fava is the dehulled cotyledon, and most of the whole seed's 25 g fiber is in the hull, so fiber is ~11 g.
  { id: 'fava-beans-split-dried', name: 'Fava beans (dried, split)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 341, protein: 26.1, carbs: 58.3, fiber: 11, sugars: 5.7, fat: 1.53, satFat: 0.254, sodium: 13 } },
  // USDA SR Legacy 16054: Broadbeans (fava beans), mature seeds, canned (solids and liquid, as ful is eaten)
  { id: 'fava-beans-canned', name: 'Fava beans (ful, canned, with liquid)', aisle: 'legumes', allergens: [],
    per100g: { kcal: 71, protein: 5.47, carbs: 12.4, fiber: 3.7, sugars: 0, fat: 0.22, satFat: 0.037, sodium: 453 } },

  // ---------- Soy ----------
  // USDA SR Legacy 16426: Tofu, raw, firm, prepared with calcium sulfate
  { id: 'tofu-firm', name: 'Firm tofu', aisle: 'legumes', allergens: ['soy'],
    per100g: { kcal: 144, protein: 17.3, carbs: 2.78, fiber: 2.3, sugars: 0, fat: 8.72, satFat: 1.26, sodium: 14 } },
  // USDA SR Legacy 16114: Tempeh
  { id: 'tempeh', name: 'Tempeh', aisle: 'legumes', allergens: ['soy'],
    per100g: { kcal: 192, protein: 20.3, carbs: 7.64, fiber: 0, sugars: 0, fat: 10.8, satFat: 2.54, sodium: 9 } },
  // USDA SR Legacy 11211: Edamame, frozen, unprepared (USDA reports no satFat; set at the saturated share of fat
  // in SR 11212 Edamame, frozen, prepared)
  { id: 'edamame-shelled-frozen', name: 'Edamame, shelled (frozen)', aisle: 'frozen', allergens: ['soy'],
    per100g: { kcal: 109, protein: 11.2, carbs: 7.61, fiber: 4.8, sugars: 2.48, fat: 4.73, satFat: 0.56, sodium: 6 } },
  // USDA SR Legacy 11211 as above, scaled x0.53 because this entry is weighed with the pods
  // (SR 11450 Soybeans, green, raw lists 47% refuse as pods)
  { id: 'edamame-in-pods-frozen', name: 'Edamame in pods (frozen, weighed with pods)', aisle: 'frozen', allergens: ['soy'],
    per100g: { kcal: 58, protein: 5.94, carbs: 4.03, fiber: 2.54, sugars: 1.31, fat: 2.51, satFat: 0.3, sodium: 3 } },
];
