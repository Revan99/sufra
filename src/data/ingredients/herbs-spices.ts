// Fresh and dried herbs, spices, spice blends and salt. Per 100 g, USDA FoodData Central.
// Where USDA has no entry (sumac, dried lime, regional blends), the comment says how the values were built.
// "not reported" means USDA gives no value for that nutrient; it is entered as 0.
import type { Ingredient } from '../../types.ts';

export const ingredients: Ingredient[] = [
  // Fresh herbs
  // USDA SR Legacy 11297: Parsley, fresh
  { id: 'parsley-fresh', name: 'Parsley', aisle: 'herbs', allergens: [],
    per100g: { kcal: 36, protein: 2.97, carbs: 6.33, fiber: 3.3, sugars: 0.85, fat: 0.79, satFat: 0.132, sodium: 56 } },
  // USDA SR Legacy 11165: Coriander (cilantro) leaves, raw
  { id: 'coriander-leaves-fresh', name: 'Coriander leaves (cilantro)', aisle: 'herbs', allergens: [],
    per100g: { kcal: 23, protein: 2.13, carbs: 3.67, fiber: 2.8, sugars: 0.87, fat: 0.52, satFat: 0.014, sodium: 46 } },
  // USDA SR Legacy 02065: Spearmint, fresh (sugars not reported)
  { id: 'mint-fresh', name: 'Fresh mint', aisle: 'herbs', allergens: [],
    per100g: { kcal: 44, protein: 3.29, carbs: 8.41, fiber: 6.8, sugars: 0, fat: 0.73, satFat: 0.191, sodium: 30 } },
  // USDA SR Legacy 02045: Dill weed, fresh (sugars not reported)
  { id: 'dill-fresh', name: 'Dill', aisle: 'herbs', allergens: [],
    per100g: { kcal: 43, protein: 3.46, carbs: 7.02, fiber: 2.1, sugars: 0, fat: 1.12, satFat: 0.06, sodium: 61 } },
  // USDA SR Legacy 02044: Basil, fresh
  { id: 'basil-fresh', name: 'Basil', aisle: 'herbs', allergens: [],
    per100g: { kcal: 23, protein: 3.15, carbs: 2.65, fiber: 1.6, sugars: 0.3, fat: 0.64, satFat: 0.041, sodium: 4 } },
  // USDA SR Legacy 02049: Thyme, fresh (sugars not reported)
  { id: 'thyme-fresh', name: 'Fresh thyme', aisle: 'herbs', allergens: [],
    per100g: { kcal: 101, protein: 5.56, carbs: 24.45, fiber: 14, sugars: 0, fat: 1.68, satFat: 0.467, sodium: 9 } },
  // No USDA entry for fresh tarragon. Derived from USDA SR Legacy 02041: Spices, tarragon, dried
  // (7.7% water), diluted to 80% water (x0.217), typical of fresh leafy herbs; sugars not reported.
  { id: 'tarragon-fresh', name: 'Tarragon', aisle: 'herbs', allergens: [],
    per100g: { kcal: 64, protein: 4.94, carbs: 10.89, fiber: 1.6, sugars: 0, fat: 1.57, satFat: 0.41, sodium: 13 } },

  // Dried herbs
  // USDA SR Legacy 02066: Spearmint, dried (sugars not reported)
  { id: 'mint-dried', name: 'Dried mint', aisle: 'spices', allergens: [],
    per100g: { kcal: 285, protein: 19.93, carbs: 52.04, fiber: 29.8, sugars: 0, fat: 6.03, satFat: 1.58, sodium: 344 } },
  // USDA SR Legacy 02042: Spices, thyme, dried
  { id: 'thyme-dried', name: 'Dried thyme', aisle: 'spices', allergens: [],
    per100g: { kcal: 276, protein: 9.11, carbs: 63.94, fiber: 37, sugars: 1.71, fat: 7.43, satFat: 2.73, sodium: 55 } },
  // USDA SR Legacy 02027: Spices, oregano, dried
  { id: 'oregano-dried', name: 'Dried oregano', aisle: 'spices', allergens: [],
    per100g: { kcal: 265, protein: 9, carbs: 68.92, fiber: 42.5, sugars: 4.09, fat: 4.28, satFat: 1.551, sodium: 25 } },
  // USDA SR Legacy 02004: Spices, bay leaf (sugars not reported)
  { id: 'bay-leaf-dried', name: 'Bay leaf', aisle: 'spices', allergens: [],
    per100g: { kcal: 313, protein: 7.61, carbs: 74.97, fiber: 26.3, sugars: 0, fat: 8.36, satFat: 2.28, sodium: 23 } },
  // No USDA entry for dried fenugreek leaves (kasuri methi). Values of USDA SR Legacy 02012:
  // Spices, coriander leaf, dried, the closest dried leafy herb; used by the teaspoon.
  { id: 'fenugreek-leaves-dried', name: 'Dried fenugreek leaves (kasuri methi)', aisle: 'spices', allergens: [],
    per100g: { kcal: 279, protein: 21.93, carbs: 52.1, fiber: 10.4, sugars: 7.27, fat: 4.78, satFat: 0.115, sodium: 211 } },

  // Ground and whole spices
  // USDA SR Legacy 02014: Spices, cumin seed (USDA has no separate ground entry)
  { id: 'cumin-ground', name: 'Cumin, ground', aisle: 'spices', allergens: [],
    per100g: { kcal: 375, protein: 17.81, carbs: 44.24, fiber: 10.5, sugars: 2.25, fat: 22.27, satFat: 1.535, sodium: 168 } },
  // USDA SR Legacy 02014: Spices, cumin seed
  { id: 'cumin-seeds', name: 'Cumin seeds', aisle: 'spices', allergens: [],
    per100g: { kcal: 375, protein: 17.81, carbs: 44.24, fiber: 10.5, sugars: 2.25, fat: 22.27, satFat: 1.535, sodium: 168 } },
  // USDA SR Legacy 02013: Spices, coriander seed (sugars not reported)
  { id: 'coriander-ground', name: 'Coriander, ground', aisle: 'spices', allergens: [],
    per100g: { kcal: 298, protein: 12.37, carbs: 54.99, fiber: 41.9, sugars: 0, fat: 17.77, satFat: 0.99, sodium: 35 } },
  // USDA SR Legacy 02043: Spices, turmeric, ground
  { id: 'turmeric-ground', name: 'Turmeric, ground', aisle: 'spices', allergens: [],
    per100g: { kcal: 312, protein: 9.68, carbs: 67.14, fiber: 22.7, sugars: 3.21, fat: 3.25, satFat: 1.838, sodium: 27 } },
  // USDA SR Legacy 02010: Spices, cinnamon, ground
  { id: 'cinnamon-ground', name: 'Cinnamon, ground', aisle: 'spices', allergens: [],
    per100g: { kcal: 247, protein: 3.99, carbs: 80.59, fiber: 53.1, sugars: 2.17, fat: 1.24, satFat: 0.345, sodium: 10 } },
  // USDA SR Legacy 02010: Spices, cinnamon, ground (same bark, whole)
  { id: 'cinnamon-stick', name: 'Cinnamon stick', aisle: 'spices', allergens: [],
    per100g: { kcal: 247, protein: 3.99, carbs: 80.59, fiber: 53.1, sugars: 2.17, fat: 1.24, satFat: 0.345, sodium: 10 } },
  // USDA SR Legacy 02006: Spices, cardamom (sugars not reported)
  { id: 'cardamom-ground', name: 'Cardamom, ground', aisle: 'spices', allergens: [],
    per100g: { kcal: 311, protein: 10.76, carbs: 68.47, fiber: 28, sugars: 0, fat: 6.7, satFat: 0.68, sodium: 18 } },
  // USDA SR Legacy 02006: Spices, cardamom (whole green pods; sugars not reported)
  { id: 'cardamom-pods', name: 'Cardamom pods', aisle: 'spices', allergens: [],
    per100g: { kcal: 311, protein: 10.76, carbs: 68.47, fiber: 28, sugars: 0, fat: 6.7, satFat: 0.68, sodium: 18 } },
  // USDA SR Legacy 02001: Spices, allspice, ground (sugars not reported). kcal is general Atwater
  // (USDA lists 263 from spice-specific factors, which the macro check rejects).
  { id: 'allspice-ground', name: 'Allspice, ground', aisle: 'spices', allergens: [],
    per100g: { kcal: 348, protein: 6.09, carbs: 72.12, fiber: 21.6, sugars: 0, fat: 8.69, satFat: 2.55, sodium: 77 } },
  // USDA SR Legacy 02011: Spices, cloves, ground. kcal is general Atwater
  // (USDA lists 274 from spice-specific factors, which the macro check rejects).
  { id: 'cloves-ground', name: 'Cloves, ground', aisle: 'spices', allergens: [],
    per100g: { kcal: 335, protein: 5.97, carbs: 65.53, fiber: 33.9, sugars: 2.38, fat: 13, satFat: 3.952, sodium: 277 } },
  // USDA SR Legacy 02025: Spices, nutmeg, ground
  { id: 'nutmeg-ground', name: 'Nutmeg, ground', aisle: 'spices', allergens: [],
    per100g: { kcal: 525, protein: 5.84, carbs: 49.29, fiber: 20.8, sugars: 2.99, fat: 36.31, satFat: 25.94, sodium: 16 } },
  // USDA SR Legacy 02021: Spices, ginger, ground
  { id: 'ginger-ground', name: 'Ginger, ground', aisle: 'spices', allergens: [],
    per100g: { kcal: 335, protein: 8.98, carbs: 71.62, fiber: 14.1, sugars: 3.39, fat: 4.24, satFat: 2.6, sodium: 27 } },
  // USDA SR Legacy 02037: Spices, saffron (sugars not reported)
  { id: 'saffron', name: 'Saffron', aisle: 'spices', allergens: [],
    per100g: { kcal: 310, protein: 11.43, carbs: 65.37, fiber: 3.9, sugars: 0, fat: 5.85, satFat: 1.586, sodium: 148 } },
  // USDA SR Legacy 02030: Spices, pepper, black
  { id: 'black-pepper-ground', name: 'Black pepper, ground', aisle: 'spices', allergens: [],
    per100g: { kcal: 251, protein: 10.39, carbs: 63.95, fiber: 25.3, sugars: 0.64, fat: 3.26, satFat: 1.392, sodium: 20 } },
  // USDA SR Legacy 02032: Spices, pepper, white (sugars not reported)
  { id: 'white-pepper-ground', name: 'White pepper, ground', aisle: 'spices', allergens: [],
    per100g: { kcal: 296, protein: 10.4, carbs: 68.61, fiber: 26.2, sugars: 0, fat: 2.12, satFat: 0.626, sodium: 5 } },
  // USDA SR Legacy 02024: Spices, mustard seed, ground (whole seed has the same composition)
  { id: 'mustard-seeds', name: 'Mustard seeds', aisle: 'spices', allergens: [],
    per100g: { kcal: 508, protein: 26.08, carbs: 28.09, fiber: 12.2, sugars: 6.79, fat: 36.24, satFat: 1.46, sodium: 13 } },
  // USDA SR Legacy 02047: Salt, table
  { id: 'salt', name: 'Salt', aisle: 'spices', allergens: [],
    per100g: { kcal: 0, protein: 0, carbs: 0, fiber: 0, sugars: 0, fat: 0, satFat: 0, sodium: 38758 } },
  // USDA SR Legacy 02020: Spices, garlic powder
  { id: 'garlic-powder', name: 'Garlic powder', aisle: 'spices', allergens: [],
    per100g: { kcal: 331, protein: 16.55, carbs: 72.73, fiber: 9, sugars: 2.43, fat: 0.73, satFat: 0.249, sodium: 60 } },
  // USDA SR Legacy 02026: Spices, onion powder
  { id: 'onion-powder', name: 'Onion powder', aisle: 'spices', allergens: [],
    per100g: { kcal: 341, protein: 10.41, carbs: 79.12, fiber: 15.2, sugars: 6.63, fat: 1.04, satFat: 0.219, sodium: 73 } },

  // Paprika and chili
  // USDA SR Legacy 02028: Spices, paprika
  { id: 'paprika', name: 'Paprika', aisle: 'spices', allergens: [],
    per100g: { kcal: 282, protein: 14.14, carbs: 53.99, fiber: 34.9, sugars: 10.34, fat: 12.89, satFat: 2.14, sodium: 68 } },
  // USDA SR Legacy 02028: Spices, paprika (no smoked entry; smoking does not change the macros)
  { id: 'paprika-smoked', name: 'Smoked paprika', aisle: 'spices', allergens: [],
    per100g: { kcal: 282, protein: 14.14, carbs: 53.99, fiber: 34.9, sugars: 10.34, fat: 12.89, satFat: 2.14, sodium: 68 } },
  // USDA SR Legacy 02031: Spices, pepper, red or cayenne
  { id: 'cayenne-pepper', name: 'Cayenne pepper', aisle: 'spices', allergens: [],
    per100g: { kcal: 318, protein: 12.01, carbs: 56.63, fiber: 27.2, sugars: 10.34, fat: 17.27, satFat: 3.26, sodium: 30 } },
  // USDA SR Legacy 02031: Spices, pepper, red or cayenne (crushed dried red chili)
  { id: 'red-pepper-flakes', name: 'Red pepper flakes', aisle: 'spices', allergens: [],
    per100g: { kcal: 318, protein: 12.01, carbs: 56.63, fiber: 27.2, sugars: 10.34, fat: 17.27, satFat: 3.26, sodium: 30 } },
  // No USDA entry. Values of USDA SR Legacy 02031: Spices, pepper, red or cayenne (same crushed dried
  // Capsicum annuum). Some pul biber is salted; this assumes the unsalted kind.
  { id: 'aleppo-pepper', name: 'Aleppo pepper (pul biber)', aisle: 'spices', allergens: [],
    per100g: { kcal: 318, protein: 12.01, carbs: 56.63, fiber: 27.2, sugars: 10.34, fat: 17.27, satFat: 3.26, sodium: 30 } },
  // No USDA entry. Values of USDA SR Legacy 02031: Spices, pepper, red or cayenne (dried Korean red chili).
  { id: 'gochugaru', name: 'Gochugaru (Korean chili flakes)', aisle: 'spices', allergens: [],
    per100g: { kcal: 318, protein: 12.01, carbs: 56.63, fiber: 27.2, sugars: 10.34, fat: 17.27, satFat: 3.26, sodium: 30 } },
  // No USDA entry. Values of USDA SR Legacy 02031: Spices, pepper, red or cayenne (chipotle is pure
  // ground smoked dried jalapeño, unsalted).
  { id: 'chipotle-chili-powder', name: 'Chipotle chili powder', aisle: 'spices', allergens: [],
    per100g: { kcal: 318, protein: 12.01, carbs: 56.63, fiber: 27.2, sugars: 10.34, fat: 17.27, satFat: 3.26, sodium: 30 } },
  // USDA SR Legacy 02009: Spices, chili powder (a US blend of chili, cumin, oregano, garlic and salt)
  { id: 'chili-powder', name: 'Chili powder (blend)', aisle: 'spices', allergens: [],
    per100g: { kcal: 282, protein: 13.46, carbs: 49.7, fiber: 34.8, sugars: 7.19, fat: 14.28, satFat: 2.46, sodium: 2867 } },
  // USDA SR Legacy 02015: Spices, curry powder
  { id: 'curry-powder', name: 'Curry powder', aisle: 'spices', allergens: [],
    per100g: { kcal: 325, protein: 14.29, carbs: 55.83, fiber: 53.2, sugars: 2.76, fat: 14.01, satFat: 1.645, sodium: 52 } },

  // Souring agents
  // No USDA entry for sumac. Approximated from published proximate analysis of ground Rhus coriaria
  // (about 7% water, 2.6% protein, 7.4% fat, 1.8% ash, carbs by difference, ~25% dietary fiber; much of
  // the rest is organic acid, so kcal sits below Atwater). Salt-free sumac; sugars not reported.
  { id: 'sumac-ground', name: 'Sumac, ground', aisle: 'spices', allergens: [],
    per100g: { kcal: 330, protein: 2.6, carbs: 81.3, fiber: 25, sugars: 0, fat: 7.4, satFat: 1.2, sodium: 20 } },
  // No USDA entry for dried lime (noomi basrah, loomi). Derived from USDA SR Legacy 09159: Limes, raw
  // (88.3% water), concentrated to 10% moisture (x7.67); kcal from the scaled macros (general Atwater),
  // since scaling USDA's 30 kcal gives 230, which the macro check rejects.
  { id: 'dried-lime', name: 'Dried lime (noomi basrah)', aisle: 'spices', allergens: [],
    per100g: { kcal: 315, protein: 5.37, carbs: 80.8, fiber: 21.5, sugars: 12.96, fat: 1.53, satFat: 0.17, sodium: 15 } },

  // Spice blends. No USDA entries; each is a weighted composite of the USDA spices above (by weight),
  // salt-free unless noted. Sugars count as 0 for spices where USDA reports none.
  // Za'atar: dried thyme 42%, sesame seeds 30% (USDA SR Legacy 12023: Seeds, sesame seeds, whole,
  // dried), sumac 25%, salt 3% (store blends are lightly salted).
  { id: 'zaatar-blend', name: "Za'atar blend", aisle: 'spices', allergens: ['sesame'],
    per100g: { kcal: 370, protein: 9.8, carbs: 54.21, fiber: 25.3, sugars: 0.81, fat: 19.87, satFat: 3.534, sodium: 1194 } },
  // Baharat (Iraqi/Gulf): black pepper 20%, paprika 15%, cumin 15%, coriander 15%, cinnamon 10%,
  // cardamom 10%, cloves 7.5%, nutmeg 7.5%.
  { id: 'baharat', name: 'Baharat spice blend', aisle: 'spices', allergens: [],
    per100g: { kcal: 314, protein: 11.09, carbs: 59.29, fiber: 30.4, sugars: 2.64, fat: 13.08, satFat: 3.323, sodium: 69 } },
  // Seven spice (sabaa baharat): allspice 25%, black pepper 25%, cinnamon 15%, cloves 10%, nutmeg 10%,
  // coriander 7.5%, ground ginger 7.5%.
  { id: 'seven-spice', name: 'Seven spice blend', aisle: 'spices', allergens: [],
    per100g: { kcal: 320, protein: 7.5, carbs: 67.08, fiber: 29.4, sugars: 1.28, fat: 9.76, satFat: 4.296, sodium: 60 } },
  // Garam masala: coriander 20%, cumin 20%, black pepper 15%, cardamom 15%, cinnamon 15%, cloves 10%,
  // nutmeg 5%.
  { id: 'garam-masala', name: 'Garam masala', aisle: 'spices', allergens: [],
    per100g: { kcal: 316, protein: 10.7, carbs: 60.82, fiber: 30.9, sugars: 1.26, fat: 12.8, satFat: 2.56, sodium: 76 } },
  // Biryani spice blend: cumin 20%, coriander 15%, cardamom 15%, cinnamon 15%, black pepper 10%,
  // turmeric 10%, cloves 10%, ground ginger 5%.
  { id: 'biryani-spice-blend', name: 'Biryani spice blend', aisle: 'spices', allergens: [],
    per100g: { kcal: 310, protein: 10.68, carbs: 62.7, fiber: 29.4, sugars: 1.57, fat: 10.47, satFat: 1.457, sodium: 77 } },
  // Ras el hanout: cumin 15%, coriander 15%, ground ginger 15%, cinnamon 15%, turmeric 10%,
  // black pepper 10%, paprika 10%, allspice 5%, cardamom 5%.
  { id: 'ras-el-hanout', name: 'Ras el hanout', aisle: 'spices', allergens: [],
    per100g: { kcal: 306, protein: 10.74, carbs: 63.25, fiber: 28.7, sugars: 2.59, fat: 9.54, satFat: 1.519, sodium: 52 } },
];
