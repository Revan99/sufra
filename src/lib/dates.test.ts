import { afterAll, describe, expect, it } from 'vitest';
import {
  addDays,
  compareDates,
  dateRange,
  dayNumber,
  diffDays,
  formatDate,
  formatDayMonth,
  formatLongDate,
  formatShortDate,
  formatWeekday,
  fromDayNumber,
  isISODate,
  isToday,
  parseISODate,
  relativeDay,
  safeDate,
  startOfWeek,
  todayLocal,
  weekDates,
  weekday,
} from './dates.ts';

// Node's process.env, typed locally (the project has no @types/node). Node applies a TZ change immediately.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
const ORIGINAL_TZ = env.TZ;
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete env.TZ;
  else env.TZ = ORIGINAL_TZ;
});

/** Time zones with DST in both hemispheres, a half-hour offset, Baghdad and the date line. */
const ZONES = ['UTC', 'Asia/Baghdad', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Australia/Adelaide', 'Asia/Kolkata', 'Pacific/Kiritimati', 'Pacific/Pago_Pago'];

function inEachZone(fn: (zone: string) => void): void {
  for (const zone of ZONES) {
    env.TZ = zone;
    fn(zone);
  }
  if (ORIGINAL_TZ === undefined) delete env.TZ;
  else env.TZ = ORIGINAL_TZ;
}

describe('parsing and validation', () => {
  it('accepts real calendar dates only', () => {
    expect(isISODate('2026-09-24')).toBe(true);
    expect(isISODate('2024-02-29')).toBe(true);
    expect(isISODate('2000-02-29')).toBe(true);
    expect(isISODate('1900-02-29')).toBe(false);
    expect(isISODate('2026-02-29')).toBe(false);
    expect(isISODate('2026-04-31')).toBe(false);
    expect(isISODate('2026-13-01')).toBe(false);
    expect(isISODate('2026-00-10')).toBe(false);
    expect(isISODate('2026-9-24')).toBe(false);
    expect(isISODate('2026-09-24T00:00')).toBe(false);
    expect(isISODate('')).toBe(false);
    expect(isISODate(20260924)).toBe(false);
    expect(isISODate(null)).toBe(false);
    expect(parseISODate('2026-09-24')).toEqual({ year: 2026, month: 9, day: 24 });
  });

  it('throws a RangeError for arithmetic on an invalid date', () => {
    expect(() => dayNumber('2026-02-30')).toThrow(RangeError);
    expect(() => addDays('nope', 1)).toThrow(RangeError);
  });

  it('throws a RangeError for a non-finite day count instead of returning garbage (regression)', () => {
    expect(() => addDays('2026-01-01', Number.NaN)).toThrow(RangeError);
    expect(() => addDays('2026-01-01', Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => fromDayNumber(Number.NaN)).toThrow(RangeError);
    expect(() => dateRange('2026-01-01', Number.NaN)).toThrow(RangeError);
    expect(() => dateRange('2026-01-01', Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(dateRange('2026-01-01', -2)).toEqual([]);
  });

  it('never throws while rendering: invalid dates format as empty and are not relative days (regression)', () => {
    // A bad hash route such as #/day/2026-02-30 must not crash the screen header.
    expect(formatLongDate('2026-02-30', 'en')).toBe('');
    expect(formatShortDate('x', 'en')).toBe('');
    expect(formatWeekday('', 'en', 'long')).toBe('');
    expect(formatDayMonth('2026-13-01', 'en')).toBe('');
    expect(formatDate('2026-02-30', 'en', { year: 'numeric' })).toBe('');
    expect(relativeDay('x', '2026-01-01')).toBeNull();
    expect(relativeDay('2026-01-01', 'x')).toBeNull();
    expect(isToday('2026-02-30', new Date(2026, 1, 28))).toBe(false);
  });

  it('safeDate keeps a valid date and falls back otherwise', () => {
    expect(safeDate('2026-09-24', '2026-01-01')).toBe('2026-09-24');
    expect(safeDate('2026-02-30', '2026-01-01')).toBe('2026-01-01');
    expect(safeDate(undefined, '2026-01-01')).toBe('2026-01-01');
    expect(safeDate(20260924, '2026-01-01')).toBe('2026-01-01');
  });
});

describe('day numbers', () => {
  it('counts days from 1970-01-01', () => {
    expect(dayNumber('1970-01-01')).toBe(0);
    expect(dayNumber('1970-01-02')).toBe(1);
    expect(dayNumber('1969-12-31')).toBe(-1);
    expect(dayNumber('2000-01-01')).toBe(10957);
    expect(dayNumber('2026-09-24')).toBe(20720);
  });

  it('matches the UTC calendar and round-trips over five centuries', () => {
    for (let n = dayNumber('1850-01-01'); n <= dayNumber('2350-12-31'); n += 13) {
      const iso = fromDayNumber(n);
      expect(dayNumber(iso)).toBe(n);
      const d = new Date(n * 86400000);
      const oracle = `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      expect(iso).toBe(oracle);
    }
  });

  it('adds and subtracts days across month, year and leap boundaries', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2023-02-28', 1)).toBe('2023-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-01-01', 365)).toBe('2027-01-01');
    expect(addDays('2024-01-01', 366)).toBe('2025-01-01');
    expect(addDays('2026-09-24', 0)).toBe('2026-09-24');
    expect(diffDays('2026-01-01', '2026-01-03')).toBe(2);
    expect(diffDays('2026-01-03', '2026-01-01')).toBe(-2);
  });

  it('is unaffected by DST changes in any process time zone', () => {
    inEachZone(() => {
      // EU and US spring-forward and fall-back weekends of 2026.
      expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
      expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
      expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
      expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
      expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
      expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
      expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
      expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
      expect(dateRange('2026-03-27', 5)).toEqual(['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31']);
    });
  });
});

describe('weeks', () => {
  it('knows the weekday (0 = Sunday)', () => {
    expect(weekday('1970-01-01')).toBe(4);
    expect(weekday('2026-09-24')).toBe(4);
    expect(weekday('2026-09-19')).toBe(6);
    expect(weekday('2000-02-29')).toBe(2);
    expect(weekday('1969-12-28')).toBe(0);
  });

  it('starts the week on Saturday, Sunday or Monday', () => {
    expect(startOfWeek('2026-09-24', 'saturday')).toBe('2026-09-19');
    expect(startOfWeek('2026-09-24', 'sunday')).toBe('2026-09-20');
    expect(startOfWeek('2026-09-24', 'monday')).toBe('2026-09-21');
    expect(startOfWeek('2026-09-19', 'saturday')).toBe('2026-09-19');
    expect(startOfWeek('2026-09-20', 'monday')).toBe('2026-09-14');
    for (const ws of ['saturday', 'sunday', 'monday'] as const) {
      for (let i = 0; i < 14; i++) {
        const d = addDays('2026-12-25', i);
        const s = startOfWeek(d, ws);
        expect(diffDays(s, d)).toBeGreaterThanOrEqual(0);
        expect(diffDays(s, d)).toBeLessThan(7);
        expect(weekday(s)).toBe({ sunday: 0, monday: 1, saturday: 6 }[ws]);
      }
    }
  });

  it('lists the 7 dates of a week across a year boundary', () => {
    expect(weekDates('2026-12-31', 'monday')).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
    expect(weekDates('2027-01-01', 'saturday')[0]).toBe('2026-12-26');
    expect(dateRange('2026-09-24', 0)).toEqual([]);
  });
});

describe('today, relative days and comparisons', () => {
  it('reads the local calendar day of an instant in every time zone, even right after midnight', () => {
    inEachZone((zone) => {
      // Built from local fields, so every zone must read back the same calendar day.
      expect(todayLocal(new Date(2026, 2, 29, 0, 5)), zone).toBe('2026-03-29');
      expect(todayLocal(new Date(2026, 2, 8, 2, 30)), zone).toBe('2026-03-08');
      expect(todayLocal(new Date(2026, 9, 25, 23, 59)), zone).toBe('2026-10-25');
      expect(todayLocal(new Date(2026, 11, 31, 23, 59, 59)), zone).toBe('2026-12-31');
      expect(isToday('2026-03-29', new Date(2026, 2, 29, 0, 5)), zone).toBe(true);
      expect(isToday('2026-03-28', new Date(2026, 2, 29, 0, 5)), zone).toBe(false);
    });
  });

  it('never makes the UTC-parsing mistake', () => {
    env.TZ = 'America/Los_Angeles';
    // new Date('2026-03-29') is UTC midnight, which is still March 28 in Los Angeles...
    expect(new Date('2026-03-29').getDate()).toBe(28);
    // ...but these helpers only do calendar arithmetic on the string.
    expect(addDays('2026-03-29', 0)).toBe('2026-03-29');
    expect(weekday('2026-03-29')).toBe(0);
    expect(formatWeekday('2026-03-29', 'en', 'long')).toBe('Sunday');
    if (ORIGINAL_TZ === undefined) delete env.TZ;
    else env.TZ = ORIGINAL_TZ;
  });

  it('names today, tomorrow and yesterday and sorts dates', () => {
    expect(relativeDay('2026-09-24', '2026-09-24')).toBe('today');
    expect(relativeDay('2026-09-25', '2026-09-24')).toBe('tomorrow');
    expect(relativeDay('2026-09-23', '2026-09-24')).toBe('yesterday');
    expect(relativeDay('2026-09-27', '2026-09-24')).toBeNull();
    expect(compareDates('2026-09-24', '2026-10-01')).toBe(-1);
    expect(compareDates('2026-10-01', '2026-09-24')).toBe(1);
    expect(compareDates('2026-10-01', '2026-10-01')).toBe(0);
  });
});

describe('formatting', () => {
  it('formats in the given locale, the same in every time zone', () => {
    inEachZone((zone) => {
      expect(formatLongDate('2026-09-24', 'en-GB'), zone).toBe('Thursday 24 September');
      expect(formatShortDate('2026-09-24', 'en-US'), zone).toBe('Thu, Sep 24');
      expect(formatWeekday('2026-09-24', 'en'), zone).toBe('Thu');
      expect(formatDayMonth('2026-01-01', 'en-GB'), zone).toBe('1 Jan');
      expect(formatWeekday('2026-09-24', 'ar', 'long'), zone).toBe('الخميس');
    });
  });

  it('falls back to English for a malformed locale and formats far dates', () => {
    expect(formatWeekday('2026-09-24', 'en_US', 'long')).toBe('Thursday');
    expect(formatDate('0099-03-01', 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })).toBe('1 March 99');
    expect(formatDate('2400-02-29', 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' })).toBe('29 Feb 2400');
  });
});
