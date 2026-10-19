import { describe, expect, it } from 'vitest';
import type { CatalogRecipe } from '../types.ts';
import { firstOpenStep, recipeHighlight, stepTimerSeconds, timerClock } from './cooking.ts';

describe('stepTimerSeconds', () => {
  it('reads a single duration', () => {
    expect(stepTimerSeconds('Rest the skewers for 3 minutes, then serve.')).toBe(180);
    expect(stepTimerSeconds('Chill for at least 1 hour.')).toBe(3600);
    expect(stepTimerSeconds('Toast for 30 seconds until fragrant.')).toBe(30);
    expect(stepTimerSeconds('Simmer 1 minute.')).toBe(60);
    expect(stepTimerSeconds('Bake 45 min.')).toBe(2700);
  });

  it('takes the longer end of a range', () => {
    expect(stepTimerSeconds('Grill over high heat for 10–12 minutes, turning.')).toBe(720);
    expect(stepTimerSeconds('Grill for 10-12 minutes.')).toBe(720);
    expect(stepTimerSeconds('Cook for 2 to 3 hours.')).toBe(10800);
    expect(stepTimerSeconds('Simmer gently for 1 1/2-2 hours.')).toBe(7200);
    expect(stepTimerSeconds('Cook for 1½-2 minutes.')).toBe(120);
    expect(stepTimerSeconds('Simmer for 1-1½ hours.')).toBe(5400);
  });

  it('reads fractions and compound durations', () => {
    expect(stepTimerSeconds('Boil the eggs for 6½ minutes.')).toBe(390);
    expect(stepTimerSeconds('Roast for 1 hour 15 minutes.')).toBe(4500);
    expect(stepTimerSeconds('Roast for 1 hour and 15 minutes.')).toBe(4500);
    expect(stepTimerSeconds('Give it a 10-minute rest.')).toBe(600);
  });

  it('uses the first duration in the step', () => {
    expect(stepTimerSeconds('Marinate for 10 minutes (or up to 8 hours in the fridge).')).toBe(600);
    expect(stepTimerSeconds('Stir for a minute, then simmer 20 minutes.')).toBe(60);
    expect(stepTimerSeconds('Leave for half an hour.')).toBe(1800);
    expect(stepTimerSeconds('Rest an hour.')).toBe(3600);
  });

  it('returns null when no time is named', () => {
    expect(stepTimerSeconds('Season to taste and serve.')).toBeNull();
    expect(stepTimerSeconds('Cut into 2 cm pieces.')).toBeNull();
    expect(stepTimerSeconds('Heat the oven to 200 °C.')).toBeNull();
    expect(stepTimerSeconds('Cook a few minutes until soft.')).toBeNull();
  });
});

describe('timerClock', () => {
  it('formats minutes and hours', () => {
    expect(timerClock(720)).toBe('12:00');
    expect(timerClock(45)).toBe('0:45');
    expect(timerClock(59.2)).toBe('1:00');
    expect(timerClock(5400)).toBe('1:30:00');
    expect(timerClock(-3)).toBe('0:00');
  });
});

describe('recipeHighlight', () => {
  const base: Pick<CatalogRecipe, 'flags' | 'tags' | 'perServing' | 'totalMinutes'> = {
    flags: { vegetarian: false, vegan: false, pescatarian: false, glutenFree: false, dairyFree: false, nutFree: false, eggFree: false },
    tags: [],
    perServing: { kcal: 500, protein: 20, carbs: 60, fiber: 5, sugars: 5, fat: 15, satFat: 3, sodium: 400 },
    totalMinutes: 60,
  };

  it('prefers diet, then protein, then speed', () => {
    expect(recipeHighlight({ ...base, flags: { ...base.flags, vegan: true, vegetarian: true } })).toBe('vegan');
    expect(recipeHighlight({ ...base, flags: { ...base.flags, vegetarian: true } })).toBe('vegetarian');
    expect(recipeHighlight({ ...base, perServing: { ...base.perServing, protein: 42, kcal: 509 } })).toBe('highProtein');
    expect(recipeHighlight({ ...base, tags: ['high-protein'] })).toBe('highProtein');
    expect(recipeHighlight({ ...base, totalMinutes: 25 })).toBe('quick');
    expect(recipeHighlight(base)).toBeNull();
  });
});

describe('firstOpenStep', () => {
  it('finds the first unticked step', () => {
    expect(firstOpenStep(4, [])).toBe(0);
    expect(firstOpenStep(4, [0, 1])).toBe(2);
    expect(firstOpenStep(4, [0, 2])).toBe(1);
    expect(firstOpenStep(3, [0, 1, 2])).toBe(0);
  });
});
