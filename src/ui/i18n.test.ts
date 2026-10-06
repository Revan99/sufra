import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en.ts';
import { EN_LOCALE, interpolate, messageKeys, setLocale, t, tp, tq } from '../i18n/index.ts';
import type { Messages } from '../i18n/index.ts';
import { splitTemplate } from '../i18n/nodes.tsx';
import { amountLabel, dateSpan, listJoin, mealName, minutes, portionLabel, unitWord } from '../i18n/labels.ts';
import { UNIT_LABELS } from '../lib/format.ts';
import type { Unit } from '../types.ts';

describe('t', () => {
  it('fills parameters and formats numbers for the locale', () => {
    expect(t('today.kcalOf', { n: 1850, target: 2000 })).toBe('1,850 of 2,000 kcal');
    expect(t('swap.done', { slot: 'Lunch', name: 'Quzi' })).toBe('Lunch is now Quzi');
  });

  it('leaves unknown placeholders visible and ignores inherited keys', () => {
    expect(interpolate('Hi {name} {missing}', { name: 'Revan' })).toBe('Hi Revan {missing}');
    expect(interpolate('{toString}', {})).toBe('{toString}');
  });

  it('picks plural forms', () => {
    expect(tp('recipes.count', 1)).toBe('1 recipe');
    expect(tp('recipes.count', 12)).toBe('12 recipes');
    expect(tp('shop.household', 3)).toBe('For 3 people');
  });

  it('has a non-empty message for every key, except bare-count unit words', () => {
    for (const key of messageKeys()) {
      if (key.startsWith('unit.piece.')) continue;
      expect(en[key].trim(), key).not.toBe('');
    }
  });

  it('has both plural forms wherever one exists', () => {
    const keys = new Set<string>(messageKeys());
    for (const key of keys) {
      if (key.endsWith('.one')) expect(keys.has(key.replace(/\.one$/, '.other')), key).toBe(true);
    }
  });

  it('translates every unit the data can use, matching the English defaults', () => {
    for (const unit of Object.keys(UNIT_LABELS) as Unit[]) {
      const [one, many] = UNIT_LABELS[unit];
      expect(unitWord(unit, 1)).toBe(one);
      expect(unitWord(unit, 3)).toBe(many);
    }
  });
});

describe('quantity plurals', () => {
  it('keep English fractions singular ("½ cup", "½ serving") and larger amounts plural', () => {
    expect(unitWord('cup', 0.5)).toBe('cup');
    expect(unitWord('cup', 1)).toBe('cup');
    expect(unitWord('cup', 1.5)).toBe('cups');
    expect(tq('portion', 0.75, { portion: '¾' })).toBe('¾ serving');
    expect(tq('portion', 2, { portion: '2' })).toBe('2 servings');
  });

  it('pass the real number to a locale without a quantity rule, so Arabic gets its dual only for 2', () => {
    const forms = { 'portion.one': 'one', 'portion.two': 'two', 'portion.few': 'few', 'portion.many': 'many', 'portion.other': 'other' };
    setLocale({ lang: 'ar', intl: 'ar', dir: 'rtl' }, { ...en, ...forms } as unknown as Messages);
    try {
      expect([1, 2, 3, 11, 1.5].map((n) => tq('portion', n))).toEqual(['one', 'two', 'few', 'many', 'other']);
    } finally {
      setLocale(EN_LOCALE, en);
    }
  });
});

describe('element messages', () => {
  it('split a template around its placeholders, keeping the translation’s word order', () => {
    expect(splitTemplate('{n} of {target} kcal')).toEqual([{ name: 'n' }, ' of ', { name: 'target' }, ' kcal']);
    expect(splitTemplate('plain')).toEqual(['plain']);
  });
});

describe('labels', () => {
  it('names meals, numbering snacks only when there are several', () => {
    expect(mealName('lunch', 0)).toBe('Lunch');
    expect(mealName('snack', 0, 1)).toBe('Snack');
    expect(mealName('snack', 1, 2)).toBe('Snack 2');
  });

  it('formats portions, amounts and times', () => {
    expect(portionLabel(1)).toBe('1 serving');
    expect(portionLabel(0.5)).toBe('½ serving');
    expect(portionLabel(1.25)).toBe('1¼ servings');
    expect(amountLabel(1, 'medium', 2)).toBe('2 medium');
    expect(amountLabel(2, 'piece', 1.5)).toBe('3');
    expect(amountLabel(1, 'cup', 2)).toBe('2 cups');
    expect(amountLabel(0, 'to-taste')).toBe('to taste');
    expect(minutes(75)).toBe('1 h 15 min');
  });

  it('writes date spans and lists', () => {
    expect(dateSpan('2026-09-24', '2026-09-24')).toMatch(/^24 Sep/);
    expect(dateSpan('2026-09-24', '2026-09-30')).toMatch(/^24\s?[–-]\s?30 Sep/);
    expect(dateSpan('2026-09-28', '2026-10-04')).toMatch(/^28 Sep.*4 Oct/);
    expect(dateSpan('bad', '2026-10-04')).toContain('4 Oct');
    expect(listJoin(['Quzi', 'Dolma', 'Kubba'])).toBe('Quzi, Dolma and Kubba');
  });
});
