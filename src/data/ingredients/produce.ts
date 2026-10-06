// Vegetables, fruit, dried fruit and frozen produce. Per 100 g edible portion, USDA FoodData Central.
import type { Ingredient } from '../../types.ts';

export const ingredients: Ingredient[] = [
  // USDA SR Legacy 11282: Onions, raw
  { id: 'onion-raw', name: 'Onion', aisle: 'produce', allergens: [],
    per100g: { kcal: 40, protein: 1.1, carbs: 9.34, fiber: 1.7, sugars: 4.24, fat: 0.1, satFat: 0.042, sodium: 4 } },
  // USDA SR Legacy 11282: Onions, raw (SR has no separate red onion entry)
  { id: 'red-onion-raw', name: 'Red onion', aisle: 'produce', allergens: [],
    per100g: { kcal: 40, protein: 1.1, carbs: 9.34, fiber: 1.7, sugars: 4.24, fat: 0.1, satFat: 0.042, sodium: 4 } },
  // USDA SR Legacy 11291: Onions, spring or scallions (includes tops and bulb), raw
  { id: 'scallion-raw', name: 'Scallion (green onion)', aisle: 'produce', allergens: [],
    per100g: { kcal: 32, protein: 1.83, carbs: 7.34, fiber: 2.6, sugars: 2.33, fat: 0.19, satFat: 0.032, sodium: 16 } },
  // USDA SR Legacy 11215: Garlic, raw
  { id: 'garlic-raw', name: 'Garlic', aisle: 'produce', allergens: [],
    per100g: { kcal: 149, protein: 6.36, carbs: 33.06, fiber: 2.1, sugars: 1, fat: 0.5, satFat: 0.089, sodium: 17 } },
  // USDA SR Legacy 11216: Ginger root, raw
  { id: 'ginger-raw', name: 'Fresh ginger', aisle: 'produce', allergens: [],
    per100g: { kcal: 80, protein: 1.82, carbs: 17.77, fiber: 2, sugars: 1.7, fat: 0.75, satFat: 0.203, sodium: 13 } },
  // USDA SR Legacy 11529: Tomatoes, red, ripe, raw, year round average
  { id: 'tomato-raw', name: 'Tomato', aisle: 'produce', allergens: [],
    per100g: { kcal: 18, protein: 0.88, carbs: 3.89, fiber: 1.2, sugars: 2.63, fat: 0.2, satFat: 0.028, sodium: 5 } },
  // USDA SR Legacy 11529: Tomatoes, red, ripe, raw, year round average (SR has no cherry tomato entry)
  { id: 'cherry-tomato-raw', name: 'Cherry tomato', aisle: 'produce', allergens: [],
    per100g: { kcal: 18, protein: 0.88, carbs: 3.89, fiber: 1.2, sugars: 2.63, fat: 0.2, satFat: 0.028, sodium: 5 } },
  // USDA SR Legacy 11205: Cucumber, with peel, raw
  { id: 'cucumber-raw', name: 'Cucumber', aisle: 'produce', allergens: [],
    per100g: { kcal: 15, protein: 0.65, carbs: 3.63, fiber: 0.5, sugars: 1.67, fat: 0.11, satFat: 0.037, sodium: 2 } },
  // USDA SR Legacy 11124: Carrots, raw
  { id: 'carrot-raw', name: 'Carrot', aisle: 'produce', allergens: [],
    per100g: { kcal: 41, protein: 0.93, carbs: 9.58, fiber: 2.8, sugars: 4.74, fat: 0.24, satFat: 0.037, sodium: 69 } },
  // USDA SR Legacy 11143: Celery, raw
  { id: 'celery-raw', name: 'Celery', aisle: 'produce', allergens: [],
    per100g: { kcal: 14, protein: 0.69, carbs: 2.97, fiber: 1.6, sugars: 1.34, fat: 0.17, satFat: 0.042, sodium: 80 } },
  // USDA SR Legacy 11352: Potatoes, flesh and skin, raw
  { id: 'potato-raw', name: 'Potato', aisle: 'produce', allergens: [],
    per100g: { kcal: 77, protein: 2.05, carbs: 17.49, fiber: 2.1, sugars: 0.82, fat: 0.09, satFat: 0.025, sodium: 6 } },
  // USDA SR Legacy 11507: Sweet potato, raw, unprepared
  { id: 'sweet-potato-raw', name: 'Sweet potato', aisle: 'produce', allergens: [],
    per100g: { kcal: 86, protein: 1.57, carbs: 20.12, fiber: 3, sugars: 4.18, fat: 0.05, satFat: 0.018, sodium: 55 } },
  // USDA SR Legacy 11422: Pumpkin, raw
  { id: 'pumpkin-raw', name: 'Pumpkin', aisle: 'produce', allergens: [],
    per100g: { kcal: 26, protein: 1, carbs: 6.5, fiber: 0.5, sugars: 2.76, fat: 0.1, satFat: 0.052, sodium: 1 } },
  // USDA SR Legacy 11485: Squash, winter, butternut, raw
  { id: 'butternut-squash-raw', name: 'Butternut squash', aisle: 'produce', allergens: [],
    per100g: { kcal: 45, protein: 1, carbs: 11.69, fiber: 2, sugars: 2.2, fat: 0.1, satFat: 0.021, sodium: 4 } },
  // USDA SR Legacy 11477: Squash, summer, zucchini, includes skin, raw
  { id: 'zucchini-raw', name: 'Zucchini', aisle: 'produce', allergens: [],
    per100g: { kcal: 17, protein: 1.21, carbs: 3.11, fiber: 1, sugars: 2.5, fat: 0.32, satFat: 0.084, sodium: 8 } },
  // USDA SR Legacy 11209: Eggplant, raw
  { id: 'eggplant-raw', name: 'Eggplant', aisle: 'produce', allergens: [],
    per100g: { kcal: 25, protein: 0.98, carbs: 5.88, fiber: 3, sugars: 3.53, fat: 0.18, satFat: 0.034, sodium: 2 } },
  // USDA SR Legacy 11278: Okra, raw
  { id: 'okra-raw', name: 'Okra', aisle: 'produce', allergens: [],
    per100g: { kcal: 33, protein: 1.93, carbs: 7.45, fiber: 3.2, sugars: 1.48, fat: 0.19, satFat: 0.026, sodium: 7 } },
  // USDA SR Legacy 11052: Beans, snap, green, raw
  { id: 'green-beans-raw', name: 'Green beans', aisle: 'produce', allergens: [],
    per100g: { kcal: 31, protein: 1.83, carbs: 6.97, fiber: 2.7, sugars: 3.26, fat: 0.22, satFat: 0.05, sodium: 6 } },
  // USDA SR Legacy 11333: Peppers, sweet, green, raw
  { id: 'green-bell-pepper-raw', name: 'Green bell pepper', aisle: 'produce', allergens: [],
    per100g: { kcal: 20, protein: 0.86, carbs: 4.64, fiber: 1.7, sugars: 2.4, fat: 0.17, satFat: 0.058, sodium: 3 } },
  // USDA SR Legacy 11821: Peppers, sweet, red, raw
  { id: 'red-bell-pepper-raw', name: 'Red bell pepper', aisle: 'produce', allergens: [],
    per100g: { kcal: 31, protein: 0.99, carbs: 6.03, fiber: 2.1, sugars: 4.2, fat: 0.3, satFat: 0.027, sodium: 4 } },
  // USDA SR Legacy 11670: Peppers, hot chili, green, raw
  { id: 'green-chili-raw', name: 'Green chili pepper', aisle: 'produce', allergens: [],
    per100g: { kcal: 40, protein: 2, carbs: 9.46, fiber: 1.5, sugars: 5.1, fat: 0.2, satFat: 0.021, sodium: 7 } },
  // USDA SR Legacy 11819: Peppers, hot chili, red, raw
  { id: 'red-chili-raw', name: 'Red chili pepper', aisle: 'produce', allergens: [],
    per100g: { kcal: 40, protein: 1.87, carbs: 8.81, fiber: 1.5, sugars: 5.3, fat: 0.44, satFat: 0.042, sodium: 9 } },
  // USDA SR Legacy 11632: Peppers, jalapeno, raw
  { id: 'jalapeno-raw', name: 'Jalapeño pepper', aisle: 'produce', allergens: [],
    per100g: { kcal: 29, protein: 0.91, carbs: 6.5, fiber: 2.8, sugars: 4.12, fat: 0.37, satFat: 0.092, sodium: 3 } },
  // USDA SR Legacy 11109: Cabbage, raw
  { id: 'cabbage-raw', name: 'Cabbage', aisle: 'produce', allergens: [],
    per100g: { kcal: 25, protein: 1.28, carbs: 5.8, fiber: 2.5, sugars: 3.2, fat: 0.1, satFat: 0.034, sodium: 18 } },
  // USDA SR Legacy 11112: Cabbage, red, raw
  { id: 'red-cabbage-raw', name: 'Red cabbage', aisle: 'produce', allergens: [],
    per100g: { kcal: 31, protein: 1.43, carbs: 7.37, fiber: 2.1, sugars: 3.83, fat: 0.16, satFat: 0.021, sodium: 27 } },
  // USDA SR Legacy 11135: Cauliflower, raw
  { id: 'cauliflower-raw', name: 'Cauliflower', aisle: 'produce', allergens: [],
    per100g: { kcal: 25, protein: 1.92, carbs: 4.97, fiber: 2, sugars: 1.91, fat: 0.28, satFat: 0.13, sodium: 30 } },
  // USDA SR Legacy 11090: Broccoli, raw
  { id: 'broccoli-raw', name: 'Broccoli', aisle: 'produce', allergens: [],
    per100g: { kcal: 34, protein: 2.82, carbs: 6.64, fiber: 2.6, sugars: 1.7, fat: 0.37, satFat: 0.039, sodium: 33 } },
  // USDA SR Legacy 11457: Spinach, raw
  { id: 'spinach-raw', name: 'Spinach', aisle: 'produce', allergens: [],
    per100g: { kcal: 23, protein: 2.86, carbs: 3.63, fiber: 2.2, sugars: 0.42, fat: 0.39, satFat: 0.063, sodium: 79 } },
  // USDA SR Legacy 11147: Chard, swiss, raw
  { id: 'swiss-chard-raw', name: 'Swiss chard', aisle: 'produce', allergens: [],
    per100g: { kcal: 19, protein: 1.8, carbs: 3.74, fiber: 1.6, sugars: 1.1, fat: 0.2, satFat: 0.03, sodium: 213 } },
  // USDA SR Legacy 11233: Kale, raw
  { id: 'kale-raw', name: 'Kale', aisle: 'produce', allergens: [],
    per100g: { kcal: 35, protein: 2.92, carbs: 4.42, fiber: 4.1, sugars: 0.99, fat: 1.49, satFat: 0.178, sodium: 53 } },
  // USDA SR Legacy 11251: Lettuce, cos or romaine, raw
  { id: 'romaine-lettuce-raw', name: 'Romaine lettuce', aisle: 'produce', allergens: [],
    per100g: { kcal: 17, protein: 1.23, carbs: 3.29, fiber: 2.1, sugars: 1.19, fat: 0.3, satFat: 0.039, sodium: 8 } },
  // USDA SR Legacy 11959: Arugula, raw
  { id: 'arugula-raw', name: 'Arugula (rocket)', aisle: 'produce', allergens: [],
    per100g: { kcal: 25, protein: 2.58, carbs: 3.65, fiber: 1.6, sugars: 2.05, fat: 0.66, satFat: 0.086, sodium: 27 } },
  // USDA SR Legacy 11429: Radishes, raw
  { id: 'radish-raw', name: 'Radish', aisle: 'produce', allergens: [],
    per100g: { kcal: 16, protein: 0.68, carbs: 3.4, fiber: 1.6, sugars: 1.86, fat: 0.1, satFat: 0.032, sodium: 39 } },
  // USDA SR Legacy 11080: Beets, raw
  { id: 'beetroot-raw', name: 'Beetroot', aisle: 'produce', allergens: [],
    per100g: { kcal: 43, protein: 1.61, carbs: 9.56, fiber: 2.8, sugars: 6.76, fat: 0.17, satFat: 0.027, sodium: 78 } },
  // USDA SR Legacy 11564: Turnips, raw
  { id: 'turnip-raw', name: 'Turnip', aisle: 'produce', allergens: [],
    per100g: { kcal: 28, protein: 0.9, carbs: 6.43, fiber: 1.8, sugars: 3.8, fat: 0.1, satFat: 0.011, sodium: 67 } },
  // USDA SR Legacy 11565: Turnips, cooked, boiled, drained, without salt. For turnips boiled whole in water that is
  // then poured away (most of their sodium leaches out: 67 -> 16 mg). Whole turnips lose little weight when boiled,
  // so recipes weigh them raw.
  { id: 'turnip-boiled', name: 'Turnip (boiled and drained)', aisle: 'produce', allergens: [],
    per100g: { kcal: 22, protein: 0.71, carbs: 5.06, fiber: 2, sugars: 2.99, fat: 0.08, satFat: 0.008, sodium: 16 } },
  // USDA SR Legacy 11246: Leeks, (bulb and lower leaf-portion), raw
  { id: 'leek-raw', name: 'Leek', aisle: 'produce', allergens: [],
    per100g: { kcal: 61, protein: 1.5, carbs: 14.15, fiber: 1.8, sugars: 3.9, fat: 0.3, satFat: 0.04, sodium: 20 } },
  // USDA SR Legacy 11260: Mushrooms, white, raw
  { id: 'mushroom-white-raw', name: 'White mushroom', aisle: 'produce', allergens: [],
    per100g: { kcal: 22, protein: 3.09, carbs: 3.26, fiber: 1, sugars: 1.98, fat: 0.34, satFat: 0.05, sodium: 5 } },
  // USDA SR Legacy 11238: Mushrooms, shiitake, raw
  { id: 'mushroom-shiitake-raw', name: 'Shiitake mushroom', aisle: 'produce', allergens: [],
    per100g: { kcal: 34, protein: 2.24, carbs: 6.79, fiber: 2.5, sugars: 2.38, fat: 0.49, satFat: 0.05, sodium: 9 } },
  // USDA SR Legacy 11116: Cabbage, chinese (pak-choi), raw
  { id: 'bok-choy-raw', name: 'Bok choy', aisle: 'produce', allergens: [],
    per100g: { kcal: 13, protein: 1.5, carbs: 2.18, fiber: 1, sugars: 1.18, fat: 0.2, satFat: 0.027, sodium: 65 } },
  // USDA SR Legacy 11300: Peas, edible-podded, raw
  { id: 'snow-peas-raw', name: 'Snow peas', aisle: 'produce', allergens: [],
    per100g: { kcal: 42, protein: 2.8, carbs: 7.55, fiber: 2.6, sugars: 4, fat: 0.2, satFat: 0.039, sodium: 4 } },
  // USDA SR Legacy 11300: Peas, edible-podded, raw (sugar snap and snow peas share one entry)
  { id: 'sugar-snap-peas-raw', name: 'Sugar snap peas', aisle: 'produce', allergens: [],
    per100g: { kcal: 42, protein: 2.8, carbs: 7.55, fiber: 2.6, sugars: 4, fat: 0.2, satFat: 0.039, sodium: 4 } },
  // USDA SR Legacy 11043: Mung beans, mature seeds, sprouted, raw
  { id: 'mung-bean-sprouts-raw', name: 'Mung bean sprouts', aisle: 'produce', allergens: [],
    per100g: { kcal: 30, protein: 3.04, carbs: 5.94, fiber: 1.8, sugars: 4.13, fat: 0.18, satFat: 0.046, sodium: 6 } },
  // USDA SR Legacy 11974: Grape leaves, raw
  { id: 'grape-leaves-raw', name: 'Grape leaves', aisle: 'produce', allergens: [],
    per100g: { kcal: 93, protein: 5.6, carbs: 17.31, fiber: 11, sugars: 6.3, fat: 2.12, satFat: 0.336, sodium: 9 } },
  // USDA SR Legacy 11972: Lemon grass (citronella), raw (fiber and sugars not reported)
  { id: 'lemongrass-raw', name: 'Lemongrass', aisle: 'produce', allergens: [],
    per100g: { kcal: 99, protein: 1.82, carbs: 25.3, fiber: 0, sugars: 0, fat: 0.49, satFat: 0.119, sodium: 6 } },
  // USDA SR Legacy 11427: Purslane, raw (fiber, sugars and saturated fat not reported)
  { id: 'purslane-raw', name: 'Purslane', aisle: 'produce', allergens: [],
    per100g: { kcal: 20, protein: 2.03, carbs: 3.39, fiber: 0, sugars: 0, fat: 0.36, satFat: 0, sodium: 45 } },
  // USDA SR Legacy 09150: Lemons, raw, without peel
  { id: 'lemon-raw', name: 'Lemon', aisle: 'produce', allergens: [],
    per100g: { kcal: 29, protein: 1.1, carbs: 9.32, fiber: 2.8, sugars: 2.5, fat: 0.3, satFat: 0.039, sodium: 2 } },
  // USDA SR Legacy 09159: Limes, raw
  { id: 'lime-raw', name: 'Lime', aisle: 'produce', allergens: [],
    per100g: { kcal: 30, protein: 0.7, carbs: 10.54, fiber: 2.8, sugars: 1.69, fat: 0.2, satFat: 0.022, sodium: 2 } },
  // USDA SR Legacy 09003: Apples, raw, with skin
  { id: 'apple-raw', name: 'Apple', aisle: 'produce', allergens: [],
    per100g: { kcal: 52, protein: 0.26, carbs: 13.81, fiber: 2.4, sugars: 10.39, fat: 0.17, satFat: 0.028, sodium: 1 } },
  // USDA SR Legacy 09040: Bananas, raw
  { id: 'banana-raw', name: 'Banana', aisle: 'produce', allergens: [],
    per100g: { kcal: 89, protein: 1.09, carbs: 22.84, fiber: 2.6, sugars: 12.23, fat: 0.33, satFat: 0.112, sodium: 1 } },
  // USDA SR Legacy 09200: Oranges, raw, all commercial varieties
  { id: 'orange-raw', name: 'Orange', aisle: 'produce', allergens: [],
    per100g: { kcal: 47, protein: 0.94, carbs: 11.75, fiber: 2.4, sugars: 9.35, fat: 0.12, satFat: 0.015, sodium: 0 } },
  // USDA SR Legacy 09252: Pears, raw
  { id: 'pear-raw', name: 'Pear', aisle: 'produce', allergens: [],
    per100g: { kcal: 57, protein: 0.36, carbs: 15.23, fiber: 3.1, sugars: 9.75, fat: 0.14, satFat: 0.022, sodium: 1 } },
  // USDA SR Legacy 09132: Grapes, red or green (European type, such as Thompson seedless), raw
  { id: 'grapes-raw', name: 'Grapes', aisle: 'produce', allergens: [],
    per100g: { kcal: 69, protein: 0.72, carbs: 18.1, fiber: 0.9, sugars: 15.48, fat: 0.16, satFat: 0.054, sodium: 2 } },
  // USDA SR Legacy 09286: Pomegranates, raw
  { id: 'pomegranate-seeds-raw', name: 'Pomegranate seeds (arils)', aisle: 'produce', allergens: [],
    per100g: { kcal: 83, protein: 1.67, carbs: 18.7, fiber: 4, sugars: 13.67, fat: 1.17, satFat: 0.12, sodium: 3 } },
  // USDA SR Legacy 09316: Strawberries, raw
  { id: 'strawberries-raw', name: 'Strawberries', aisle: 'produce', allergens: [],
    per100g: { kcal: 32, protein: 0.67, carbs: 7.68, fiber: 2, sugars: 4.89, fat: 0.3, satFat: 0.015, sodium: 1 } },
  // USDA SR Legacy 09050: Blueberries, raw
  { id: 'blueberries-raw', name: 'Blueberries', aisle: 'produce', allergens: [],
    per100g: { kcal: 57, protein: 0.74, carbs: 14.49, fiber: 2.4, sugars: 9.96, fat: 0.33, satFat: 0.028, sodium: 1 } },
  // USDA SR Legacy 09302: Raspberries, raw
  { id: 'raspberries-raw', name: 'Raspberries', aisle: 'produce', allergens: [],
    per100g: { kcal: 52, protein: 1.2, carbs: 11.94, fiber: 6.5, sugars: 4.42, fat: 0.65, satFat: 0.019, sodium: 1 } },
  // USDA SR Legacy 09148: Kiwifruit, green, raw
  { id: 'kiwifruit-raw', name: 'Kiwifruit', aisle: 'produce', allergens: [],
    per100g: { kcal: 61, protein: 1.14, carbs: 14.66, fiber: 3, sugars: 8.99, fat: 0.52, satFat: 0.029, sodium: 3 } },
  // USDA SR Legacy 09176: Mangos, raw
  { id: 'mango-raw', name: 'Mango', aisle: 'produce', allergens: [],
    per100g: { kcal: 60, protein: 0.82, carbs: 14.98, fiber: 1.6, sugars: 13.66, fat: 0.38, satFat: 0.092, sodium: 1 } },
  // USDA SR Legacy 09266: Pineapple, raw, all varieties
  { id: 'pineapple-raw', name: 'Pineapple', aisle: 'produce', allergens: [],
    per100g: { kcal: 50, protein: 0.54, carbs: 13.12, fiber: 1.4, sugars: 9.85, fat: 0.12, satFat: 0.009, sodium: 1 } },
  // USDA SR Legacy 09226: Papayas, raw
  { id: 'papaya-raw', name: 'Papaya', aisle: 'produce', allergens: [],
    per100g: { kcal: 43, protein: 0.47, carbs: 10.82, fiber: 1.7, sugars: 7.82, fat: 0.26, satFat: 0.081, sodium: 8 } },
  // USDA SR Legacy 09037: Avocados, raw, all commercial varieties
  { id: 'avocado-raw', name: 'Avocado', aisle: 'produce', allergens: [],
    per100g: { kcal: 160, protein: 2, carbs: 8.53, fiber: 6.7, sugars: 0.66, fat: 14.66, satFat: 2.126, sodium: 7 } },

  // Dried fruit. Whole dried fruit is not free sugar (SPEC.md).
  // USDA SR Legacy 09421: Dates, medjool (saturated fat not reported)
  { id: 'dates-medjool', name: 'Medjool dates', aisle: 'produce', allergens: [],
    per100g: { kcal: 277, protein: 1.81, carbs: 74.97, fiber: 6.7, sugars: 66.47, fat: 0.15, satFat: 0, sodium: 1 } },
  // USDA SR Legacy 09087: Dates, deglet noor (closest USDA match for Iraqi zahdi dates, a semi-dry variety)
  { id: 'dates-zahdi', name: 'Zahdi dates', aisle: 'produce', allergens: [],
    per100g: { kcal: 282, protein: 2.45, carbs: 75.03, fiber: 8, sugars: 63.35, fat: 0.39, satFat: 0.032, sodium: 2 } },
  // USDA SR Legacy 09032: Apricots, dried, sulfured, uncooked
  { id: 'apricots-dried', name: 'Dried apricots', aisle: 'produce', allergens: [],
    per100g: { kcal: 241, protein: 3.39, carbs: 62.64, fiber: 7.3, sugars: 53.44, fat: 0.51, satFat: 0.017, sodium: 10 } },
  // USDA SR Legacy 09298: Raisins, dark, seedless (FDC 168165)
  { id: 'raisins', name: 'Raisins', aisle: 'produce', allergens: [],
    per100g: { kcal: 299, protein: 3.3, carbs: 79.32, fiber: 4.5, sugars: 65.18, fat: 0.25, satFat: 0.094, sodium: 26 } },
  // USDA SR Legacy 09094: Figs, dried, uncooked
  { id: 'figs-dried', name: 'Dried figs', aisle: 'produce', allergens: [],
    per100g: { kcal: 249, protein: 3.3, carbs: 63.87, fiber: 9.8, sugars: 47.92, fat: 0.93, satFat: 0.144, sodium: 10 } },
  // No USDA entry for barberries (zereshk). Values of USDA SR Legacy 09085: Currants, zante, dried,
  // the closest small dried berry; used by the spoonful, so the proxy barely moves a recipe.
  { id: 'barberries-dried', name: 'Dried barberries (zereshk)', aisle: 'produce', allergens: [],
    per100g: { kcal: 290, protein: 3.43, carbs: 77, fiber: 4.4, sugars: 62.3, fat: 0.22, satFat: 0.085, sodium: 43 } },
  // No USDA entry for dried mulberries. Derived from USDA SR Legacy 09190: Mulberries, raw (87.7% water),
  // concentrated to 15% moisture (x6.9); matches typical label values for unsweetened dried white mulberries.
  { id: 'mulberries-dried', name: 'Dried mulberries', aisle: 'produce', allergens: [],
    per100g: { kcal: 297, protein: 9.94, carbs: 67.6, fiber: 11.7, sugars: 55.9, fat: 2.69, satFat: 0.19, sodium: 69 } },

  // Frozen vegetables and fruit, weighed frozen (unprepared).
  // USDA SR Legacy 11312: Peas, green, frozen, unprepared
  { id: 'green-peas-frozen', name: 'Green peas (frozen)', aisle: 'frozen', allergens: [],
    per100g: { kcal: 77, protein: 5.22, carbs: 13.62, fiber: 4.5, sugars: 5, fat: 0.4, satFat: 0.066, sodium: 108 } },
  // USDA SR Legacy 11463: Spinach, frozen, chopped or leaf, unprepared
  { id: 'spinach-frozen', name: 'Spinach (frozen)', aisle: 'frozen', allergens: [],
    per100g: { kcal: 29, protein: 3.63, carbs: 4.21, fiber: 2.9, sugars: 0.65, fat: 0.57, satFat: 0.041, sodium: 74 } },
  // USDA SR Legacy 11280: Okra, frozen, unprepared
  { id: 'okra-frozen', name: 'Okra (frozen)', aisle: 'frozen', allergens: [],
    per100g: { kcal: 30, protein: 1.69, carbs: 6.63, fiber: 2.2, sugars: 2.97, fat: 0.25, satFat: 0.065, sodium: 3 } },
  // USDA SR Legacy 11088: Broadbeans, immature seeds, raw (no frozen entry; frozen green fava are blanched
  // immature seeds; sugars not reported)
  { id: 'fava-beans-green-frozen', name: 'Green fava beans (frozen)', aisle: 'frozen', allergens: [],
    per100g: { kcal: 72, protein: 5.6, carbs: 11.7, fiber: 4.2, sugars: 0, fat: 0.6, satFat: 0.138, sodium: 50 } },
  // USDA SR Legacy 11231: Jute, potherb, raw (fiber and sugars not reported for raw; scaled from
  // 11232 Jute, potherb, cooked, boiled, drained, by protein ratio 1.26)
  { id: 'jute-leaves-frozen', name: 'Jute leaves (molokhia, frozen)', aisle: 'frozen', allergens: [],
    per100g: { kcal: 34, protein: 4.65, carbs: 5.8, fiber: 2.5, sugars: 1.3, fat: 0.25, satFat: 0.038, sodium: 8 } },
  // USDA SR Legacy 11178: Corn, sweet, yellow, frozen, kernels cut off cob, unprepared
  { id: 'sweet-corn-frozen', name: 'Sweet corn kernels (frozen)', aisle: 'frozen', allergens: [],
    per100g: { kcal: 88, protein: 3.02, carbs: 20.7, fiber: 2.1, sugars: 2.5, fat: 0.78, satFat: 0.119, sodium: 3 } },
  // USDA SR Legacy 11583: Vegetables, mixed, frozen, unprepared (sugars not reported)
  { id: 'mixed-vegetables-frozen', name: 'Mixed vegetables (frozen)', aisle: 'frozen', allergens: [],
    per100g: { kcal: 72, protein: 3.33, carbs: 13.5, fiber: 4, sugars: 0, fat: 0.52, satFat: 0.098, sodium: 47 } },
  // Composite, 50/50: USDA SR Legacy 09054: Blueberries, frozen, unsweetened and
  // 09318: Strawberries, frozen, unsweetened
  { id: 'mixed-berries-frozen', name: 'Mixed berries (frozen, unsweetened)', aisle: 'frozen', allergens: [],
    per100g: { kcal: 43, protein: 0.43, carbs: 10.67, fiber: 2.4, sugars: 6.51, fat: 0.38, satFat: 0.03, sodium: 2 } },
];
