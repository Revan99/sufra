import { describe, expect, it } from 'vitest';
import { addMonths, chartBars, chartMax, historyDates, labelledInMonth, monthGrid, monthStart, rangeDates, recentWeights, weightLine, weightOn } from './progress.ts';
import { defaultTracker, logWeight, setMealStatus, setWater } from './tracker.ts';
import type { MealLog, Tracker } from './tracker.ts';
import { weekday } from './dates.ts';

const TODAY = '2026-10-18'; // a Sunday
const meal = (kcal: number): MealLog => ({ slot: 'lunch', index: 0, status: 'eaten', recipeId: 'r', kcal, protein: 30, fiber: 5, at: '12:00' });

function withDays(entries: Record<string, number>): Tracker {
  let t = defaultTracker();
  for (const [date, kcal] of Object.entries(entries)) t = setMealStatus(t, date, meal(kcal));
  return t;
}

describe('rangeDates', () => {
  it('covers the last 7 and 30 days, ending today', () => {
    const week = rangeDates('week', TODAY);
    expect(week).toHaveLength(7);
    expect(week[0]).toBe('2026-10-12');
    expect(week[6]).toBe(TODAY);
    const month = rangeDates('month', TODAY);
    expect(month).toHaveLength(30);
    expect(month[0]).toBe('2026-09-19');
    expect(month[29]).toBe(TODAY);
  });

  it('covers 12 calendar months up to today for the year', () => {
    const year = rangeDates('year', TODAY);
    expect(year[0]).toBe('2025-11-01');
    expect(year[year.length - 1]).toBe(TODAY);
  });
});

describe('month arithmetic', () => {
  it('finds month starts across year boundaries', () => {
    expect(monthStart('2026-10-18')).toBe('2026-10-01');
    expect(addMonths('2026-01-31', -1)).toBe('2025-12-01');
    expect(addMonths('2026-11-05', 2)).toBe('2027-01-01');
    expect(addMonths('2026-03-31', -11)).toBe('2025-04-01');
  });
});

describe('chartBars', () => {
  const planned = () => 2000;

  it('gives one bar per day with its tone, today in progress', () => {
    const t = withDays({ '2026-10-12': 2000, '2026-10-13': 1700, '2026-10-14': 1000, [TODAY]: 900 });
    const bars = chartBars('week', TODAY, t, 2000, planned);
    expect(bars).toHaveLength(7);
    expect(bars.map((b) => b.tone)).toEqual(['on', 'close', 'missed', 'empty', 'empty', 'empty', 'today']);
    expect(bars[3]!.eaten).toBeNull();
    expect(bars[3]!.planned).toBe(2000);
    expect(bars[6]!.current).toBe(true);
  });

  it('leaves today empty until something is logged', () => {
    const bars = chartBars('week', TODAY, defaultTracker(), 2000, planned);
    expect(bars[6]!.tone).toBe('empty');
    expect(bars[6]!.current).toBe(true);
  });

  it('carries water per day', () => {
    const t = setWater(defaultTracker(), TODAY, 5);
    const bars = chartBars('month', TODAY, t, 2000, planned);
    expect(bars).toHaveLength(30);
    expect(bars[29]!.water).toBe(5);
    expect(bars[29]!.eaten).toBeNull();
  });

  it('averages each month over its logged days for the year, planning only logged days', () => {
    let t = withDays({ '2026-10-01': 2000, '2026-10-02': 1800, '2026-09-10': 1000 });
    t = setWater(t, '2026-10-01', 8);
    t = setWater(t, '2026-10-03', 4);
    const asked: string[] = [];
    const bars = chartBars('year', TODAY, t, 2000, (d) => {
      asked.push(d);
      return 1900;
    });
    expect(bars).toHaveLength(12);
    expect(bars[0]!.date).toBe('2025-11-01');
    const oct = bars[11]!;
    expect(oct.date).toBe('2026-10-01');
    expect(oct.current).toBe(true);
    expect(oct.eaten).toBe(1900);
    expect(oct.planned).toBe(1900);
    expect(oct.water).toBe(6);
    expect(oct.tone).toBe('on');
    expect(bars[10]!.tone).toBe('missed');
    expect(bars[9]!.eaten).toBeNull();
    expect(bars[9]!.tone).toBe('empty');
    expect(asked.sort()).toEqual(['2026-09-10', '2026-10-01', '2026-10-02']);
  });

  it('scales to the tallest bar, or a little above the target', () => {
    const bars = chartBars('week', TODAY, withDays({ [TODAY]: 3000 }), 2000, planned);
    expect(chartMax(bars, 2000)).toBe(3000);
    expect(chartMax(chartBars('week', TODAY, defaultTracker(), 2000, planned), 2000)).toBeCloseTo(2300);
  });
});

describe('labelledInMonth', () => {
  it('labels today and every 7th day before it', () => {
    const labelled = Array.from({ length: 30 }, (_, i) => i).filter((i) => labelledInMonth(i, 30));
    expect(labelled).toEqual([1, 8, 15, 22, 29]);
  });
});

describe('monthGrid', () => {
  it('lays out October 2026 in weeks starting Saturday', () => {
    const g = monthGrid(TODAY, 'saturday');
    expect(g.month).toBe('2026-10-01');
    expect(weekday(g.weekdays[0]!)).toBe(6);
    // 1 October 2026 is a Thursday: Sat, Sun, Mon, Tue, Wed are blank.
    expect(g.weeks[0]).toEqual([null, null, null, null, null, '2026-10-01', '2026-10-02']);
    expect(g.weeks.every((w) => w.length === 7)).toBe(true);
    expect(g.weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(g.weeks[g.weeks.length - 1]).toContain('2026-10-31');
  });

  it('starts weeks on Monday or Sunday', () => {
    const mon = monthGrid(TODAY, 'monday');
    expect(weekday(mon.weekdays[0]!)).toBe(1);
    expect(mon.weeks[0]!.indexOf('2026-10-01')).toBe(3);
    const sun = monthGrid('2026-02-10', 'sunday');
    // February 2026 starts on a Sunday and has 28 days: exactly 4 weeks.
    expect(sun.weeks).toHaveLength(4);
    expect(sun.weeks[0]![0]).toBe('2026-02-01');
  });
});

describe('weightLine', () => {
  it('places weights by date and ends at the last one', () => {
    let t = defaultTracker();
    t = logWeight(t, { date: '2026-10-08', at: '08:00', kg: 74 });
    t = logWeight(t, { date: '2026-10-18', at: '08:00', kg: 72 });
    const l = weightLine(t.weights, '2026-09-18', TODAY, 300, 100, 10)!;
    expect(l.end).toEqual({ x: 300, y: 90 });
    expect(l.line).toBe('M200 10 L300 90');
    expect(l.area).toBe('M200 10 L300 90 L300 100 L200 100 Z');
  });

  it('keeps at least a 1 kg spread and draws a single weight flat', () => {
    let t = defaultTracker();
    t = logWeight(t, { date: '2026-10-18', at: '08:00', kg: 70 });
    const l = weightLine(t.weights, '2026-09-18', TODAY, 300, 100, 10)!;
    expect(l.min).toBe(69.5);
    expect(l.max).toBe(70.5);
    expect(l.line).toBe('M0 50 L300 50');
    expect(weightLine([], '2026-09-18', TODAY, 300, 100)).toBeNull();
  });
});

describe('history', () => {
  it('lists today and every earlier day with a log or a weight, newest first', () => {
    let t = withDays({ '2026-10-10': 2000, '2026-10-19': 1500 });
    t = logWeight(t, { date: '2026-10-12', at: '08:00', kg: 72 });
    expect(historyDates(t, TODAY)).toEqual([TODAY, '2026-10-12', '2026-10-10']);
    expect(weightOn(t, '2026-10-12')?.kg).toBe(72);
    expect(weightOn(t, TODAY)).toBeUndefined();
  });

  it('gives recent weights with the change from the one before', () => {
    let t = defaultTracker();
    for (const [date, kg] of [['2026-10-01', 73.4], ['2026-10-05', 73], ['2026-10-10', 72.8], ['2026-10-16', 72.5]] as const) {
      t = logWeight(t, { date, at: '08:00', kg });
    }
    const r = recentWeights(t);
    expect(r.map((x) => x.entry.date)).toEqual(['2026-10-16', '2026-10-10', '2026-10-05']);
    expect(r[0]!.change).toBeCloseTo(-0.3);
    expect(r[2]!.change).toBeCloseTo(-0.4);
    expect(recentWeights(logWeight(defaultTracker(), { date: TODAY, at: '08:00', kg: 70 }))[0]!.change).toBeNull();
  });
});
