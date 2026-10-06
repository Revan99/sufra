// Local calendar dates as 'YYYY-MM-DD' strings. All arithmetic is pure integer calendar math, so it
// never depends on the process time zone or DST. Never parse these strings with `new Date(str)`
// (that reads them as UTC midnight and shifts the day west of Greenwich).
//
// Invalid input, one contract:
// - Arithmetic (dayNumber, fromDayNumber, addDays, diffDays, weekday, startOfWeek, weekDates, dateRange) throws a
//   RangeError for an invalid date or a non-finite day count. Validate first (isISODate, or safeDate for a route).
// - Display and comparison helpers used while rendering (formatDate and the format* shorthands, relativeDay,
//   isToday) never throw: an invalid date formats as '' and is never today, tomorrow or yesterday.
import type { WeekStart } from '../types.ts';

/** A local calendar date, 'YYYY-MM-DD'. */
export type ISODate = string;

export interface CalendarDate {
  year: number;
  /** 1-12 */
  month: number;
  /** 1-31 */
  day: number;
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Weekday numbers, JS convention: 0 = Sunday ... 6 = Saturday. */
export const WEEK_START_DAY: Readonly<Record<WeekStart, number>> = { sunday: 0, monday: 1, saturday: 6 };

function daysInMonth(year: number, month: number): number {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Parses 'YYYY-MM-DD' into its parts, or null when it isn't a real calendar date. */
export function parseISODate(s: unknown): CalendarDate | null {
  if (typeof s !== 'string') return null;
  const m = ISO_RE.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** True for a valid 'YYYY-MM-DD' calendar date. */
export function isISODate(s: unknown): s is ISODate {
  return parseISODate(s) !== null;
}

/** `s` when it is a valid 'YYYY-MM-DD' date, else `fallback` (for dates from a URL, storage or user input). */
export function safeDate(s: unknown, fallback: ISODate): ISODate {
  return isISODate(s) ? s : fallback;
}

function mustBeFinite(n: number, what: string): void {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new RangeError(`Invalid ${what} ${String(n)}, expected a finite number`);
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

/** Formats parts as 'YYYY-MM-DD'. */
export function toISODate(d: CalendarDate): ISODate {
  return `${pad(d.year, 4)}-${pad(d.month, 2)}-${pad(d.day, 2)}`;
}

function mustParse(s: ISODate): CalendarDate {
  const d = parseISODate(s);
  if (!d) throw new RangeError(`Invalid date "${String(s)}", expected YYYY-MM-DD`);
  return d;
}

/** The local calendar date of an instant (uses the Date's local fields). */
export function todayLocal(now: Date = new Date()): ISODate {
  return toISODate({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}

/** Days since 1970-01-01 (day 0). Throws RangeError on an invalid date. */
export function dayNumber(date: ISODate): number {
  const { year, month, day } = mustParse(date);
  // Howard Hinnant's days_from_civil.
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Inverse of dayNumber (fractions are floored). Throws RangeError for NaN or an infinite n. */
export function fromDayNumber(n: number): ISODate {
  mustBeFinite(n, 'day number');
  const z = Math.floor(n) + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return toISODate({ year, month, day });
}

/** date + n days (n may be negative). Throws RangeError for an invalid date or a non-finite n. */
export function addDays(date: ISODate, n: number): ISODate {
  mustBeFinite(n, 'day count');
  return fromDayNumber(dayNumber(date) + n);
}

/** Whole days from `from` to `to`: diffDays('2026-01-01', '2026-01-03') === 2. Throws RangeError on an invalid date. */
export function diffDays(from: ISODate, to: ISODate): number {
  return dayNumber(to) - dayNumber(from);
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekday(date: ISODate): number {
  // 1970-01-01 was a Thursday (4).
  return (((dayNumber(date) + 4) % 7) + 7) % 7;
}

/** The first day of the week containing `date`. */
export function startOfWeek(date: ISODate, weekStart: WeekStart): ISODate {
  const back = (weekday(date) - WEEK_START_DAY[weekStart] + 7) % 7;
  return addDays(date, -back);
}

/** The 7 dates of the week containing `date`, starting on `weekStart`. */
export function weekDates(date: ISODate, weekStart: WeekStart): ISODate[] {
  return dateRange(startOfWeek(date, weekStart), 7);
}

/** `days` consecutive dates starting at `start` (empty when days <= 0). Throws RangeError for a non-finite `days`. */
export function dateRange(start: ISODate, days: number): ISODate[] {
  mustBeFinite(days, 'day count');
  const first = dayNumber(start);
  const out: ISODate[] = [];
  for (let i = 0; i < days; i++) out.push(fromDayNumber(first + i));
  return out;
}

/** True when `date` is the local calendar date of `now` (false for an invalid date). */
export function isToday(date: ISODate, now: Date = new Date()): boolean {
  return date === todayLocal(now);
}

/** -1, 0 or 1. Valid ISO dates sort correctly as strings. */
export function compareDates(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 'today' | 'tomorrow' | 'yesterday' relative to `today`, else null (also when either date is invalid). The UI translates the key. */
export function relativeDay(date: ISODate, today: ISODate): 'today' | 'tomorrow' | 'yesterday' | null {
  if (!isISODate(date) || !isISODate(today)) return null;
  const d = diffDays(today, date);
  return d === 0 ? 'today' : d === 1 ? 'tomorrow' : d === -1 ? 'yesterday' : null;
}

/**
 * A Date for this calendar day, for Intl formatting only. It is UTC midnight and must be formatted with
 * timeZone 'UTC' (formatDate does this), which keeps the calendar day stable in every time zone.
 */
function utcDate(date: ISODate): Date {
  const { year, month, day } = mustParse(date);
  const d = new Date(Date.UTC(2000, month - 1, day));
  d.setUTCFullYear(year);
  return d;
}

/**
 * Formats a calendar date with Intl in the given locale (English when the locale is unknown or malformed). The
 * time zone option is always UTC (see utcDate), so the output never depends on the device's time zone. Never
 * throws: an invalid date gives ''. The format* shorthands below behave the same.
 */
export function formatDate(date: ISODate, locale: string, options: Intl.DateTimeFormatOptions): string {
  if (!isISODate(date)) return '';
  const d = utcDate(date);
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(d);
  }
}

/** "Thursday, 24 September" (en-GB) / "Thursday, September 24" (en-US). */
export function formatLongDate(date: ISODate, locale: string): string {
  return formatDate(date, locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "Thu, 24 Sep". */
export function formatShortDate(date: ISODate, locale: string): string {
  return formatDate(date, locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "Thu" / "Thursday". */
export function formatWeekday(date: ISODate, locale: string, width: 'short' | 'long' | 'narrow' = 'short'): string {
  return formatDate(date, locale, { weekday: width });
}

/** "24 Sep". */
export function formatDayMonth(date: ISODate, locale: string): string {
  return formatDate(date, locale, { day: 'numeric', month: 'short' });
}
