// Aggregates every recipe file. Ids must be unique across all files.
import type { Recipe } from '../../types.ts';
import { recipes as breakfastMiddleEastern } from './breakfast-middle-eastern.ts';
import { recipes as lunchKurdishIraqi } from './lunch-kurdish-iraqi.ts';
import { recipes as lunchMediterranean } from './lunch-mediterranean.ts';
import { recipes as dinnerKurdishIraqi } from './dinner-kurdish-iraqi.ts';
import { recipes as dinnerMediterranean } from './dinner-mediterranean.ts';
import { recipes as snacksMiddleEastern } from './snacks-middle-eastern.ts';
import { recipes as desserts } from './desserts.ts';
import { recipes as breakfastInternational } from './breakfast-international.ts';
import { recipes as lunchInternational } from './lunch-international.ts';
import { recipes as dinnerInternational } from './dinner-international.ts';
import { recipes as snacksInternational } from './snacks-international.ts';
import { recipes as chickenKurdishIraqi1 } from './chicken-kurdish-iraqi-1.ts';
import { recipes as chickenSouthAsian1 } from './chicken-south-asian-1.ts';
import { recipes as chickenLatinAmerican1 } from './chicken-latin-american-1.ts';
import { recipes as chickenBitesBowls1 } from './chicken-bites-bowls-1.ts';
import { recipes as breakfastWorld1 } from './breakfast-world-1.ts';
import { recipes as fishMeat1 } from './fish-meat-1.ts';
import { recipes as vegetarianMains1 } from './vegetarian-mains-1.ts';
import { recipes as snacksDesserts1 } from './snacks-desserts-1.ts';
import { recipes as chickenTurkish1 } from './chicken-turkish-1.ts';
import { recipes as chickenEastAsian1 } from './chicken-east-asian-1.ts';
import { recipes as chickenMaghrebIberia1 } from './chicken-maghreb-iberia-1.ts';
import { recipes as chickenBitesBowls2 } from './chicken-bites-bowls-2.ts';
import { recipes as breakfastWorld2 } from './breakfast-world-2.ts';
import { recipes as fishMeat2 } from './fish-meat-2.ts';
import { recipes as vegetarianMains2 } from './vegetarian-mains-2.ts';
import { recipes as snacksDesserts2 } from './snacks-desserts-2.ts';
import { recipes as chickenPersian1 } from './chicken-persian-1.ts';
import { recipes as chickenSouthAsian2 } from './chicken-south-asian-2.ts';
import { recipes as chickenSoutheastAsian1 } from './chicken-southeast-asian-1.ts';
import { recipes as chickenBitesBowls3 } from './chicken-bites-bowls-3.ts';
import { recipes as breakfastWorld3 } from './breakfast-world-3.ts';
import { recipes as fishMeat3 } from './fish-meat-3.ts';
import { recipes as vegetarianMains3 } from './vegetarian-mains-3.ts';
import { recipes as snacksDesserts3 } from './snacks-desserts-3.ts';
import { recipes as chickenGulfEgyptian1 } from './chicken-gulf-egyptian-1.ts';
import { recipes as chickenSoutheastAsian2 } from './chicken-southeast-asian-2.ts';
import { recipes as chickenWesternMediterranean1 } from './chicken-western-mediterranean-1.ts';
import { recipes as chickenBitesBowls4 } from './chicken-bites-bowls-4.ts';
import { recipes as breakfastWorld4 } from './breakfast-world-4.ts';
import { recipes as fishMeat4 } from './fish-meat-4.ts';
import { recipes as vegetarianMains4 } from './vegetarian-mains-4.ts';
import { recipes as snacksDesserts4 } from './snacks-desserts-4.ts';
import { recipes as chickenLevantine1 } from './chicken-levantine-1.ts';
import { recipes as chickenSouthAsian3 } from './chicken-south-asian-3.ts';
import { recipes as chickenWorld1 } from './chicken-world-1.ts';
import { recipes as chickenBitesBowls5 } from './chicken-bites-bowls-5.ts';
import { recipes as breakfastWorld5 } from './breakfast-world-5.ts';
import { recipes as fishMeat5 } from './fish-meat-5.ts';
import { recipes as vegetarianMains5 } from './vegetarian-mains-5.ts';
import { recipes as snacksDesserts5 } from './snacks-desserts-5.ts';

export const RECIPE_SOURCES: Record<string, readonly Recipe[]> = {
  'breakfast-middle-eastern': breakfastMiddleEastern,
  'lunch-kurdish-iraqi': lunchKurdishIraqi,
  'lunch-mediterranean': lunchMediterranean,
  'dinner-kurdish-iraqi': dinnerKurdishIraqi,
  'dinner-mediterranean': dinnerMediterranean,
  'snacks-middle-eastern': snacksMiddleEastern,
  'desserts': desserts,
  'breakfast-international': breakfastInternational,
  'lunch-international': lunchInternational,
  'dinner-international': dinnerInternational,
  'snacks-international': snacksInternational,
  'chicken-kurdish-iraqi-1': chickenKurdishIraqi1,
  'chicken-south-asian-1': chickenSouthAsian1,
  'chicken-latin-american-1': chickenLatinAmerican1,
  'chicken-bites-bowls-1': chickenBitesBowls1,
  'breakfast-world-1': breakfastWorld1,
  'fish-meat-1': fishMeat1,
  'vegetarian-mains-1': vegetarianMains1,
  'snacks-desserts-1': snacksDesserts1,
  'chicken-turkish-1': chickenTurkish1,
  'chicken-east-asian-1': chickenEastAsian1,
  'chicken-maghreb-iberia-1': chickenMaghrebIberia1,
  'chicken-bites-bowls-2': chickenBitesBowls2,
  'breakfast-world-2': breakfastWorld2,
  'fish-meat-2': fishMeat2,
  'vegetarian-mains-2': vegetarianMains2,
  'snacks-desserts-2': snacksDesserts2,
  'chicken-persian-1': chickenPersian1,
  'chicken-south-asian-2': chickenSouthAsian2,
  'chicken-southeast-asian-1': chickenSoutheastAsian1,
  'chicken-bites-bowls-3': chickenBitesBowls3,
  'breakfast-world-3': breakfastWorld3,
  'fish-meat-3': fishMeat3,
  'vegetarian-mains-3': vegetarianMains3,
  'snacks-desserts-3': snacksDesserts3,
  'chicken-gulf-egyptian-1': chickenGulfEgyptian1,
  'chicken-southeast-asian-2': chickenSoutheastAsian2,
  'chicken-western-mediterranean-1': chickenWesternMediterranean1,
  'chicken-bites-bowls-4': chickenBitesBowls4,
  'breakfast-world-4': breakfastWorld4,
  'fish-meat-4': fishMeat4,
  'vegetarian-mains-4': vegetarianMains4,
  'snacks-desserts-4': snacksDesserts4,
  'chicken-levantine-1': chickenLevantine1,
  'chicken-south-asian-3': chickenSouthAsian3,
  'chicken-world-1': chickenWorld1,
  'chicken-bites-bowls-5': chickenBitesBowls5,
  'breakfast-world-5': breakfastWorld5,
  'fish-meat-5': fishMeat5,
  'vegetarian-mains-5': vegetarianMains5,
  'snacks-desserts-5': snacksDesserts5,
};

export const RECIPES: readonly Recipe[] = Object.values(RECIPE_SOURCES).flat();
