// Progress: streak, averages, calories eaten, weight trend, calendar and history (built from lib/tracker.ts).
// Phones show the streak, three stat tiles, the calories chart and the weight card. From 1000px the header gets
// full range names and a Log weight button, a fourth tile, planned bars beside the eaten ones, the month calendar,
// water and the recent days table. Every chart has a visually hidden table with the same numbers.
import { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { WeekStart } from '../../types.ts';
import type { ISODate } from '../../lib/dates.ts';
import { addDays, formatDate, parseISODate } from '../../lib/dates.ts';
import { dayStatus, dayTotals, latestWeight, rangeStats, statusOn, streak, toUnit, weightChange, weightsBetween } from '../../lib/tracker.ts';
import type { DayStatus, Tracker, WeightUnit } from '../../lib/tracker.ts';
import { PROGRESS_RANGES, WEIGHT_WINDOW_DAYS, chartBars, chartMax, historyDates, labelledInMonth, monthGrid, rangeDates, weightLine, weightOn } from '../../lib/progress.ts';
import type { BarTone, ChartBar, ProgressRange } from '../../lib/progress.ts';
import { intlLocale, t, tp } from '../../i18n/index.ts';
import { grams, num, shortDate, weekdayName } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { usePlan } from '../plan.tsx';
import { PageHead } from '../components/PageHead.tsx';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import { LogWeightSheet, signed1, weightText } from '../sheets/LogWeightSheet.tsx';

/** Rows the recent days table shows before "See all history". */
const HISTORY_ROWS = 7;
/** The weight chart's drawing box (the SVG stretches to the card; the stroke doesn't scale). */
const CHART_W = 326;
const CHART_H = 90;

export function ProgressScreen() {
  const { state } = useAppState();
  const plan = usePlan();
  const today = plan.today;
  const { tracker, profile } = state;
  const target = profile.kcalTarget;
  const [range, setRange] = useState<ProgressRange>('week');
  const [logOpen, setLogOpen] = useState(false);

  const dates = useMemo(() => rangeDates(range, today), [range, today]);
  // Today is still in progress: it counts toward the averages only once it's on target, so a half-eaten day
  // doesn't drag them down.
  const stats = useMemo(() => {
    const counted = statusOn(tracker, today, target) === 'on' ? dates : dates.filter((d) => d !== today);
    return { ...rangeStats(tracker, counted, target), days: dates.length };
  }, [tracker, dates, target, today]);
  const bars = useMemo(() => chartBars(range, today, tracker, target, (d) => plan.day(d).totals.kcal), [range, today, tracker, target, plan]);
  const run = useMemo(() => streak(tracker, today, target), [tracker, today, target]);
  const openLog = () => setLogOpen(true);

  return (
    <>
      <PageHead
        className="pg-head"
        title={t('progress.title')}
        sub={
          <>
            <span className="pg-narrow">{t(`progress.sub.${range}`)}</span>
            <span className="pg-wide">{spanLabel(range, dates[0]!, today)}</span>
          </>
        }
      >
        <RangeControl value={range} onChange={setRange} />
        <button type="button" className="btn btn-accent pg-wide pg-log-btn" onClick={openLog}>
          <Icon name="scale" size={17} />
          {t('progress.logWeight')}
        </button>
      </PageHead>

      <div className="pg-row pg-row-1">
        <StreakCard current={run.current} since={run.since} best={run.best} today={today} />
        <div className="pg-stats">
          <StatTile icon="flame" tone="accent" value={stats.loggedDays ? num(stats.avgKcal) : null} label={t('progress.stat.kcal')} />
          <StatTile icon="beef" tone="protein" value={stats.loggedDays ? grams(Math.round(stats.avgProtein)) : null} label={t('progress.stat.protein')} />
          <StatTile
            icon="droplet"
            tone="water"
            value={stats.avgWater ? num(stats.avgWater, 1) : null}
            label={
              <>
                <span className="pg-narrow">{t('progress.stat.water')}</span>
                <span className="pg-wide">{t('progress.stat.waterWide')}</span>
              </>
            }
          />
          <StatTile
            className="pg-wide"
            icon="target"
            tone="teal"
            value={stats.loggedDays ? t('progress.stat.onTargetValue', { n: stats.onTarget, total: stats.days }) : null}
            label={t('progress.stat.onTarget')}
          />
        </div>
      </div>

      <div className="pg-row pg-row-2">
        <CaloriesCard range={range} bars={bars} target={target} />
        <WeightCard range={range} tracker={tracker} today={today} goal={profile.body?.goal} onLog={openLog} />
      </div>

      <div className="pg-row pg-row-3 pg-wide">
        <CalendarCard tracker={tracker} today={today} target={target} weekStart={profile.weekStart} />
        <WaterCard range={range} bars={bars} goal={tracker.waterGoal} />
      </div>

      <HistoryCard tracker={tracker} today={today} target={target} plannedFor={(d) => plan.day(d).totals.kcal} />

      <LogWeightSheet open={logOpen} onClose={() => setLogOpen(false)} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Header

/** "12–18 October", "19 September – 18 October", "November 2025 – October 2026". */
function spanLabel(range: ProgressRange, start: ISODate, end: ISODate): string {
  const opts: Intl.DateTimeFormatOptions = range === 'year' ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' };
  const a = utcNoon(start);
  const b = utcNoon(end);
  try {
    return new Intl.DateTimeFormat(intlLocale(), { ...opts, timeZone: 'UTC' }).formatRange(a, b);
  } catch {
    return t('common.range', { start: formatDate(start, intlLocale(), opts), end: formatDate(end, intlLocale(), opts) });
  }
}

function utcNoon(date: ISODate): Date {
  const p = parseISODate(date) ?? { year: 2000, month: 1, day: 1 };
  const d = new Date(Date.UTC(2000, p.month - 1, p.day, 12));
  d.setUTCFullYear(p.year);
  return d;
}

/**
 * Week · Month · Year as a radio group in a glass capsule with a dark thumb: "W M Y" on phones, the full words from
 * 1000px. The full word is always the radio's name. (The markup and classes of controls.tsx's Segmented.)
 */
function RangeControl({ value, onChange }: { value: ProgressRange; onChange: (r: ProgressRange) => void }) {
  const group = useId();
  return (
    <div className="segmented-ink pg-range glass">
      <fieldset className="segmented">
        <legend className="visually-hidden">{t('progress.range')}</legend>
        <div className="segmented-track">
          {PROGRESS_RANGES.map((r) => (
            <label key={r} className="segmented-option">
              <input type="radio" name={group} value={r} checked={r === value} onChange={() => onChange(r)} />
              <span className="pg-narrow" aria-hidden="true">
                {t(`progress.rangeShort.${r}`)}
              </span>
              <span className="pg-range-long">{t(`progress.range.${r}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Streak and stat tiles

function StreakCard({ current, since, best, today }: { current: number; since: ISODate | null; best: number; today: ISODate }) {
  let title: string;
  let body: string;
  if (current > 0 && since) {
    title = tp('progress.streak.days', current);
    const bestText = best > current ? tp('progress.streak.best', best) : current > 1 ? t('progress.streak.bestYet') : '';
    if (current > 1) body = `${t('progress.streak.since', { date: formatDate(since, intlLocale(), { day: 'numeric', month: 'long' }) })} ${bestText}`;
    else if (since === today) body = `${t('progress.streak.today')} ${bestText}`.trim();
    else body = t('progress.streak.yesterday');
  } else if (best > 0) {
    title = t('progress.streak.broken');
    body = tp('progress.streak.brokenBody', best);
  } else {
    title = t('progress.streak.none');
    body = t('progress.streak.noneBody');
  }
  return (
    <section className="pg-streak">
      <span className="pg-streak-badge" aria-hidden="true">
        <Icon name="flame" size={26} />
      </span>
      <div className="pg-streak-text">
        <h2 className="pg-streak-title">{title}</h2>
        <p className="pg-streak-body">{body}</p>
      </div>
    </section>
  );
}

function StatTile({ icon, tone, value, label, className }: { icon: IconName; tone: string; value: string | null; label: ReactNode; className?: string }) {
  return (
    <div className={`pg-stat${className ? ` ${className}` : ''}`}>
      <Icon name={icon} size={16} className={`pg-stat-icon pg-tone-${tone}`} />
      <p className="pg-stat-value num">{value ?? t('progress.none')}</p>
      <p className="pg-stat-label">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Charts

/** The label under a bar: weekday, a day number every 7th day of a month, or the month. */
function BarLabel({ range, bar, index, count }: { range: ProgressRange; bar: ChartBar; index: number; count: number }) {
  if (range === 'week') return <>{weekdayName(bar.date, 'short')}</>;
  if (range === 'month') return labelledInMonth(index, count) ? <>{num(parseISODate(bar.date)?.day ?? 0)}</> : null;
  return (
    <>
      <span className="pg-narrow">{formatDate(bar.date, intlLocale(), { month: 'narrow' })}</span>
      <span className="pg-wide">{formatDate(bar.date, intlLocale(), { month: 'short' })}</span>
    </>
  );
}

const barDateLabel = (bar: ChartBar) => (bar.month ? formatDate(bar.date, intlLocale(), { month: 'long', year: 'numeric' }) : shortDate(bar.date));

function toneLabel(tone: BarTone): string {
  return t(`progress.status.${tone}`);
}

function CaloriesCard({ range, bars, target }: { range: ProgressRange; bars: ChartBar[]; target: number }) {
  const titleId = useId();
  const max = chartMax(bars, target);
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / max) * 100))}%`;
  return (
    <section className={`card pg-card pg-cal pg-range-${range}`} aria-labelledby={titleId}>
      <header className="pg-card-head">
        <h2 id={titleId} className="pg-card-title">
          <span className="pg-narrow">{t('progress.cal.title')}</span>
          <span className="pg-wide">{t('progress.cal.titleWide')}</span>
        </h2>
        <p className="pg-card-note num">
          <span className="pg-narrow">{t('progress.cal.target', { n: num(target) })}</span>
          <span className="pg-wide">{t('progress.cal.targetWide', { n: num(target) })}</span>
        </p>
      </header>
      <div className="pg-bars" aria-hidden="true">
        {bars.map((b, i) => (
          <div key={b.date} className={`pg-col${b.current ? ' is-current' : ''}`}>
            <div className="pg-col-area">
              {b.planned !== null ? <span className="pg-bar pg-bar-planned" style={{ blockSize: pct(b.planned) }} /> : <span className="pg-bar pg-bar-planned pg-bar-stub" />}
              {b.eaten !== null && b.eaten > 0 ? (
                <span className={`pg-bar pg-bar-eaten pg-tone-${b.tone}`} style={{ blockSize: pct(b.eaten) }} />
              ) : (
                <span className="pg-bar pg-bar-eaten pg-bar-stub" />
              )}
            </div>
            <span className="pg-col-label">
              <BarLabel range={range} bar={b} index={i} count={bars.length} />
            </span>
          </div>
        ))}
      </div>
      <table className="visually-hidden">
        <caption>{t(range === 'year' ? 'progress.cal.captionYear' : 'progress.cal.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t(range === 'year' ? 'progress.col.month' : 'progress.col.day')}</th>
            <th scope="col">{t('progress.col.eaten')}</th>
            <th scope="col">{t('progress.col.planned')}</th>
            <th scope="col">{t('progress.col.status')}</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((b) => (
            <tr key={b.date}>
              <th scope="row">{barDateLabel(b)}</th>
              <td>{b.eaten !== null ? t('value.kcal', { n: num(b.eaten) }) : t('progress.none')}</td>
              <td>{b.planned !== null ? t('value.kcal', { n: num(b.planned) }) : t('progress.none')}</td>
              <td>{toneLabel(b.tone)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function WaterCard({ range, bars, goal }: { range: ProgressRange; bars: ChartBar[]; goal: number }) {
  const titleId = useId();
  return (
    <section className={`card pg-card pg-water pg-range-${range}`} aria-labelledby={titleId}>
      <header className="pg-card-head">
        <h2 id={titleId} className="pg-card-title pg-water-title">
          <Icon name="droplet" size={16} className="pg-tone-water" />
          {t('progress.water.title')}
        </h2>
        <p className="pg-card-note">{t('progress.water.goal', { n: goal })}</p>
      </header>
      <div className="pg-bars pg-water-bars" aria-hidden="true">
        {bars.map((b, i) => (
          <div key={b.date} className={`pg-col${b.current ? ' is-current' : ''}`}>
            <div className="pg-col-area">
              {b.water > 0 ? (
                <span className={`pg-bar pg-bar-water${b.water >= goal ? ' is-full' : ''}`} style={{ blockSize: `${Math.min(1, b.water / goal) * 88}%` }} />
              ) : (
                <span className="pg-bar pg-bar-water pg-bar-stub" />
              )}
            </div>
            <span className="pg-col-label">{range === 'week' ? weekdayName(b.date, 'narrow') : <BarLabel range={range} bar={b} index={i} count={bars.length} />}</span>
          </div>
        ))}
      </div>
      <table className="visually-hidden">
        <caption>{t(range === 'year' ? 'progress.water.captionYear' : 'progress.water.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t(range === 'year' ? 'progress.col.month' : 'progress.col.day')}</th>
            <th scope="col">{t('progress.col.water')}</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((b) => (
            <tr key={b.date}>
              <th scope="row">{barDateLabel(b)}</th>
              <td>{tp('progress.glasses', b.water, { n: num(b.water, 1) })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Weight

function changeText(change: number, unit: WeightUnit, range: ProgressRange): string {
  const shown = Math.round(toUnit(change, unit) * 10) / 10;
  const days = WEIGHT_WINDOW_DAYS[range];
  if (shown === 0) return range === 'year' ? t('progress.weight.sameYear') : t('progress.weight.sameDays', { n: days });
  const value = t(unit === 'lb' ? 'progress.weight.lb' : 'progress.weight.kg', { n: signed1(shown) });
  return range === 'year' ? t('progress.weight.changeYear', { change: value }) : t('progress.weight.changeDays', { change: value, n: days });
}

function WeightCard({ range, tracker, today, goal, onLog }: { range: ProgressRange; tracker: Tracker; today: ISODate; goal?: string; onLog: () => void }) {
  const titleId = useId();
  const gradId = `pg-wg-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const unit = tracker.unit;
  const last = latestWeight(tracker);
  const days = WEIGHT_WINDOW_DAYS[range];
  const from = addDays(today, -days);
  const points = weightsBetween(tracker, from, today);
  // The line spans the weights it has (from the first one in the window to today), so a short history still fills
  // the card.
  const line = weightLine(points, points[0]?.date ?? from, today, CHART_W, CHART_H, 8);
  const change = weightChange(tracker, days);
  // Teal when the change goes the way the goal does (losing, unless the goal is to gain).
  const good = change === null || (goal === 'gain' ? change >= 0 : change <= 0);
  const first = points[0];
  const end = points[points.length - 1];

  const logButton = (
    <button type="button" className="btn btn-sm glass pg-weight-log" onClick={onLog} aria-label={t('progress.logWeight')}>
      <Icon name="plus" size={15} />
      {t('progress.weight.log')}
    </button>
  );

  return (
    <section className="card pg-card pg-weight" aria-labelledby={titleId}>
      <header className="pg-weight-head">
        <div className="pg-weight-text">
          <h2 id={titleId} className="pg-card-title">
            {t('progress.weight.title')}
          </h2>
          {last ? (
            <p className="pg-weight-row">
              <span className="pg-weight-value num">{weightText(last.kg, unit)}</span>
              <span className={`pg-weight-delta num${good ? '' : ' is-off'}`}>
                {change !== null ? changeText(change, unit, range) : t('progress.weight.loggedOn', { date: shortDate(last.date) })}
              </span>
            </p>
          ) : null}
        </div>
        {logButton}
      </header>
      {line && first && end ? (
        <div
          className="pg-weight-chart"
          role="img"
          aria-label={
            points.length > 1
              ? t('progress.weight.chart', { from: weightText(first.kg, unit), fromDate: shortDate(first.date), to: weightText(end.kg, unit), toDate: shortDate(end.date) })
              : t('progress.weight.chartOne', { value: weightText(end.kg, unit), date: shortDate(end.date) })
          }
        >
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className="pg-weight-stop" stopOpacity="0.25" />
                <stop offset="100%" className="pg-weight-stop" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={line.area} fill={`url(#${gradId})`} />
            <path d={line.line} className="pg-weight-line" fill="none" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="pg-weight-dot" style={{ insetInlineStart: `${(line.end.x / CHART_W) * 100}%`, insetBlockStart: `${(line.end.y / CHART_H) * 100}%` }} />
        </div>
      ) : last ? null : (
        <div className="pg-weight-empty">
          <p className="pg-weight-empty-title">{t('progress.weight.empty')}</p>
          <p className="pg-weight-empty-body">{t('progress.weight.emptyBody')}</p>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Calendar (wide screens)

type CalTone = 'on' | 'close' | 'off' | 'future';

function calTone(status: DayStatus, future: boolean): CalTone {
  if (future) return 'future';
  return status === 'on' ? 'on' : status === 'close' ? 'close' : 'off';
}

function CalendarCard({ tracker, today, target, weekStart }: { tracker: Tracker; today: ISODate; target: number; weekStart: WeekStart }) {
  const titleId = useId();
  const grid = useMemo(() => monthGrid(today, weekStart), [today, weekStart]);
  const monthName = formatDate(grid.month, intlLocale(), { month: 'long' });
  return (
    <section className="card pg-card pg-calendar" aria-labelledby={titleId}>
      <header className="pg-card-head">
        <h2 id={titleId} className="pg-card-title">
          {monthName}
        </h2>
        <ul className="pg-legend" aria-label={t('progress.calendar.legend')}>
          <li>
            <span className="pg-dot pg-cal-on" aria-hidden="true" />
            {t('progress.legend.on')}
          </li>
          <li>
            <span className="pg-dot pg-cal-close" aria-hidden="true" />
            {t('progress.legend.close')}
          </li>
          <li>
            <span className="pg-dot pg-cal-off" aria-hidden="true" />
            {t('progress.legend.missed')}
          </li>
        </ul>
      </header>
      <table className="pg-cal-table" aria-labelledby={titleId}>
        <thead>
          <tr>
            {grid.weekdays.map((d) => (
              <th key={d} scope="col" abbr={weekdayName(d, 'long')}>
                {weekdayName(d, 'short')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.weeks.map((week, w) => (
            <tr key={w}>
              {week.map((d, i) => {
                if (!d) return <td key={`x${i}`} />;
                const future = d > today;
                const status = future ? 'empty' : statusOn(tracker, d, target);
                const tone = calTone(status, future);
                const label = future ? t('progress.status.future') : d === today && status !== 'on' ? t('progress.status.today') : toneLabel(status);
                return (
                  <td key={d} aria-current={d === today ? 'date' : undefined}>
                    <span className={`pg-cal-day pg-cal-${tone}${d === today ? ' is-today' : ''}`}>
                      <span className="num">{num(parseISODate(d)?.day ?? 0)}</span>
                      <span className="visually-hidden">, {label}</span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Recent days (wide screens)

function HistoryCard({ tracker, today, target, plannedFor }: { tracker: Tracker; today: ISODate; target: number; plannedFor: (d: ISODate) => number }) {
  const titleId = useId();
  const tableId = useId();
  const [all, setAll] = useState(false);
  const dates = useMemo(() => historyDates(tracker, today), [tracker, today]);
  const shown = all ? dates : dates.slice(0, HISTORY_ROWS);
  const unit = tracker.unit;
  return (
    <section className="card pg-card pg-history pg-wide" aria-labelledby={titleId}>
      <header className="pg-card-head pg-history-head">
        <h2 id={titleId} className="pg-card-title">
          {t('progress.history.title')}
        </h2>
        {dates.length > HISTORY_ROWS ? (
          <button type="button" className="btn btn-plain btn-sm pg-history-more" aria-expanded={all} aria-controls={tableId} onClick={() => setAll((v) => !v)}>
            {all ? t('progress.history.fewer') : t('progress.history.all')}
          </button>
        ) : null}
      </header>
      <table id={tableId} className="pg-history-table" aria-labelledby={titleId}>
        <thead>
          <tr>
            <th scope="col">{t('progress.col.day')}</th>
            <th scope="col">{t('progress.col.eaten')}</th>
            <th scope="col">{t('progress.col.protein')}</th>
            <th scope="col">{t('progress.col.water')}</th>
            <th scope="col">{t('progress.col.weight')}</th>
            <th scope="col">{t('progress.col.status')}</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((d) => {
            const totals = dayTotals(tracker.days[d]);
            const weight = weightOn(tracker, d);
            return (
              <tr key={d}>
                <th scope="row">{d === today ? t('progress.history.today', { date: shortDate(d) }) : shortDate(d)}</th>
                <td className="num">{t('progress.history.eaten', { eaten: totals.logged ? num(totals.kcal) : t('progress.none'), planned: num(plannedFor(d)) })}</td>
                <td className="num">{totals.logged ? grams(Math.round(totals.protein)) : t('progress.none')}</td>
                <td className="num">{totals.water ? tp('progress.glasses', totals.water) : t('progress.none')}</td>
                <td className="num">{weight ? weightText(weight.kg, unit) : t('progress.none')}</td>
                <td>
                  <StatusPill date={d} today={today} kcal={totals.kcal} status={dayStatus(totals, target)} target={target} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function StatusPill({ date, today, kcal, status, target }: { date: ISODate; today: ISODate; kcal: number; status: DayStatus; target: number }) {
  if (date === today) return <span className="pill pill-progress">{t('progress.status.today')}</span>;
  if (status === 'empty') return <span className="pill pg-pill-none">{t('progress.status.notLogged')}</span>;
  if (status === 'on') return <span className="pill pill-on">{t('progress.status.on')}</span>;
  const diff = Math.round(kcal - target);
  return <span className="pill pill-off num">{diff < 0 ? t('progress.status.under', { n: num(-diff) }) : t('progress.status.over', { n: num(diff) })}</span>;
}
