// Cooking progress on the recipe page (ticked steps and a changed servings count), kept per recipe and day in
// sessionStorage so it survives switching tabs, Back and a reload mid-cook. It is cleared the next day. Every
// storage access is guarded: without storage the page still works, it just forgets on leaving.
import { useCallback, useState } from 'react';
import type { ISODate } from '../lib/dates.ts';

export interface CookProgress {
  /** Ticked step indexes, sorted. */
  steps: number[];
  /** Servings chosen on the stepper, when changed from the default. */
  servings?: number;
  /** The day it was last changed; entries from earlier days are dropped. */
  day: ISODate;
}

export type ProgressStore = Readonly<Record<string, CookProgress>>;

export const PROGRESS_KEY = 'sufra:cooking';

/** One entry per recipe and planned date (or the day it was opened, for a recipe opened from Recipes). */
export function progressKey(recipeId: string, date: ISODate | null, today: ISODate): string {
  return `${recipeId}@${date ?? today}`;
}

/** Valid entries from `today` on (anything else in storage is dropped). */
export function parseProgress(x: unknown, today: ISODate): Record<string, CookProgress> {
  const out: Record<string, CookProgress> = {};
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return out;
  for (const [key, v] of Object.entries(x as Record<string, unknown>)) {
    if (typeof v !== 'object' || v === null) continue;
    const e = v as Partial<CookProgress>;
    if (typeof e.day !== 'string' || e.day < today || !Array.isArray(e.steps)) continue;
    const steps = [...new Set(e.steps.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 100))].sort((a, b) => a - b);
    const servings = typeof e.servings === 'number' && Number.isFinite(e.servings) && e.servings > 0 && e.servings <= 100 ? e.servings : undefined;
    if (!steps.length && servings === undefined) continue;
    out[key] = servings === undefined ? { steps, day: e.day } : { steps, servings, day: e.day };
  }
  return out;
}

/** Ticks or unticks step `i`. */
export function toggleStep(p: CookProgress, i: number, today: ISODate): CookProgress {
  const steps = p.steps.includes(i) ? p.steps.filter((s) => s !== i) : [...p.steps, i].sort((a, b) => a - b);
  return { ...p, steps, day: today };
}

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function load(today: ISODate): Record<string, CookProgress> {
  try {
    return parseProgress(JSON.parse(storage()?.getItem(PROGRESS_KEY) ?? 'null'), today);
  } catch {
    return {};
  }
}

function save(store: Record<string, CookProgress>): void {
  try {
    const s = storage();
    if (!s) return;
    if (Object.keys(store).length) s.setItem(PROGRESS_KEY, JSON.stringify(store));
    else s.removeItem(PROGRESS_KEY);
  } catch {
    // Full or blocked: progress lasts until the page is left.
  }
}

const EMPTY: CookProgress = { steps: [], day: '' };

/** The progress for one recipe on one day, and a setter that saves it. */
export function useCookProgress(key: string, today: ISODate): [CookProgress, (next: (p: CookProgress) => CookProgress) => void] {
  const [state, setState] = useState(() => ({ key, progress: load(today)[key] ?? { ...EMPTY, day: today } }));
  // A different recipe or day: read its entry (during render, so there is no frame with the old one).
  let current = state;
  if (state.key !== key) {
    current = { key, progress: load(today)[key] ?? { ...EMPTY, day: today } };
    setState(current);
  }
  const update = useCallback(
    (next: (p: CookProgress) => CookProgress) => {
      setState((s) => {
        const progress = { ...next(s.progress), day: today };
        const store = load(today);
        if (progress.steps.length || progress.servings !== undefined) store[s.key] = progress;
        else delete store[s.key];
        save(store);
        return { key: s.key, progress };
      });
    },
    [today],
  );
  return [current.progress, update];
}
