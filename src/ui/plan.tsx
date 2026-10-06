// The meal plan, derived from state with useMemo: a PlanContext for the planner plus a per-context day cache.
// Favorites are a snapshot (see PlanContext.favorites), so tapping the heart never reshuffles days already shown:
// it is taken when the app opens and refreshed only when the planning week changes, the profile changes (which
// re-plans anyway) or the state is reset or replaced. It lives in memory: persisting it across launches needs a
// field in lib/storage.ts's AppState.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { DayPlan } from '../types.ts';
import type { PlanContext } from '../lib/planner.ts';
import { planDay } from '../lib/planner.ts';
import { addDays, startOfWeek } from '../lib/dates.ts';
import type { ISODate } from '../lib/dates.ts';
import { useAppState } from './AppState.tsx';
import { useLibrary } from './library.tsx';
import { useToday } from './useToday.ts';

export interface PlanApi {
  ctx: PlanContext;
  today: ISODate;
  /** The plan for a date (cached until anything that changes plans changes). */
  day: (date: ISODate) => DayPlan;
  /** `count` consecutive days from `start`. */
  days: (start: ISODate, count: number) => DayPlan[];
}

const Ctx = createContext<PlanApi | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { state, dispatch, generation } = useAppState();
  const lib = useLibrary();
  const today = useToday();
  const week = startOfWeek(today, state.profile.weekStart);

  const favoritesRef = useRef(state.favorites);
  favoritesRef.current = state.favorites;
  const [favoriteSnapshot, setFavoriteSnapshot] = useState(state.favorites);
  useEffect(() => {
    setFavoriteSnapshot(favoritesRef.current);
  }, [week, generation, state.profile]);

  const known = useMemo(() => new Set(lib.byId.keys()), [lib]);
  useEffect(() => {
    dispatch({ type: 'prune', today, known });
  }, [today, known, generation, dispatch]);

  const ctx = useMemo<PlanContext>(
    () => ({
      profile: state.profile,
      catalog: lib.catalog,
      favorites: favoriteSnapshot,
      overrides: state.overrides,
      ingredientIndex: lib.ingredientIndex,
    }),
    [state.profile, state.overrides, favoriteSnapshot, lib],
  );

  const api = useMemo<PlanApi>(() => {
    const cache = new Map<ISODate, DayPlan>();
    const day = (date: ISODate): DayPlan => {
      let plan = cache.get(date);
      if (!plan) {
        plan = planDay(date, ctx);
        cache.set(date, plan);
      }
      return plan;
    };
    const days = (start: ISODate, count: number): DayPlan[] => {
      const out: DayPlan[] = [];
      for (let i = 0; i < count; i++) out.push(day(addDays(start, i)));
      return out;
    };
    return { ctx, today, day, days };
  }, [ctx, today]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePlan(): PlanApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('usePlan outside PlanProvider');
  return api;
}
