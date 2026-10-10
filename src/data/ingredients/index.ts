// Aggregates every ingredient table. Ids must be unique across all files.
import type { Ingredient } from '../../types.ts';
import { ingredients as produce } from './produce.ts';
import { ingredients as herbsSpices } from './herbs-spices.ts';
import { ingredients as proteins } from './proteins.ts';
import { ingredients as dairyEggs } from './dairy-eggs.ts';
import { ingredients as grainsLegumes } from './grains-legumes.ts';
import { ingredients as pantry } from './pantry.ts';
import { ingredients as extraBreakfastMiddleEastern } from './extra/breakfast-middle-eastern.ts';
import { ingredients as extraLunchKurdishIraqi } from './extra/lunch-kurdish-iraqi.ts';
import { ingredients as extraLunchMediterranean } from './extra/lunch-mediterranean.ts';
import { ingredients as extraDinnerKurdishIraqi } from './extra/dinner-kurdish-iraqi.ts';
import { ingredients as extraDinnerMediterranean } from './extra/dinner-mediterranean.ts';
import { ingredients as extraSnacksMiddleEastern } from './extra/snacks-middle-eastern.ts';
import { ingredients as extraDesserts } from './extra/desserts.ts';
import { ingredients as extraBreakfastInternational } from './extra/breakfast-international.ts';
import { ingredients as extraLunchInternational } from './extra/lunch-international.ts';
import { ingredients as extraDinnerInternational } from './extra/dinner-international.ts';
import { ingredients as extraSnacksInternational } from './extra/snacks-international.ts';
import { ingredients as extraChickenKurdishIraqi1 } from './extra/chicken-kurdish-iraqi-1.ts';
import { ingredients as extraChickenSouthAsian1 } from './extra/chicken-south-asian-1.ts';
import { ingredients as extraChickenLatinAmerican1 } from './extra/chicken-latin-american-1.ts';
import { ingredients as extraChickenBitesBowls1 } from './extra/chicken-bites-bowls-1.ts';
import { ingredients as extraBreakfastWorld1 } from './extra/breakfast-world-1.ts';
import { ingredients as extraFishMeat1 } from './extra/fish-meat-1.ts';
import { ingredients as extraVegetarianMains1 } from './extra/vegetarian-mains-1.ts';
import { ingredients as extraSnacksDesserts1 } from './extra/snacks-desserts-1.ts';
import { ingredients as extraChickenTurkish1 } from './extra/chicken-turkish-1.ts';
import { ingredients as extraChickenEastAsian1 } from './extra/chicken-east-asian-1.ts';
import { ingredients as extraChickenMaghrebIberia1 } from './extra/chicken-maghreb-iberia-1.ts';
import { ingredients as extraChickenBitesBowls2 } from './extra/chicken-bites-bowls-2.ts';
import { ingredients as extraBreakfastWorld2 } from './extra/breakfast-world-2.ts';
import { ingredients as extraFishMeat2 } from './extra/fish-meat-2.ts';
import { ingredients as extraVegetarianMains2 } from './extra/vegetarian-mains-2.ts';
import { ingredients as extraSnacksDesserts2 } from './extra/snacks-desserts-2.ts';
import { ingredients as extraChickenPersian1 } from './extra/chicken-persian-1.ts';
import { ingredients as extraChickenSouthAsian2 } from './extra/chicken-south-asian-2.ts';
import { ingredients as extraChickenSoutheastAsian1 } from './extra/chicken-southeast-asian-1.ts';
import { ingredients as extraChickenBitesBowls3 } from './extra/chicken-bites-bowls-3.ts';
import { ingredients as extraBreakfastWorld3 } from './extra/breakfast-world-3.ts';
import { ingredients as extraFishMeat3 } from './extra/fish-meat-3.ts';
import { ingredients as extraVegetarianMains3 } from './extra/vegetarian-mains-3.ts';
import { ingredients as extraSnacksDesserts3 } from './extra/snacks-desserts-3.ts';
import { ingredients as extraChickenGulfEgyptian1 } from './extra/chicken-gulf-egyptian-1.ts';
import { ingredients as extraChickenSoutheastAsian2 } from './extra/chicken-southeast-asian-2.ts';
import { ingredients as extraChickenWesternMediterranean1 } from './extra/chicken-western-mediterranean-1.ts';
import { ingredients as extraChickenBitesBowls4 } from './extra/chicken-bites-bowls-4.ts';
import { ingredients as extraBreakfastWorld4 } from './extra/breakfast-world-4.ts';
import { ingredients as extraFishMeat4 } from './extra/fish-meat-4.ts';
import { ingredients as extraVegetarianMains4 } from './extra/vegetarian-mains-4.ts';
import { ingredients as extraSnacksDesserts4 } from './extra/snacks-desserts-4.ts';
import { ingredients as extraChickenLevantine1 } from './extra/chicken-levantine-1.ts';
import { ingredients as extraChickenSouthAsian3 } from './extra/chicken-south-asian-3.ts';
import { ingredients as extraChickenWorld1 } from './extra/chicken-world-1.ts';
import { ingredients as extraChickenBitesBowls5 } from './extra/chicken-bites-bowls-5.ts';
import { ingredients as extraBreakfastWorld5 } from './extra/breakfast-world-5.ts';
import { ingredients as extraFishMeat5 } from './extra/fish-meat-5.ts';
import { ingredients as extraVegetarianMains5 } from './extra/vegetarian-mains-5.ts';
import { ingredients as extraSnacksDesserts5 } from './extra/snacks-desserts-5.ts';

export const INGREDIENT_SOURCES: Record<string, readonly Ingredient[]> = {
  'produce': produce,
  'herbs-spices': herbsSpices,
  'proteins': proteins,
  'dairy-eggs': dairyEggs,
  'grains-legumes': grainsLegumes,
  'pantry': pantry,
  'extra/breakfast-middle-eastern': extraBreakfastMiddleEastern,
  'extra/lunch-kurdish-iraqi': extraLunchKurdishIraqi,
  'extra/lunch-mediterranean': extraLunchMediterranean,
  'extra/dinner-kurdish-iraqi': extraDinnerKurdishIraqi,
  'extra/dinner-mediterranean': extraDinnerMediterranean,
  'extra/snacks-middle-eastern': extraSnacksMiddleEastern,
  'extra/desserts': extraDesserts,
  'extra/breakfast-international': extraBreakfastInternational,
  'extra/lunch-international': extraLunchInternational,
  'extra/dinner-international': extraDinnerInternational,
  'extra/snacks-international': extraSnacksInternational,
  'extra/chicken-kurdish-iraqi-1': extraChickenKurdishIraqi1,
  'extra/chicken-south-asian-1': extraChickenSouthAsian1,
  'extra/chicken-latin-american-1': extraChickenLatinAmerican1,
  'extra/chicken-bites-bowls-1': extraChickenBitesBowls1,
  'extra/breakfast-world-1': extraBreakfastWorld1,
  'extra/fish-meat-1': extraFishMeat1,
  'extra/vegetarian-mains-1': extraVegetarianMains1,
  'extra/snacks-desserts-1': extraSnacksDesserts1,
  'extra/chicken-turkish-1': extraChickenTurkish1,
  'extra/chicken-east-asian-1': extraChickenEastAsian1,
  'extra/chicken-maghreb-iberia-1': extraChickenMaghrebIberia1,
  'extra/chicken-bites-bowls-2': extraChickenBitesBowls2,
  'extra/breakfast-world-2': extraBreakfastWorld2,
  'extra/fish-meat-2': extraFishMeat2,
  'extra/vegetarian-mains-2': extraVegetarianMains2,
  'extra/snacks-desserts-2': extraSnacksDesserts2,
  'extra/chicken-persian-1': extraChickenPersian1,
  'extra/chicken-south-asian-2': extraChickenSouthAsian2,
  'extra/chicken-southeast-asian-1': extraChickenSoutheastAsian1,
  'extra/chicken-bites-bowls-3': extraChickenBitesBowls3,
  'extra/breakfast-world-3': extraBreakfastWorld3,
  'extra/fish-meat-3': extraFishMeat3,
  'extra/vegetarian-mains-3': extraVegetarianMains3,
  'extra/snacks-desserts-3': extraSnacksDesserts3,
  'extra/chicken-gulf-egyptian-1': extraChickenGulfEgyptian1,
  'extra/chicken-southeast-asian-2': extraChickenSoutheastAsian2,
  'extra/chicken-western-mediterranean-1': extraChickenWesternMediterranean1,
  'extra/chicken-bites-bowls-4': extraChickenBitesBowls4,
  'extra/breakfast-world-4': extraBreakfastWorld4,
  'extra/fish-meat-4': extraFishMeat4,
  'extra/vegetarian-mains-4': extraVegetarianMains4,
  'extra/snacks-desserts-4': extraSnacksDesserts4,
  'extra/chicken-levantine-1': extraChickenLevantine1,
  'extra/chicken-south-asian-3': extraChickenSouthAsian3,
  'extra/chicken-world-1': extraChickenWorld1,
  'extra/chicken-bites-bowls-5': extraChickenBitesBowls5,
  'extra/breakfast-world-5': extraBreakfastWorld5,
  'extra/fish-meat-5': extraFishMeat5,
  'extra/vegetarian-mains-5': extraVegetarianMains5,
  'extra/snacks-desserts-5': extraSnacksDesserts5,
};

export const INGREDIENTS: readonly Ingredient[] = Object.values(INGREDIENT_SOURCES).flat();
