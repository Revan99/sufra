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
};

export const INGREDIENTS: readonly Ingredient[] = Object.values(INGREDIENT_SOURCES).flat();
