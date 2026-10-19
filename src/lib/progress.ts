// Pure helpers for the Progress screen: the date range of each view, the bars of the calories and water charts,
// the month calendar grid, the weight line and the days listed in the history table. Built on lib/tracker.ts.
import type { WeekStart } from '../types.ts';
import { addDays, dateRange, diffDays, parseISODate, startOfWeek, toISODate } from './dates.ts';
import type { ISODate } from './dates.ts';
import { dayStatus, dayTotals } from './tracker.ts';
import type { DayStatus, Tracker, WeightLog } from './tracker.ts';

export type ProgressRange = 'week' | 'month' | 'year';
export const PROGRESS_RANGES: readonly ProgressRange[] = ['week', 'month', 'year'];

/** Days in the Week and Month views (each ends today). */
export const RANGE_DAYS = { week: 7, month: 30 } as const;

/** The days a view covers, oldest first: the last 7 or 30 days, or the 12 calendar months up to today. */
export function rangeDates(range: ProgressRange, today: ISODate): ISODate[] {
  if (range === 'year') {
    const start = monthStart(addMonths(today, -11));
    return dateRange(start, diffDays(start, today) + 1);
  }
  const days = RANGE_DAYS[range];
  return dateRange(addDays(today, -(days - 1)), days);
}

/** Days of weights the weight card draws for a view: a 7-day line has too few points to show a trend. */
export const WEIGHT_WINDOW_DAYS: Readonly<Record<ProgressRange, number>> = { week: 30, month: 90, year: 365 };

/** The first day of the month containing `date`. */
export function monthStart(date: ISODate): ISODate {
  const p = parseISODate(date);
  if (!p) throw new RangeError(`Invalid date "${String(date)}"`);
  return toISODate({ ...p, day: 1 });
}

/** The first day of the month `n` months after the one containing `date` (n may be negative). */
export function addMonths(date: ISODate, n: number): ISODate {
  const p = parseISODate(date);
  if (!p) throw new RangeError(`Invalid date "${String(date)}"`);
  const index = p.year * 12 + (p.month - 1) + n;
  return toISODate({ year: Math.floor(index / 12), month: (index % 12) + 1, day: 1 });
}

// ---------------------------------------------------------------------------------------------------------------
// Chart bars

/** How a bar is drawn: by its day's status, 'today' for today with something logged (still in progress). */
export type BarTone = DayStatus | 'today';

export interface ChartBar {
  /** The day, or the first day of the month in the Year view. */
  date: ISODate;
  /** The bar stands for a whole month (Year view). */
  month: boolean;
  /** kcal eaten (a month's average over its logged days), or null when nothing was logged. */
  eaten: number | null;
  /** kcal planned (a month's average over the same logged days; every day in the day views). */
  planned: number | null;
  /** Glasses of water (a month's average over days with water), 0 when none. */
  water: number;
  tone: BarTone;
  /** Today, or this month. */
  current: boolean;
}

/**
 * The bars of the calories and water charts: one per day for Week and Month, one per month for Year.
 * `plannedFor` gives the planned kcal of a day (the meal plan's total); in the Year view it is asked only for logged
 * days, so a year costs as many plans as days were logged.
 */
export function chartBars(range: ProgressRange, today: ISODate, tracker: Tracker, kcalTarget: number, plannedFor: (date: ISODate) => number): ChartBar[] {
  if (range !== 'year') {
    return rangeDates(range, today).map((date) => {
      const t = dayTotals(tracker.days[date]);
      const status = dayStatus(t, kcalTarget);
      const current = date === today;
      return {
        date,
        month: false,
        eaten: t.logged ? t.kcal : null,
        planned: plannedFor(date),
        water: t.water,
        tone: current && status !== 'empty' ? 'today' : status,
        current,
      };
    });
  }
  const bars: ChartBar[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = addMonths(today, -i);
    const next = addMonths(start, 1);
    const end = next > today ? today : addDays(next, -1);
    let logged = 0;
    let kcal = 0;
    let planned = 0;
    let waterDays = 0;
    let water = 0;
    for (const date of dateRange(start, diffDays(start, end) + 1)) {
      const t = dayTotals(tracker.days[date]);
      if (t.water > 0) {
        waterDays += 1;
        water += t.water;
      }
      if (!t.logged) continue;
      logged += 1;
      kcal += t.kcal;
      planned += plannedFor(date);
    }
    const eaten = logged ? Math.round(kcal / logged) : null;
    bars.push({
      date: start,
      month: true,
      eaten,
      planned: logged ? Math.round(planned / logged) : null,
      water: waterDays ? Math.round((water / waterDays) * 10) / 10 : 0,
      tone: eaten === null ? 'empty' : dayStatus({ kcal: eaten, protein: 0, fiber: 0, water: 0, logged: true }, kcalTarget),
      current: i === 0,
    });
  }
  return bars;
}

/** The kcal the top of the calories chart stands for: a little above the target, or the tallest bar. */
export function chartMax(bars: readonly ChartBar[], kcalTarget: number): number {
  let max = kcalTarget * 1.15;
  for (const b of bars) max = Math.max(max, b.eaten ?? 0, b.planned ?? 0);
  return max;
}

/** Which day bars get a label in the Month view: every 7th counting back from today (today always). */
export function labelledInMonth(index: number, count: number): boolean {
  return (count - 1 - index) % 7 === 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Month calendar

export interface MonthGrid {
  /** The first day of the month. */
  month: ISODate;
  /** One date per weekday column, in order, for the header (from the first week, which may be in the past month). */
  weekdays: ISODate[];
  /** Weeks of 7 cells; null for days outside the month. */
  weeks: (ISODate | null)[][];
}

/** The calendar of the month containing `date`, with weeks starting on `weekStart`. */
export function monthGrid(date: ISODate, weekStart: WeekStart): MonthGrid {
  const month = monthStart(date);
  const next = addMonths(month, 1);
  const first = startOfWeek(month, weekStart);
  const weeks: (ISODate | null)[][] = [];
  for (let start = first; start < next; start = addDays(start, 7)) {
    weeks.push(dateRange(start, 7).map((d) => (d >= month && d < next ? d : null)));
  }
  return { month, weekdays: dateRange(first, 7), weeks };
}

// ---------------------------------------------------------------------------------------------------------------
// Weight line

export interface WeightLine {
  /** SVG path of the line, in a `width` x `height` box. */
  line: string;
  /** The line closed down to the bottom edge, for the gradient fill. */
  area: string;
  /** The last point, in the same box. */
  end: { x: number; y: number };
  min: number;
  max: number;
}

/**
 * The weight line over `from`..`to`: x by date, y scaled to the weights' spread (at least 1 kg, so small wobbles
 * stay small), with `pad` kept clear above and below. Null without weights.
 */
export function weightLine(weights: readonly WeightLog[], from: ISODate, to: ISODate, width: number, height: number, pad = 8): WeightLine | null {
  if (!weights.length) return null;
  const span = Math.max(1, diffDays(from, to));
  const kgs = weights.map((w) => w.kg);
  let min = Math.min(...kgs);
  let max = Math.max(...kgs);
  if (max - min < 1) {
    const mid = (max + min) / 2;
    min = mid - 0.5;
    max = mid + 0.5;
  }
  const round = (n: number) => Math.round(n * 10) / 10;
  const pts = weights.map((w) => ({
    x: round(weights.length === 1 ? width : (Math.min(span, Math.max(0, diffDays(from, w.date))) / span) * width),
    y: round(pad + ((max - w.kg) / (max - min)) * (height - 2 * pad)),
  }));
  // A single weight draws a flat line across, ending at its point.
  if (pts.length === 1) pts.unshift({ x: 0, y: pts[0]!.y });
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  return { line, area: `${line} L${last.x} ${height} L${first.x} ${height} Z`, end: last, min, max };
}

// ---------------------------------------------------------------------------------------------------------------
// History

/** Days for the history table, newest first: today, then every earlier day with a log or a weight. */
export function historyDates(tracker: Tracker, today: ISODate): ISODate[] {
  const dates = new Set<ISODate>([today]);
  for (const d of Object.keys(tracker.days)) if (d <= today) dates.add(d);
  for (const w of tracker.weights) if (w.date <= today) dates.add(w.date);
  return [...dates].sort().reverse();
}

/** The weight logged on a date, if any. */
export function weightOn(tracker: Tracker, date: ISODate): WeightLog | undefined {
  return tracker.weights.find((w) => w.date === date);
}

/** The last `n` weights, newest first, each with its change in kg from the one before it (null for the first ever). */
export function recentWeights(tracker: Tracker, n = 3): { entry: WeightLog; change: number | null }[] {
  const ws = tracker.weights;
  const out: { entry: WeightLog; change: number | null }[] = [];
  for (let i = ws.length - 1; i >= 0 && out.length < n; i--) {
    const prev = ws[i - 1];
    out.push({ entry: ws[i]!, change: prev ? ws[i]!.kg - prev.kg : null });
  }
  return out;
}
