import { describe, expect, it } from 'vitest';
import {
  COUNT_UNITS,
  displayQty,
  formatAmount,
  formatGrams,
  formatMinutes,
  formatNumber,
  formatNutrient,
  formatPercent,
  formatQty,
  normalizeAmount,
  scaleAmount,
} from './format.ts';
import type { Amount } from './format.ts';

const show = (a: Amount) => formatAmount(a.qty, a.unit);

describe('formatQty', () => {
  it('uses nice fractions for spoons and cups', () => {
    expect(formatQty(1.5, 'tbsp')).toBe('1½');
    expect(formatQty(0.5, 'cup')).toBe('½');
    expect(formatQty(0.333, 'cup')).toBe('⅓');
    expect(formatQty(0.66, 'cup')).toBe('⅔');
    expect(formatQty(0.25, 'tsp')).toBe('¼');
    expect(formatQty(0.125, 'tsp')).toBe('⅛');
    expect(formatQty(2.75, 'cup')).toBe('2¾');
    expect(formatQty(0.95, 'cup')).toBe('1');
    expect(formatQty(2, 'tbsp')).toBe('2');
    expect(formatQty(12.4, 'cup')).toBe('12');
  });

  it('never shows a positive amount as 0', () => {
    expect(formatQty(0.01, 'tsp')).toBe('⅛');
    expect(formatQty(0.05, 'piece')).toBe('¼');
    expect(formatQty(0.004, 'g')).toBe('0.1');
    expect(formatQty(0.001, 'kg')).toBe('0.05');
    expect(formatQty(0, 'g')).toBe('0');
    expect(formatQty(Number.NaN, 'cup')).toBe('0');
    expect(formatQty(-2, 'cup')).toBe('0');
  });

  it('keeps counted things to quarters and halves', () => {
    expect(formatQty(0.4, 'medium')).toBe('½');
    expect(formatQty(0.3, 'piece')).toBe('¼');
    expect(formatQty(1.3, 'piece')).toBe('1¼');
    expect(formatQty(3.3, 'clove')).toBe('3½');
    expect(formatQty(3.1, 'clove')).toBe('3');
    expect(COUNT_UNITS.has('can')).toBe(true);
    expect(COUNT_UNITS.has('g')).toBe(false);
  });

  it('rounds metric amounts sensibly', () => {
    expect(formatQty(2.46, 'g')).toBe('2.5');
    expect(formatQty(47.6, 'g')).toBe('48');
    expect(formatQty(152, 'g')).toBe('150');
    expect(formatQty(153, 'ml')).toBe('155');
    expect(formatQty(1234, 'g')).toBe('1,230');
    expect(formatQty(1.234, 'kg')).toBe('1.25');
    expect(formatQty(12.34, 'kg')).toBe('12.3');
    expect(formatQty(1234, 'g', 'de')).toBe('1.230');
    expect(displayQty(152, 'g')).toBe(150);
    expect(displayQty(0.4, 'medium')).toBe(0.5);
    expect(displayQty(0.01, 'cup')).toBe(0.125);
  });
});

describe('formatAmount', () => {
  it('writes amounts the way a cook reads them', () => {
    expect(formatAmount(1.5, 'tbsp')).toBe('1½ tbsp');
    expect(formatAmount(2, 'medium')).toBe('2 medium');
    expect(formatAmount(150, 'g')).toBe('150 g');
    expect(formatAmount(3, 'piece')).toBe('3');
    expect(formatAmount(0.5, 'piece')).toBe('½');
    expect(formatAmount(0, 'to-taste')).toBe('to taste');
    expect(formatAmount(250, 'ml')).toBe('250 ml');
  });

  it('pluralizes by the displayed quantity', () => {
    expect(formatAmount(1, 'cup')).toBe('1 cup');
    expect(formatAmount(0.5, 'cup')).toBe('½ cup');
    expect(formatAmount(1.5, 'cup')).toBe('1½ cups');
    expect(formatAmount(2, 'cup')).toBe('2 cups');
    expect(formatAmount(1, 'clove')).toBe('1 clove');
    expect(formatAmount(2, 'clove')).toBe('2 cloves');
    expect(formatAmount(1.04, 'clove')).toBe('1 clove');
    expect(formatAmount(3, 'leaf')).toBe('3 leaves');
    expect(formatAmount(1, 'pinch')).toBe('1 pinch');
    expect(formatAmount(2, 'bunch')).toBe('2 bunches');
    expect(formatAmount(2, 'tbsp')).toBe('2 tbsp');
  });

  it('switches between g and kg (ml and l) at 1000', () => {
    expect(formatAmount(1500, 'g')).toBe('1.5 kg');
    expect(formatAmount(999.8, 'g')).toBe('1 kg');
    expect(formatAmount(0.8, 'kg')).toBe('800 g');
    expect(formatAmount(1250, 'ml')).toBe('1.25 l');
    expect(formatGrams(2500)).toBe('2.5 kg');
    expect(formatGrams(12.34)).toBe('12 g');
  });

  it('lets the UI translate unit words', () => {
    expect(formatAmount(2, 'clove', { unitLabel: (u, q) => `${u}:${q}` })).toBe('2 clove:2');
    expect(formatAmount(0, 'to-taste', { unitLabel: () => 'حسب الرغبة' })).toBe('حسب الرغبة');
    expect(formatAmount(3, 'piece', { unitLabel: () => '' })).toBe('3');
  });
});

describe('scaleAmount and normalizeAmount', () => {
  it('scales and picks a friendlier spoon or cup', () => {
    expect(show(scaleAmount({ qty: 1, unit: 'tbsp' }, 0.5))).toBe('1½ tsp');
    expect(show(scaleAmount({ qty: 1, unit: 'tbsp' }, 0.25))).toBe('¾ tsp');
    expect(show(scaleAmount({ qty: 2, unit: 'tsp' }, 2))).toBe('4 tsp');
    expect(show(scaleAmount({ qty: 1.5, unit: 'tsp' }, 2))).toBe('1 tbsp');
    expect(show(scaleAmount({ qty: 1.5, unit: 'tsp' }, 3))).toBe('1½ tbsp');
    expect(show(scaleAmount({ qty: 3, unit: 'tsp' }, 3))).toBe('3 tbsp');
    expect(show(scaleAmount({ qty: 2, unit: 'tbsp' }, 4))).toBe('½ cup');
    expect(show(scaleAmount({ qty: 2, unit: 'tbsp' }, 2))).toBe('¼ cup');
    expect(show(scaleAmount({ qty: 3, unit: 'tbsp' }, 2))).toBe('6 tbsp');
    expect(show(scaleAmount({ qty: 1, unit: 'cup' }, 0.125))).toBe('2 tbsp');
    expect(show(scaleAmount({ qty: 0.5, unit: 'cup' }, 3))).toBe('1½ cups');
  });

  it('converts metric units both ways', () => {
    expect(scaleAmount({ qty: 600, unit: 'g' }, 2)).toEqual({ qty: 1.2, unit: 'kg' });
    expect(scaleAmount({ qty: 1, unit: 'kg' }, 0.5)).toEqual({ qty: 500, unit: 'g' });
    expect(scaleAmount({ qty: 400, unit: 'ml' }, 3)).toEqual({ qty: 1.2, unit: 'l' });
    expect(show(scaleAmount({ qty: 110, unit: 'g' }, 1.5))).toBe('165 g');
  });

  it('leaves counts and to-taste alone, and ignores a bad factor', () => {
    expect(scaleAmount({ qty: 1, unit: 'medium' }, 2.5)).toEqual({ qty: 2.5, unit: 'medium' });
    expect(show(scaleAmount({ qty: 1, unit: 'medium' }, 2.5))).toBe('2½ medium');
    expect(scaleAmount({ qty: 0, unit: 'to-taste' }, 3)).toEqual({ qty: 0, unit: 'to-taste' });
    expect(scaleAmount({ qty: 2, unit: 'clove' }, Number.NaN)).toEqual({ qty: 2, unit: 'clove' });
    expect(scaleAmount({ qty: 2, unit: 'clove' }, -1)).toEqual({ qty: 2, unit: 'clove' });
    expect(normalizeAmount({ qty: 0, unit: 'tbsp' })).toEqual({ qty: 0, unit: 'tbsp' });
  });

  it('turns pinches into spoons and back, and never shows thirds of a spoon (regression)', () => {
    // A pinch is 1/16 tsp: 12 pinches (a salt pinch in a 24-serving batch) is ¾ tsp; half a pinch is still a pinch.
    expect(show(scaleAmount({ qty: 1, unit: 'pinch' }, 12))).toBe('¾ tsp');
    expect(show(scaleAmount({ qty: 1, unit: 'pinch' }, 8))).toBe('½ tsp');
    expect(show(scaleAmount({ qty: 1, unit: 'pinch' }, 3))).toBe('3 pinches');
    expect(show(scaleAmount({ qty: 1, unit: 'pinch' }, 0.5))).toBe('1 pinch');
    expect(show(scaleAmount({ qty: 1, unit: 'tsp' }, 0.1))).toBe('2 pinches');
    // Measuring spoons have no thirds: ⅔ tsp shows as ¾ tsp, and 1⅓ tbsp as 4 tsp.
    expect(show(scaleAmount({ qty: 1, unit: 'tsp' }, 2 / 3))).toBe('¾ tsp');
    expect(show(scaleAmount({ qty: 1, unit: 'tsp' }, 1 / 3))).toBe('¼ tsp');
    expect(show(scaleAmount({ qty: 1, unit: 'tbsp' }, 4 / 3))).toBe('4 tsp');
    expect(show(scaleAmount({ qty: 2, unit: 'tbsp' }, 4 / 3))).toBe('8 tsp');
    expect(show(scaleAmount({ qty: 1, unit: 'tbsp' }, 1.25))).toBe('1¼ tbsp');
    expect(show(scaleAmount({ qty: 3, unit: 'tsp' }, 4))).toBe('¼ cup');
    expect(formatQty(2 / 3, 'tsp')).toBe('¾');
    expect(formatQty(2 / 3, 'cup')).toBe('⅔'); // cups keep thirds
  });

  it('floors things too small to split: a handful at ½, a leaf at 1 whole leaf (regression)', () => {
    expect(show(scaleAmount({ qty: 1, unit: 'handful' }, 0.25))).toBe('½ handful');
    expect(show(scaleAmount({ qty: 1, unit: 'handful' }, 0.8))).toBe('1 handful');
    expect(show(scaleAmount({ qty: 1, unit: 'handful' }, 1.5))).toBe('1½ handfuls');
    expect(show(scaleAmount({ qty: 1, unit: 'leaf' }, 0.5))).toBe('1 leaf');
    expect(show(scaleAmount({ qty: 2, unit: 'leaf' }, 0.75))).toBe('2 leaves');
    expect(show(scaleAmount({ qty: 30, unit: 'leaf' }, 1.5))).toBe('45 leaves');
  });
});

describe('times and numbers', () => {
  it('formats minutes as hours and minutes', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(75)).toBe('1 h 15 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(59.6)).toBe('1 h');
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(-5)).toBe('0 min');
    expect(formatMinutes(Number.NaN)).toBe('0 min');
    expect(formatMinutes(90, { hours: 'ساعة', minutes: 'دقيقة' })).toBe('1 ساعة 30 دقيقة');
  });

  it('formats numbers, nutrients and percentages with Intl', () => {
    expect(formatNumber(1234.567, 'en', 1)).toBe('1,234.6');
    expect(formatNumber(1234.5, 'de', 1)).toBe('1.234,5');
    expect(formatNumber(1234, 'ar-IQ')).toBe('١٬٢٣٤');
    expect(formatNumber(-0.0001)).toBe('0');
    expect(formatNumber(Number.NaN)).toBe('');
    expect(formatNumber(12, 'not a locale!')).toBe('12');
    expect(formatNutrient('kcal', 452.4)).toBe('452 kcal');
    expect(formatNutrient('protein', 32.46)).toBe('32 g');
    expect(formatNutrient('fiber', 4.46)).toBe('4.5 g');
    expect(formatNutrient('sodium', 620.2)).toBe('620 mg');
    expect(formatPercent(0.853)).toBe('85%');
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe('');
  });
});
