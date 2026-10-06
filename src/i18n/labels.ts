// Display helpers that combine t() with the Intl formatting in lib/format.ts and lib/dates.ts.
import type { ActivityLevel, Aisle, Allergen, Cuisine, Diet, Goal, MealSlot, Nutrients, Sex, Unit, WeekStart } from '../types.ts';
import { formatAmount, formatMinutes, formatNumber, formatPercent, formatQty, scaleAmount } from '../lib/format.ts';
import { formatDayMonth, formatLongDate, formatShortDate, formatWeekday, parseISODate, relativeDay } from '../lib/dates.ts';
import type { ISODate } from '../lib/dates.ts';
import type { ThemeChoice } from '../lib/storage.ts';
import { intlLocale, t, tq } from './index.ts';

export const slotName = (slot: MealSlot): string => t(`slot.${slot}`);
export const slotLower = (slot: MealSlot): string => t(`slotLower.${slot}`);

/** "Breakfast", or "Snack 1" / "Snack 2" when the day has more than one snack. */
export function mealName(slot: MealSlot, index: number, snacksOnDay = 1): string {
  if (slot === 'snack' && (snacksOnDay > 1 || index > 0)) return t('slot.snackN', { n: index + 1 });
  return slotName(slot);
}

export const cuisineName = (c: Cuisine): string => t(`cuisine.${c}`);
export const allergenName = (a: Allergen): string => t(`allergen.${a}`);
export const dietName = (d: Diet): string => t(`diet.${d}`);
export const dietDescription = (d: Diet): string => t(`diet.${d}.desc`);
export const aisleName = (a: Aisle): string => t(`aisle.${a}`);
export const nutrientName = (k: keyof Nutrients): string => t(`nutrient.${k}`);
export const sexName = (s: Sex): string => t(`sex.${s}`);
export const activityName = (a: ActivityLevel): string => t(`activity.${a}`);
export const goalName = (g: Goal): string => t(`goal.${g}`);
export const weekStartName = (w: WeekStart): string => t(`weekStart.${w}`);
export const themeName = (th: ThemeChoice): string => t(`theme.${th}`);

/** A unit word for formatAmount, pluralized by the displayed quantity ("½ cup", "1½ cups"). */
export function unitWord(unit: Unit, qty: number): string {
  return tq(`unit.${unit}`, qty);
}

/** Number in the active locale. */
export function num(n: number, digits = 0): string {
  return formatNumber(n, intlLocale(), digits);
}

export function kcal(n: number): string {
  return t('value.kcal', { n: num(n) });
}

/** Grams: one decimal below 10, whole numbers above. */
export function grams(n: number): string {
  return t('value.g', { n: num(n, Math.abs(n) < 10 ? 1 : 0) });
}

/** A nutrient value with its unit: "450 kcal", "32 g", "4.5 g", "620 mg". */
export function nutrientValue(key: keyof Nutrients, value: number): string {
  if (key === 'kcal') return kcal(value);
  if (key === 'sodium') return t('value.mg', { n: num(value) });
  return grams(value);
}

export function percent(ratio: number): string {
  return formatPercent(ratio, intlLocale());
}

/** "25 min", "1 h 15 min". */
export function minutes(total: number): string {
  return formatMinutes(total, { hours: t('time.hours'), minutes: t('time.minutes') }, intlLocale());
}

/** A portion as a nice number: "1¼", "½", "2". */
export function portionNumber(portion: number): string {
  return formatQty(portion, 'piece', intlLocale());
}

/** "1¼ servings", "½ serving". */
export function portionLabel(portion: number): string {
  return tq('portion', portion, { portion: portionNumber(portion) });
}

/** A recipe ingredient amount scaled by `factor`: "1½ tbsp", "2 medium", "150 g", "to taste". */
export function amountLabel(qty: number, unit: Unit, factor = 1): string {
  const a = scaleAmount({ qty, unit }, factor);
  return formatAmount(a.qty, a.unit, { locale: intlLocale(), unitLabel: unitWord });
}

/** "Today", "Tomorrow", "Yesterday" or null. */
export function relativeName(date: ISODate, today: ISODate): string | null {
  const rel = relativeDay(date, today);
  return rel ? t(`day.${rel}`) : null;
}

export const longDate = (d: ISODate): string => formatLongDate(d, intlLocale());
export const shortDate = (d: ISODate): string => formatShortDate(d, intlLocale());
export const dayMonth = (d: ISODate): string => formatDayMonth(d, intlLocale());
export const weekdayName = (d: ISODate, width: 'short' | 'long' | 'narrow' = 'short'): string => formatWeekday(d, intlLocale(), width);

/** "Today", "Tomorrow" or "Sat 26 Sep". */
export function friendlyDate(date: ISODate, today: ISODate): string {
  return relativeName(date, today) ?? shortDate(date);
}

function utcNoon(date: ISODate): Date | null {
  const p = parseISODate(date);
  if (!p) return null;
  const d = new Date(Date.UTC(2000, p.month - 1, p.day, 12));
  d.setUTCFullYear(p.year);
  return d;
}

/** "24–30 Sept", "28 Sept – 4 Oct" (one date when they are the same), with Intl's range formatting. */
export function dateSpan(start: ISODate, end: ISODate): string {
  if (start === end) return dayMonth(start);
  const a = utcNoon(start);
  const b = utcNoon(end);
  if (a && b) {
    try {
      return new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'short', timeZone: 'UTC' }).formatRange(a, b);
    } catch {
      // Fall through to the plain pair.
    }
  }
  return t('common.range', { start: dayMonth(start), end: dayMonth(end) });
}

/** "a, b and c" in the locale's style. */
export function listJoin(items: readonly string[]): string {
  try {
    return new Intl.ListFormat(intlLocale(), { style: 'long', type: 'conjunction' }).format(items);
  } catch {
    return items.join(', ');
  }
}
