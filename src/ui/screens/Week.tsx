import { addDays, weekDates } from '../../lib/dates.ts';
import type { ISODate } from '../../lib/dates.ts';
import { t, tp } from '../../i18n/index.ts';
import { dateSpan, dayMonth, num, relativeName, weekdayName } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { usePlan } from '../plan.tsx';
import { navigate, routeHash } from '../router.ts';
import { dayMealName, planningWeek } from '../planHelpers.ts';
import { kcalStatus } from '../components/DaySummary.tsx';
import { Icon } from '../components/Icon.tsx';

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
  // Stepping weeks replaces the history entry, like stepping days on Today.
  const goWeek = (d: ISODate) => navigate({ name: 'week', date: weekDates(d, weekStart)[0] === home[0] ? null : d }, { replace: true });
  const homeLabel = home.includes(plan.today) ? t('week.thisWeek') : t('week.nextWeek');

  return (
    <>
      <header className="screen-head date-nav">
        <button type="button" className="icon-btn nav-arrow" onClick={() => goWeek(addDays(first, -7))} aria-label={t('week.prev')}>
          <Icon name="chevronLeft" className="flip-rtl" />
        </button>
        <div className="date-nav-title">
          <div className="date-nav-eyebrow">
            {thisWeek || nextWeek ? <p className="eyebrow">{thisWeek ? t('week.thisWeek') : t('week.nextWeek')}</p> : null}
            {!atHome ? (
              <button type="button" className="pill today-pill" onClick={() => goWeek(home[0] as ISODate)}>
                {homeLabel}
              </button>
            ) : null}
          </div>
          <h1 tabIndex={-1} className="screen-title">
            {dateSpan(first, last)}
          </h1>
        </div>
        <button type="button" className="icon-btn nav-arrow" onClick={() => goWeek(addDays(first, 7))} aria-label={t('week.next')}>
          <Icon name="chevronRight" className="flip-rtl" />
        </button>
      </header>

      <p className="week-average">
        <span className="eyebrow">{t('week.average')}</span>
        <span className="num">{t('week.averageValue', { kcal: num(avgKcal), protein: num(avgProtein) })}</span>
      </p>
      <ol className="week-grid">
        {plans.map((p) => {
          const status = kcalStatus(p.totals.kcal, target);
          const isToday = p.date === plan.today;
          const past = p.date < plan.today;
          const fill = Math.min(100, (p.totals.kcal / (target * 1.25)) * 100);
          const rel = relativeName(p.date, plan.today);
          const gap = num(Math.abs(Math.round(p.totals.kcal) - target));
          return (
            <li key={p.date} className={`day-card card${isToday ? ' is-today' : ''}${past ? ' is-past' : ''}`}>
              <h2 className="day-card-title">
                <a className="stretched" href={routeHash({ name: 'today', date: isToday ? null : p.date })}>
                  <span className="day-card-week">{rel ?? weekdayName(p.date, 'long')}</span>
                  <span className="day-card-date">{dayMonth(p.date)}</span>
                  {rel ? <span className="visually-hidden">{t('week.alsoWeekday', { weekday: weekdayName(p.date, 'long') })}</span> : null}
                </a>
              </h2>
              <p className="day-card-kcal num">
                <span className={`dot-status status-dot-${status}`} aria-hidden="true" />
                {t('value.kcal', { n: num(p.totals.kcal) })}
                <span className={`day-card-status status-text-${status}`}>{status === 'in' ? t('week.status.in') : t(`week.status.${status}`, { n: gap })}</span>
              </p>
              <div className="mini-meter" aria-hidden="true">
                <span className={`meter-fill meter-${status}`} style={{ inlineSize: `${fill}%` }} />
              </div>
              <ul className="day-meals">
                {p.meals.map((m) => (
                  <li key={`${m.slot}-${m.index}`}>
                    <span className="day-meal-slot">{dayMealName(p, m.slot, m.index)}</span>
                    <span className="day-meal-name">{lib.byId.get(m.recipeId)?.name ?? ''}</span>
                  </li>
                ))}
              </ul>
              {p.unfilled.length ? <p className="day-card-warn">{tp('week.unfilled', p.unfilled.length)}</p> : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}
