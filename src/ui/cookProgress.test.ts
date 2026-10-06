import { describe, expect, it } from 'vitest';
import { parseProgress, progressKey, toggleStep } from './cookProgress.ts';

describe('cooking progress', () => {
  it('is kept per recipe and planned day (or the day it was opened)', () => {
    expect(progressKey('shakshuka', '2026-09-26', '2026-09-25')).toBe('shakshuka@2026-09-26');
    expect(progressKey('shakshuka', null, '2026-09-25')).toBe('shakshuka@2026-09-25');
  });

  it('ticks and unticks steps, stamping the day', () => {
    const p = toggleStep({ steps: [2], day: '2026-09-24' }, 0, '2026-09-25');
    expect(p).toEqual({ steps: [0, 2], day: '2026-09-25' });
    expect(toggleStep(p, 2, '2026-09-25').steps).toEqual([0]);
  });

  it('drops yesterday’s entries and anything malformed when read back', () => {
    const stored = {
      'a@2026-09-25': { steps: [1, 0, 1, -1, 2.5], servings: 3, day: '2026-09-25' },
      'b@2026-09-24': { steps: [0], day: '2026-09-24' },
      'c@2026-09-25': { steps: 'x', day: '2026-09-25' },
      'd@2026-09-25': { steps: [], servings: -2, day: '2026-09-25' },
    };
    expect(parseProgress(stored, '2026-09-25')).toEqual({ 'a@2026-09-25': { steps: [0, 1], servings: 3, day: '2026-09-25' } });
    expect(parseProgress(null, '2026-09-25')).toEqual({});
  });
});
