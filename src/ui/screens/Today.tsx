// Today: the next meal over its photo, what's been eaten (ring, protein, fiber), water, and the day's meals to tick
// off as eaten or skipped, with extra foods logged in between. Wide screens add the planned day, the week and the
// shopping list beside it, and tomorrow's meals below. Future days show the plan instead of the tracker.
import { useMemo, useState } from 'react';
import type { MealSlot, PlannedMeal } from '../../types.ts';
import { addDays, weekDates } from '../../lib/dates.ts';
import type { ISODate } from '../../lib/dates.ts';
import { buildShoppingList, shoppingDates } from '../../lib/shopping.ts';
import { shoppingCheckedIds } from '../../lib/storage.ts';
import { dayLog, dayTotals, mealLog } from '../../lib/tracker.ts';
import type { FoodLog } from '../../lib/tracker.ts';
import { intlLocale, t, tp } from '../../i18n/index.ts';
import { longDate, relativeName, unitWord } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { usePlan } from '../plan.tsx';
import { dayMealName } from '../planHelpers.ts';
import { Icon } from '../components/Icon.tsx';
import { useToast } from '../components/Toast.tsx';
import { SwapSheet } from '../sheets/SwapSheet.tsx';
import type { SwapTarget } from '../sheets/SwapSheet.tsx';
import { LogFoodSheet } from '../sheets/LogFoodSheet.tsx';
import { featuredMeal, mealSnapshot, statusOf } from '../tracking.ts';
import { useMediaQuery, WIDE_QUERY } from '../useMediaQuery.ts';
import { DateCapsule, EatenCard, Hero, PlanCard, ShopCard, TomorrowRow, WaterCard, WeekCard } from '../today/TodayParts.tsx';
import { MealList, MealTiles, buildRows } from '../today/Meals.tsx';
import type { MealActions } from '../today/Meals.tsx';

/** The meal to log extra food to: the next one by the clock. */
function slotByClock(now: Date = new Date()): MealSlot {
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < 10.5) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 17.5) return 'snack';
  return 'dinner';
}

export function TodayScreen({ date }: { date: ISODate | null }) {
  const { state, dispatch } = useAppState();
  const lib = useLibrary();
  const plan = usePlan();
  const notify = useToast();
  const wide = useMediaQuery(WIDE_QUERY);
  const [swap, setSwap] = useState<SwapTarget | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const today = plan.today;
  const day = date ?? today;
  const dayPlan = plan.day(day);
  const profile = state.profile;
  const log = dayLog(state.tracker, day);
  const totals = dayTotals(state.tracker.days[day]);
  const canLog = day <= today;
  const canSwap = day >= today;
  const overrides = state.overrides.filter((o) => o.date === day);
  const recipeOf = (id: string) => lib.byId.get(id);
  const labelOf = (slot: MealSlot, index: number) => dayMealName(dayPlan, slot, index);

  const featured = featuredMeal(dayPlan, canLog ? log : { meals: [], foods: [], water: 0 });
  const heroMeal = featured?.meal ?? null;
  const heroRecipe = heroMeal ? (recipeOf(heroMeal.recipeId) ?? null) : null;

  const rows = buildRows({
    plan: dayPlan,
    foods: canLog ? log.foods : [],
    recipeOf,
    labelOf,
    logOf: (m) => (canLog ? statusOf(log, m) : undefined),
    pickedOf: (m) => overrides.some((o) => o.slot === m.slot && o.index === m.index && o.recipeId === m.recipeId),
  });

  const openSwap = (m: PlannedMeal) => setSwap({ date: day, slot: m.slot, index: m.index, label: labelOf(m.slot, m.index) });

  const actions: MealActions = {
    canLog,
    canSwap,
    onSwap: (row) => openSwap(row.meal),
    onCycle: (row) => {
      const prev = mealLog(log, row.meal.slot, row.meal.index);
      const current = row.log?.status;
      const undo = { label: t('common.undo'), run: () => dispatch({ type: 'mealStatus', date: day, log: prev ?? { slot: row.meal.slot, index: row.meal.index, status: null } }) };
      if (!current) {
        dispatch({ type: 'mealStatus', date: day, log: mealSnapshot(row.meal, row.recipe, 'eaten') });
        notify(t('track.didEat', { slot: row.label }), undo);
      } else if (current === 'eaten') {
        dispatch({ type: 'mealStatus', date: day, log: mealSnapshot(row.meal, row.recipe, 'skipped') });
        notify(t('track.didSkip', { slot: row.label }), undo);
      } else {
        dispatch({ type: 'mealStatus', date: day, log: { slot: row.meal.slot, index: row.meal.index, status: null } });
        notify(t('track.didReset', { slot: row.label }), undo);
      }
    },
    onRemoveFood: (food: FoodLog) => {
      dispatch({ type: 'removeFood', date: day, id: food.id });
      notify(t('track.foodRemoved', { name: food.name }), { label: t('common.undo'), run: () => dispatch({ type: 'logFood', date: day, food }) });
    },
  };

  const mealKcal = (m: PlannedMeal) => (recipeOf(m.recipeId)?.perServing.kcal ?? 0) * m.portion;
  const initialSlot = (featured && !featured.done ? featured.meal.slot : null) ?? slotByClock();
  const heading = relativeName(day, today) ?? longDate(day);
  const notes = dayPlan.unfilled.length ? tp('track.dayNote.unfilled', dayPlan.unfilled.length) : null;

  const mealsHead = (
    <div className="meals-head">
      <h2 className="section-title" id="meals-h">
        {day === today ? t('track.meals') : t('track.mealsOn')}
      </h2>
      {canLog ? (
        <button type="button" className="btn btn-sm glass log-food-btn" onClick={() => setLogOpen(true)}>
          <Icon name="plus" size={15} />
          {t('track.logFood')}
        </button>
      ) : null}
    </div>
  );
  const restore = overrides.length ? (
    <button
      type="button"
      className="btn btn-plain btn-sm restore-day"
      onClick={() => {
        const before = overrides;
        dispatch({ type: 'clearDay', date: day });
        notify(t('track.restoredDay'), { label: t('common.undo'), run: () => before.forEach((o) => dispatch({ type: 'override', override: o })) });
      }}
    >
      <Icon name="restart" size={16} />
      {t('track.restoreDay')}
    </button>
  ) : null;
  const trackerCards = canLog ? (
    <>
      <EatenCard totals={totals} kcalTarget={profile.kcalTarget} proteinTarget={profile.proteinTarget} />
      <WaterCard glasses={totals.water} goal={state.tracker.waterGoal} onSet={(n) => dispatch({ type: 'water', date: day, glasses: n })} />
    </>
  ) : null;
  const sheets = (
    <>
      <SwapSheet target={swap} onClose={() => setSwap(null)} />
      <LogFoodSheet open={logOpen} date={day} initialSlot={initialSlot} onClose={() => setLogOpen(false)} />
    </>
  );

  if (!wide) {
    return (
      <div className="today">
        <h1 tabIndex={-1} className="visually-hidden">
          {heading}
        </h1>
        <Hero meal={heroMeal} recipe={heroRecipe} label={heroMeal ? labelOf(heroMeal.slot, heroMeal.index) : ''} date={day} today={today} done={featured?.done ?? false} wide={false} onSwap={() => heroMeal && openSwap(heroMeal)} />
        <div className="today-content">
          {trackerCards ?? <PlanCard plan={dayPlan} kcalTarget={profile.kcalTarget} proteinTarget={profile.proteinTarget} layout="row" mealKcal={mealKcal} />}
          <section className="today-meals" aria-labelledby="meals-h">
            {mealsHead}
            <MealList rows={rows} date={day} dayPlan={dayPlan} profile={profile} actions={actions} />
            {restore}
          </section>
          {notes ? <p className="fine-print today-note">{notes}</p> : null}
          <p className="fine-print today-note">{t('common.estimates')}</p>
        </div>
        {sheets}
      </div>
    );
  }

  return (
    <div className="today today-wide">
      <header className="page-head today-head">
        <div className="page-head-text">
          <p className="page-sub">{longDate(day)}</p>
          <h1 tabIndex={-1} className="page-title">
            {relativeName(day, today) ?? t('track.future')}
          </h1>
        </div>
        <div className="page-head-end">
          <DateCapsule date={day} today={today} variant="page" />
          <a className="search-field glass today-search" href="#/search">
            <Icon name="search" size={17} />
            <span>{t('nav.search')}</span>
          </a>
        </div>
      </header>
      <div className="today-body">
        <div className="today-main">
          <Hero meal={heroMeal} recipe={heroRecipe} label={heroMeal ? labelOf(heroMeal.slot, heroMeal.index) : ''} date={day} today={today} done={featured?.done ?? false} wide onSwap={() => heroMeal && openSwap(heroMeal)} />
          <section className="today-meals" aria-labelledby="meals-h">
            {mealsHead}
            <MealTiles rows={rows} date={day} dayPlan={dayPlan} profile={profile} actions={actions} />
            {restore}
          </section>
          <TomorrowRow plan={plan.day(addDays(day, 1))} today={today} recipeOf={recipeOf} labelOf={(m) => dayMealName(plan.day(addDays(day, 1)), m.slot, m.index)} />
          {notes ? <p className="fine-print">{notes}</p> : null}
          <p className="fine-print">{t('common.estimates')}</p>
        </div>
        <aside className="today-side">
          {trackerCards}
          <PlanCard plan={dayPlan} kcalTarget={profile.kcalTarget} proteinTarget={profile.proteinTarget} layout="list" mealKcal={mealKcal} />
          <WeekCard days={weekDates(day, profile.weekStart).map((d) => plan.day(d))} current={day} />
          <ShoppingPreview />
        </aside>
      </div>
      {sheets}
    </div>
  );
}

/** The week's shopping list, in short: how much is ticked and the next three things to buy. */
function ShoppingPreview() {
  const { state, dispatch } = useAppState();
  const lib = useLibrary();
  const plan = usePlan();
  const dates = shoppingDates('week', plan.today, state.profile.weekStart);
  const first = dates[0] as ISODate;
  const through = dates[dates.length - 1] as ISODate;
  const household = state.profile.householdSize;
  const list = useMemo(
    () => buildShoppingList(dates.map((d) => plan.day(d)), lib.byId, lib.ingredientIndex, household, { locale: intlLocale(), unitLabel: unitWord }),
    // dates is rebuilt each render; first and through identify it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, lib, household, first, through],
  );
  const checked = new Set(shoppingCheckedIds(state, through));
  const all = list.groups.flatMap((g) => g.items);
  const items = all.filter((i) => !checked.has(i.ingredientId)).slice(0, 3);
  if (!all.length) return null;
  return (
    <ShopCard
      done={all.filter((i) => checked.has(i.ingredientId)).length}
      total={all.length}
      items={items.map((i) => ({ id: i.ingredientId, name: i.name, amount: i.amount }))}
      onToggle={(id) => dispatch({ type: 'shopToggle', ingredientId: id, through })}
    />
  );
}

