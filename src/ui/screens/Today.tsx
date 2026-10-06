import { useState } from 'react';
import type { MealSlot } from '../../types.ts';
import { addDays } from '../../lib/dates.ts';
import type { ISODate } from '../../lib/dates.ts';
import { t, tp } from '../../i18n/index.ts';
import { longDate, num, relativeName, shortDate } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { usePlan } from '../plan.tsx';
import { navigate } from '../router.ts';
import { dayMealName, isAddedMeal, recipeConflict } from '../planHelpers.ts';
import { DaySummary, kcalStatus } from '../components/DaySummary.tsx';
import { Icon } from '../components/Icon.tsx';
import { MealCard } from '../components/MealCard.tsx';
import { UnfilledCard } from '../components/UnfilledCard.tsx';
import { useToast } from '../components/Toast.tsx';
import { SwapSheet } from '../sheets/SwapSheet.tsx';
import type { SwapTarget } from '../sheets/SwapSheet.tsx';

const SLOT_ORDER: Readonly<Record<MealSlot, number>> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };

/**
 * ‹ date ›. The eyebrow row has a fixed height and holds "Today"/"Yesterday" or the "Back to today" pill, so the
 * header doesn't jump while paging; phones show the short date ("Thu 24 Sept") so it stays on one line.
 * Stepping replaces the history entry: Back leaves the screen instead of walking back through every day.
 */
export function DateNav({ date, today }: { date: ISODate; today: ISODate }) {
  const go = (d: ISODate) => navigate({ name: 'today', date: d === today ? null : d }, { replace: true });
  const rel = relativeName(date, today);
  return (
    <header className="screen-head date-nav">
      <button type="button" className="icon-btn nav-arrow" onClick={() => go(addDays(date, -1))} aria-label={t('today.prevDay')}>
        <Icon name="chevronLeft" className="flip-rtl" />
      </button>
      <div className="date-nav-title">
        <div className="date-nav-eyebrow">
          {date === today ? (
            <p className="eyebrow">{rel}</p>
          ) : (
            <>
              {rel ? <p className="eyebrow">{rel}</p> : null}
              <button type="button" className="pill today-pill" onClick={() => go(today)}>
                {t('today.backToToday')}
              </button>
            </>
          )}
        </div>
        <h1 tabIndex={-1} className="screen-title">
          <span className="date-long">{longDate(date)}</span>
          <span className="date-short">{shortDate(date)}</span>
        </h1>
      </div>
      <button type="button" className="icon-btn nav-arrow" onClick={() => go(addDays(date, 1))} aria-label={t('today.nextDay')}>
        <Icon name="chevronRight" className="flip-rtl" />
      </button>
    </header>
  );
}

export function TodayScreen({ date }: { date: ISODate | null }) {
  const { state, dispatch } = useAppState();
  const lib = useLibrary();
  const plan = usePlan();
  const notify = useToast();
  const [swap, setSwap] = useState<SwapTarget | null>(null);
  const day = date ?? plan.today;
  const dayPlan = plan.day(day);
  const profile = state.profile;
  const overrides = state.overrides.filter((o) => o.date === day);
  // A pick counts only while the plan actually shows it (an override for a recipe that's gone is ignored).
  const pickFor = (slot: MealSlot, index: number, recipeId: string) => overrides.find((o) => o.slot === slot && o.index === index && o.recipeId === recipeId);

  const rows = [
    ...dayPlan.meals.map((m) => ({ kind: 'meal' as const, slot: m.slot, index: m.index, meal: m })),
    ...dayPlan.unfilled.map((u) => ({ kind: 'unfilled' as const, slot: u.slot, index: u.index })),
  ].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] || a.index - b.index);

  const toggleFavorite = (id: string, name: string) => {
    const was = state.favorites.includes(id);
    dispatch({ type: 'favorite', id });
    notify(t(was ? 'common.favoriteRemoved' : 'common.favoriteAdded', { name }));
  };

  const kcal = Math.round(dayPlan.totals.kcal);
  const status = kcalStatus(kcal, profile.kcalTarget);
  const gap = num(Math.abs(kcal - profile.kcalTarget));
  const notes: string[] = [];
  if (dayPlan.unfilled.length) notes.push(tp('today.unfilledNote', dayPlan.unfilled.length));
  if (status === 'under') notes.push(t('today.shortNote', { n: gap }));
  if (status === 'over') notes.push(t('today.overNote', { n: gap }));
  if (!notes.length) notes.push(t('today.balanced'));

  return (
    <>
      <DateNav date={day} today={plan.today} />
      <div className="today-grid">
        <div className="today-aside">
          <DaySummary totals={dayPlan.totals} kcalTarget={profile.kcalTarget} proteinTarget={profile.proteinTarget} headingId="day-summary" />
          <div className={`day-note${status === 'in' && !dayPlan.unfilled.length ? '' : ' day-note-warn'}`}>
            {notes.map((n) => (
              <p key={n}>{n}</p>
            ))}
          </div>
          <p className="fine-print today-fine-print">{t('common.estimates')}</p>
        </div>
        <section className="today-meals" aria-labelledby="meals-h">
          <div className="section-head">
            <h2 id="meals-h" className="section-title">
              {t('today.meals')}
            </h2>
            {overrides.length ? (
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => {
                  dispatch({ type: 'clearDay', date: day });
                  notify(t('today.restoredDay'));
                }}
              >
                <Icon name="restart" size={20} />
                {t('today.restoreDay')}
              </button>
            ) : null}
          </div>
          <ol className="meal-list">
            {rows.map((row) => {
              const label = dayMealName(dayPlan, row.slot, row.index);
              if (row.kind === 'unfilled') {
                return (
                  <li key={`${row.slot}-${row.index}`}>
                    <UnfilledCard slot={row.slot} index={row.index} label={label} dayPlan={dayPlan} />
                  </li>
                );
              }
              const recipe = lib.byId.get(row.meal.recipeId);
              if (!recipe) return null;
              const pick = pickFor(row.slot, row.index, recipe.id);
              const added = isAddedMeal(profile, row.slot, row.index);
              return (
                <li key={`${row.slot}-${row.index}`}>
                  <MealCard
                    meal={row.meal}
                    recipe={recipe}
                    date={day}
                    label={label}
                    profile={profile}
                    overridden={!!pick}
                    added={added}
                    conflict={pick ? recipeConflict(recipe, profile) : null}
                    favorite={state.favorites.includes(recipe.id)}
                    onSwap={() => setSwap({ date: day, slot: row.slot, index: row.index, label })}
                    onRestore={() => {
                      dispatch({ type: 'clearOverride', date: day, slot: row.slot, index: row.index });
                      const undo = pick ? { label: t('common.undo'), run: () => dispatch({ type: 'override', override: pick }) } : undefined;
                      notify(t(added ? 'meal.removed' : 'swap.restored', { slot: label }), undo);
                    }}
                    onToggleFavorite={() => toggleFavorite(recipe.id, recipe.name)}
                  />
                </li>
              );
            })}
          </ol>
        </section>
      </div>
      <SwapSheet target={swap} onClose={() => setSwap(null)} />
    </>
  );
}
