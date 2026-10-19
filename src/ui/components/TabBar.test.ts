import { describe, expect, it } from 'vitest';
import { lensLeft, nearestIndex } from './TabBar.tsx';

describe('tab bar sliding', () => {
  it('picks the tab whose centre is nearest the finger', () => {
    const centers = [30, 90, 150, 210, 270];
    expect(nearestIndex(centers, 0)).toBe(0);
    expect(nearestIndex(centers, 125)).toBe(2);
    expect(nearestIndex(centers, 999)).toBe(4);
  });

  it('centres the lens under the finger but keeps it inside the bar', () => {
    expect(lensLeft(150, 60, 300)).toBe(120);
    expect(lensLeft(10, 60, 300)).toBe(0);
    expect(lensLeft(295, 60, 300)).toBe(240);
  });
});
