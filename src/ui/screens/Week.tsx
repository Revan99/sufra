import { addDays, diffDays, weekDates } from '../../lib/dates.ts';
import type { ISODate } from '../../lib/dates.ts';
import { intlLocale, t, tp } from '../../i18n/index.ts';
import { dateSpan, dayMonth, num, weekdayName } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { usePlan } from '../plan.tsx';
import { navigate, routeHash } from '../router.ts';
import { dayMealName, planningWeek } from '../planHelpers.ts';
import { kcalStatus } from '../dayStatus.ts';
import { Icon } from '../components/Icon.tsx';
import { PageHead } from '../components/PageHead.tsx';
import { RecipeImage } from '../components/RecipeImage.tsx';

/** "18–24 October": the week's span with the month written out (the short span when Intl can't do ranges). */
function longSpan(start: ISODate, end: ISODate): string {
  const [a, b] = [start, end].map((d) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1, day ?? 1, 12));
  });
  try {
    return new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'long', timeZone: 'UTC' }).formatRange(a as Date, b as Date);
  } catch {
    return dateSpan(start, end);
  }
}

/** The photo stack shows at most this many meals; the rest are in the list beside it. */
const STACK = 4;

/**
 * Seven days with their meals and kcal. It opens on the planning week: this week, or next week once this one is
 * nearly over (the same rollover as the shopping list's week), and ‹ › step a week at a time.
 */
export function WeekScreen({ date }: { date: ISODate | null }) {
  const { state } = useAppState();
  const lib = useLibrary();
  const plan = usePlan();
  const weekStart = state.profile.weekStart;
  const home = planningWeek(plan.today, weekStart);
  const dates = date ? weekDates(date, weekStart) : home;
  const first = dates[0] as ISODate;
  const last = dates[6] as ISODate;
  const thisWeek = dates.includes(plan.today);
  const nextWeek = !thisWeek && first === addDays(weekDates(plan.today, weekStart)[6] as ISODate, 1);
  const atHome = first === home[0];
  const plans = dates.map((d) => plan.day(d));
  const target = state.profile.kcalTarget;
  const filled = plans.filter((p) => p.meals.length > 0);
  const avgKcal = filled.length ? filled.reduce((s, p) => s + p.totals.kcal, 0) / filled.length : 0;
  const avgProtein = filled.length ? filled.reduce((s, p) => s + p.totals.protein, 0) / filled.length : 0;
  const maxKcal = Math.max(1, ...plans.map((p) => p.totals.kcal));
  // Stepping weeks replaces the history entry, like stepping days on Today.
  const goWeek = (d: ISODate) => navigate({ name: 'week', date: weekDates(d, weekStart)[0] === home[0] ? null : d }, { replace: true });
  const homeIsThisWeek = home.includes(plan.today);

  const title = thisWeek ? t('week.thisWeek') : nextWeek ? t('week.nextWeek') : dateSpan(first, last);
  const away = Math.round(diffDays(home[0] as ISODate, first) / 7);
  const subText = thisWeek || nextWeek ? longSpan(first, last) : away > 0 ? tp('week.weeksAhead', away) : tp('week.weeksAgo', -away);

  return (
    <>
      <PageHead
        className="week-head"
        sub={
          <>
            <span>{subText}</span>
            {!atHome ? (
              <button type="button" className="week-home" onClick={() => goWeek(home[0] as ISODate)}>
                {homeIsThisWeek ? t('week.backToThis') : t('week.backToNext')}
              </button>
            ) : null}
          </>
        }
        title={title}
      >
        <div className="capsule glass week-capsule">
          <button type="button" className="icon-btn week-step" onClick={() => goWeek(addDays(first, -7))} aria-label={t('week.prev')}>
            <Icon name="chevronLeft" size={19} className="flip-rtl" />
          </button>
          <button type="button" className="icon-btn week-step" onClick={() => goWeek(addDays(first, 7))} aria-label={t('week.next')}>
            <Icon name="chevronRight" size={19} className="flip-rtl" />
          </button>
        </div>
      </PageHead>

      <section className="card week-avg" aria-labelledby="week-avg-label">
        <span className="week-avg-icon" aria-hidden="true">
          <Icon name="bars" size={20} />
        </span>
        <p className="week-avg-text">
          <span id="week-avg-label" className="week-avg-label">
            {t('week.average')}
          </span>
          <span className="week-avg-value num">{t('week.averageValue', { kcal: num(avgKcal), protein: num(avgProtein) })}</span>
        </p>
        <span className="week-bars" aria-hidden="true">
          {plans.map((p) => (
            <span
              key={p.date}
              className={`week-bar${p.date === plan.today ? ' is-today' : ''}`}
              style={{ blockSize: `${Math.max(4, Math.round((p.totals.kcal / maxKcal) * 36))}px` }}
            />
          ))}
        </span>
      </section>

      <ol className="week-days" aria-label={t('week.days')}>
        {plans.map((p) => {
          const status = kcalStatus(p.totals.kcal, target);
          const isToday = p.date === plan.today;
          const past = p.date < plan.today;
          const gap = num(Math.abs(Math.round(p.totals.kcal) - target));
          const recipes = p.meals.map((m) => ({ meal: m, recipe: lib.byId.get(m.recipeId) }));
          const stack = recipes.filter((r) => r.recipe).slice(0, STACK);
          return (
            <li key={p.date} className={`week-day${isToday ? ' is-today' : ''}${past ? ' is-past' : ''}`}>
              <div className="week-day-text">
                <div className="week-day-row">
                  <h2 className="week-day-name">
                    <a className="stretched" href={routeHash({ name: 'today', date: isToday ? null : p.date })}>
                      {weekdayName(p.date, 'long')}
                    </a>
                  </h2>
                  {isToday ? <span className="pill pill-solid week-today">{t('day.today')}</span> : null}
                </div>
                <p className="week-day-kcal">
                  <span className="week-day-date">
                    {dayMonth(p.date)}
                    <span aria-hidden="true">{t('common.sep')}</span>
                  </span>
                  <span className="week-day-value num">{t('value.kcal', { n: num(p.totals.kcal) })}</span>
                  <span className={`pill ${status === 'in' ? 'pill-on' : 'pill-off'}`}>
                    {status === 'in' ? t('week.status.in') : t(`week.status.${status}`, { n: gap })}
                  </span>
                </p>
                {p.meals.length ? (
                  <ul className="week-day-meals" aria-label={t('week.meals')}>
                    {recipes.map(({ meal, recipe }) => (
                      <li key={`${meal.slot}-${meal.index}`}>
                        <span className="visually-hidden">{dayMealName(p, meal.slot, meal.index)}: </span>
                        {recipe?.name ?? ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="week-day-meals">{t('week.noMeals')}</p>
                )}
                {p.unfilled.length ? <p className="week-day-warn">{tp('week.unfilled', p.unfilled.length)}</p> : null}
              </div>
              {stack.length ? (
                <span className="week-stack" aria-hidden="true">
                  {stack.map(({ meal, recipe }) =>
                    recipe ? <RecipeImage key={`${meal.slot}-${meal.index}`} recipe={recipe} kind="meal" sizes="36px" plateSize={36} className="week-stack-img" /> : null,
                  )}
                </span>
              ) : null}
              <Icon name="chevronRight" size={16} className="week-day-chevron flip-rtl" />
            </li>
          );
        })}
      </ol>
    </>
  );
}
