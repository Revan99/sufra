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
};

export const RECIPES: readonly Recipe[] = Object.values(RECIPE_SOURCES).flat();
