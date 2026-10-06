// A tiny hash router: #/today, #/today/2026-09-24, #/week, #/week/2026-09-26, #/shopping, #/recipes,
// #/recipe/<id>?date=&slot=&index=, #/settings, #/credits. Parsing never throws; anything unknown opens Today.
import { useSyncExternalStore } from 'react';
import type { MealSlot } from '../types.ts';
import { MEAL_SLOTS } from '../types.ts';
import { isISODate } from '../lib/dates.ts';
import type { ISODate } from '../lib/dates.ts';

export type Route =
  | { name: 'today'; date: ISODate | null }
  | { name: 'week'; date: ISODate | null }
  | { name: 'shopping' }
  | { name: 'recipes' }
  | { name: 'recipe'; id: string; date: ISODate | null; slot: MealSlot | null; index: number | null }
  | { name: 'settings' }
  | { name: 'credits' };

export type TabName = 'today' | 'week' | 'shopping' | 'recipes' | 'settings';

const ID_RE = /^[a-z0-9][a-z0-9-]{0,120}$/;

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** The route for a location hash ('#/week', '#/recipe/x?date=...'). */
export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const [pathPart = '', queryPart = ''] = raw.split('?', 2);
  const parts = pathPart.split('/').filter(Boolean).map(safeDecode);
  const q = new URLSearchParams(queryPart);
  const [head, arg] = parts;
  switch (head) {
    case undefined:
    case 'today':
      return { name: 'today', date: isISODate(arg) ? arg : null };
    case 'week':
      return { name: 'week', date: isISODate(arg) ? arg : null };
    case 'shopping':
      return { name: 'shopping' };
    case 'recipes':
      return { name: 'recipes' };
    case 'settings':
      return { name: 'settings' };
    case 'credits':
      return { name: 'credits' };
    case 'recipe': {
      if (!arg || !ID_RE.test(arg)) return { name: 'recipes' };
      const date = q.get('date');
      const slot = q.get('slot');
      const index = Number(q.get('index'));
      const validSlot = (MEAL_SLOTS as readonly string[]).includes(slot ?? '') ? (slot as MealSlot) : null;
      return {
        name: 'recipe',
        id: arg,
        date: isISODate(date) ? date : null,
        slot: validSlot,
        index: validSlot && q.has('index') && Number.isInteger(index) && index >= 0 && index <= 4 ? index : validSlot ? 0 : null,
      };
    }
    default:
      return { name: 'today', date: null };
  }
}

/** The hash for a route ('#/today', '#/recipe/x?date=2026-09-24&slot=lunch&index=0'). */
export function routeHash(route: Route): string {
  switch (route.name) {
    case 'today':
    case 'week':
      return route.date ? `#/${route.name}/${route.date}` : `#/${route.name}`;
    case 'recipe': {
      const q = new URLSearchParams();
      if (route.date) q.set('date', route.date);
      if (route.slot) q.set('slot', route.slot);
      if (route.slot && route.index !== null) q.set('index', String(route.index));
      const qs = q.toString();
      return `#/recipe/${encodeURIComponent(route.id)}${qs ? `?${qs}` : ''}`;
    }
    default:
      return `#/${route.name}`;
  }
}

/** Which tab a route belongs to (the recipe page belongs to where it's usually opened from; credits to Settings). */
export function tabOf(route: Route): TabName {
  if (route.name === 'credits') return 'settings';
  return route.name === 'recipe' ? (route.date ? 'today' : 'recipes') : route.name;
}

/** A recipe route, optionally tied to a planned meal. */
export function recipeRoute(id: string, meal?: { date: ISODate; slot: MealSlot; index: number }): Route {
  return { name: 'recipe', id, date: meal?.date ?? null, slot: meal?.slot ?? null, index: meal?.index ?? null };
}

// ---------------------------------------------------------------------------------------------------------------
// Browser binding

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const getHash = (): string => window.location.hash;

/** The current route, re-rendering on every hash change. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  return parseHash(hash);
}

/** Goes to a route. `replace` swaps the history entry instead of adding one (stepping through dates). */
export function navigate(route: Route, opts: { replace?: boolean } = {}): void {
  const hash = routeHash(route);
  if (hash === window.location.hash) return;
  if (opts.replace) {
    // The entry now shows a different screen: forget the scroll position saved for the old one.
    const rest: HistoryState = { ...((window.history.state ?? {}) as HistoryState) };
    delete rest.sufraScroll;
    window.history.replaceState(rest, '', hash);
    pendingReplace = true;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

/** Back in history when the previous entry is ours, else to `fallback`. */
export function goBack(fallback: Route): void {
  const state = window.history.state as HistoryState | null;
  if (state?.sufraDepth && state.sufraDepth > 0) window.history.back();
  else navigate(fallback, { replace: true });
}

interface HistoryState {
  /** Depth inside the app (0 = the entry the app was opened on). */
  sufraDepth?: number;
  /** Scroll position saved for this entry, restored when the user comes back to it. */
  sufraScroll?: number;
}

/** How the last hash change happened: a new entry, back/forward through history, or a replace. */
export type NavigationKind = 'push' | 'traverse' | 'replace';

let lastNavigation: NavigationKind = 'push';
let pendingReplace = false;

/** How the current screen was reached (set before React renders it). */
export function navigationKind(): NavigationKind {
  return lastNavigation;
}

/** The scroll position saved for the current history entry, if any. */
export function savedScroll(): number | null {
  const y = (window.history.state as HistoryState | null)?.sufraScroll;
  return typeof y === 'number' && Number.isFinite(y) ? y : null;
}

/**
 * Tags each history entry with its depth inside the app, so goBack knows whether "back" stays in Sufra, records how
 * each hash change happened (navigationKind), and saves the scroll position into the current entry as the user
 * scrolls, so Back returns to the same place in a long list. Call once at startup, before rendering.
 */
export function trackHistoryDepth(): void {
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  let depth = (window.history.state as HistoryState | null)?.sufraDepth ?? 0;
  window.history.replaceState({ ...(window.history.state ?? {}), sufraDepth: depth }, '');
  window.addEventListener('hashchange', () => {
    const current = (window.history.state as HistoryState | null)?.sufraDepth;
    if (typeof current === 'number') {
      depth = current;
      lastNavigation = pendingReplace ? 'replace' : 'traverse';
      pendingReplace = false;
      return;
    }
    depth += 1;
    lastNavigation = 'push';
    pendingReplace = false;
    window.history.replaceState({ ...(window.history.state ?? {}), sufraDepth: depth }, '');
  });
  let timer = 0;
  const save = () => {
    window.clearTimeout(timer);
    const state = (window.history.state ?? {}) as HistoryState;
    if (state.sufraScroll !== window.scrollY) window.history.replaceState({ ...state, sufraScroll: window.scrollY }, '');
  };
  window.addEventListener(
    'scroll',
    () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 150);
    },
    { passive: true },
  );
  // A tap that navigates runs its click handlers before the hash changes: save the exact position first.
  window.addEventListener('click', save, { capture: true });
}
