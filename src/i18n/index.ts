// Translation lookup. English is the only locale today; the structure is ready for Sorani Kurdish and Arabic
// (right to left): add a messages table with the same keys and a LocaleInfo, then call setLocale.
import { en } from './en.ts';
import { formatNumber } from '../lib/format.ts';

export type MessageKey = keyof typeof en;
export type Messages = Readonly<Record<MessageKey, string>>;
export type Params = Readonly<Record<string, string | number>>;

/** Keys that have plural forms: 'portion' for 'portion.one' / 'portion.other'. */
export type PluralBase = { [K in MessageKey]: K extends `${infer B}.one` ? B : never }[MessageKey];

export interface LocaleInfo {
  /** BCP 47 tag for <html lang>. */
  lang: string;
  /** Locale for Intl dates and numbers. English uses day-month order, as is usual in Iraq. */
  intl: string;
  dir: 'ltr' | 'rtl';
  /**
   * Plural category for a measured quantity that can be fractional (½ cup, 1¼ servings). Intl's rules are made for
   * counts; English says "½ cup" where they give 'other'. Leave it out to use Intl's rules with the real number.
   */
  quantity?: (qty: number) => Intl.LDMLPluralRule;
}

export const EN_LOCALE: LocaleInfo = { lang: 'en', intl: 'en-GB', dir: 'ltr', quantity: (q) => (q > 0 && q <= 1 ? 'one' : 'other') };

let messages: Messages = en;
let locale: LocaleInfo = EN_LOCALE;
let plurals = new Intl.PluralRules(locale.intl);

/** Switches the active locale (all later t() calls use it). */
export function setLocale(info: LocaleInfo, table: Messages): void {
  locale = info;
  messages = table;
  try {
    plurals = new Intl.PluralRules(info.intl);
  } catch {
    plurals = new Intl.PluralRules('en');
  }
}

export function currentLocale(): LocaleInfo {
  return locale;
}

/** The Intl locale tag for dates and numbers. */
export function intlLocale(): string {
  return locale.intl;
}

function formatParam(v: string | number): string {
  if (typeof v === 'string') return v;
  return formatNumber(v, locale.intl, Number.isInteger(v) ? 0 : 1);
}

/** Replaces {name} placeholders. Numbers are formatted for the locale. Unknown placeholders stay visible. */
export function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (Object.hasOwn(params, name) ? formatParam(params[name] as string | number) : whole));
}

/** The message for `key` with its parameters filled in. Falls back to English, then to the key itself. */
export function t(key: MessageKey, params?: Params): string {
  const template = messages[key] ?? en[key] ?? key;
  return interpolate(template, params);
}

/**
 * A plural message: picks `${base}.${category}` by the locale's plural rules for `count` (falling back to
 * `.other`), with `n` set to count unless params give it.
 */
export function tp(base: PluralBase, count: number, params?: Params): string {
  let category: string = 'other';
  try {
    category = plurals.select(count);
  } catch {
    category = 'other';
  }
  return pluralMessage(base, category, count, params);
}

/**
 * A plural message for a measured quantity (the number as displayed: 0.5, 1.25, 3): the locale's `quantity` rule
 * when it has one, else Intl's plural rules for that number (Arabic's 'two', 'few' and 'many' included).
 */
export function tq(base: PluralBase, qty: number, params?: Params): string {
  let category: string = 'other';
  try {
    category = locale.quantity ? locale.quantity(qty) : plurals.select(qty);
  } catch {
    category = 'other';
  }
  return pluralMessage(base, category, qty, params);
}

function pluralMessage(base: PluralBase, category: string, n: number, params?: Params): string {
  const table = messages as Readonly<Record<string, string>>;
  const key = (`${base}.${category}` in table ? `${base}.${category}` : `${base}.other`) as MessageKey;
  return t(key, { n, ...params });
}

/** Every key, for tests and tooling. */
export function messageKeys(): MessageKey[] {
  return Object.keys(en) as MessageKey[];
}
