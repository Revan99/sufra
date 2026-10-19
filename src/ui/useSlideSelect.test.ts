import { describe, expect, it } from 'vitest';
import { lensStart, nearestIndex } from './useSlideSelect.ts';

describe('press and slide', () => {
  it('picks the item whose centre is nearest the pointer', () => {
    const centers = [30, 90, 150, 210, 270];
    expect(nearestIndex(centers, 0)).toBe(0);
    expect(nearestIndex(centers, 125)).toBe(2);
    expect(nearestIndex(centers, 999)).toBe(4);
  });

  it('centres the lens under the pointer but keeps it inside the list', () => {
    expect(lensStart(150, 60, 300)).toBe(120);
    expect(lensStart(10, 60, 300)).toBe(0);
    expect(lensStart(295, 60, 300)).toBe(240);
  });
});
