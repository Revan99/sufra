// Today's cards: the photo hero, what's been eaten (ring), water, the planned day's summary, and on wide screens
// the week's planned kcal and the start of the shopping list.
import type { CatalogRecipe, DayPlan, MealSlot, PlannedMeal } from '../../types.ts';
import { addDays } from '../../lib/dates.ts';
import type { ISODate } from '../../lib/dates.ts';
import type { DayTotals } from '../../lib/tracker.ts';
import { fiberTarget } from '../../lib/tracker.ts';
import { t } from '../../i18n/index.ts';
import { tx } from '../../i18n/nodes.tsx';
import { num, relativeName, shortDate, weekdayName } from '../../i18n/labels.ts';
import { navigate, recipeRoute, routeHash } from '../router.ts';
import { kcalStatus, SODIUM_LIMIT_MG } from '../dayStatus.ts';
import { Icon } from '../components/Icon.tsx';
import { RecipeImage } from '../components/RecipeImage.tsx';
import { mealTime, shortTime } from '../tracking.ts';

/** A link to a recipe's reference video on YouTube, or a YouTube search when none has been picked. */
export function videoHref(recipe: CatalogRecipe): string {
  const v = recipe.video;
  if (v) return `https://www.youtube.com/watch?v=${v.youtubeId}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${recipe.nativeName ?? recipe.name} recipe`)}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Date stepping

/** ‹ date ›: steps a day at a time, replacing the history entry so Back leaves Today instead of walking days. */
export function DateCapsule({ date, today, variant }: { date: ISODate; today: ISODate; variant: 'photo' | 'page' }) {
  const go = (d: ISODate) => navigate({ name: 'today', date: d === today ? null : d }, { replace: true });
  const away = date !== today;
  const glass = variant === 'photo' ? 'glass-clear' : 'glass';
  return (
    <div className="date-row">
      <div className={`date-capsule ${glass}`}>
        <button type="button" className="icon-btn date-step" onClick={() => go(addDays(date, -1))} aria-label={t('today.prevDay')}>
          <Icon name="chevronLeft" size={18} className="flip-rtl" />
        </button>
        {variant === 'page' ? (
          <button type="button" className="date-today" onClick={() => go(today)} aria-label={away ? t('today.backToToday') : undefined} aria-disabled={!away || undefined}>
            {away ? (relativeName(date, today) ?? shortDate(date)) : t('day.today')}
          </button>
        ) : (
          <span className="date-label">{shortDate(date)}</span>
        )}
        <button type="button" className="icon-btn date-step" onClick={() => go(addDays(date, 1))} aria-label={t('today.nextDay')}>
          <Icon name="chevronRight" size={18} className="flip-rtl" />
        </button>
      </div>
      {away && variant === 'photo' ? (
        <button type="button" className={`btn btn-sm ${glass} date-back`} onClick={() => go(today)}>
          {t('day.today')}
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Hero

interface HeroProps {
  meal: PlannedMeal | null;
  recipe: CatalogRecipe | null;
  label: string;
  date: ISODate;
  today: ISODate;
  /** The whole day is logged. */
  done: boolean;
  wide: boolean;
  onSwap: () => void;
}

/** The meal to cook next over its photo, with its figures and Swap. Phones: full bleed, with date and Settings. */
export function Hero({ meal, recipe, label, date, today, done, wide, onSwap }: HeroProps) {
  const time = meal ? shortTime(mealTime(meal.slot, meal.index)) : '';
  const eyebrow = !meal ? '' : done ? t('today.allDone') : date === today ? t('today.nextUp', { slot: label, time }) : t('today.upFirst', { slot: label, time });
  const href = recipe && meal ? routeHash(recipeRoute(recipe.id, { date, slot: meal.slot, index: meal.index })) : null;
  const k = recipe && meal ? recipe.perServing.kcal * meal.portion : 0;
  const p = recipe && meal ? recipe.perServing.protein * meal.portion : 0;
  const figures = t('today.heroFigures', { kcal: num(k), protein: num(p) });
  return (
    <section className={`hero${wide ? ' hero-wide' : ' bleed'}${recipe?.photo ? ' has-photo' : ' no-photo'}`} aria-label={eyebrow || undefined}>
      {recipe ? (
        <RecipeImage recipe={recipe} kind="hero" sizes={wide ? '(min-width: 1440px) 60rem, 60vw' : '100vw'} plateSize={180} hero className="hero-img" />
      ) : null}
      <div className="hero-shade" aria-hidden="true" />
      {!wide ? (
        <div className="hero-top">
          <DateCapsule date={date} today={today} variant="photo" />
          <a className="icon-btn glass-clear hero-settings" href="#/settings" aria-label={t('today.settings')}>
            <Icon name="sliders" size={19} />
          </a>
        </div>
      ) : null}
      {recipe && meal && href ? (
        <div className="hero-text">
          <p className="hero-eyebrow">{eyebrow}</p>
          <h2 className="hero-title">
            <a href={href}>{recipe.name}</a>
          </h2>
          <div className="hero-actions">
            {wide ? (
              <>
                <a className="btn glass-accent hero-btn" href={href}>
                  {t('today.openRecipe')}
                </a>
                <span className="btn glass-clear hero-btn hero-figures num">
                  <Icon name="flame" size={16} />
                  {figures}
                </span>
              </>
            ) : (
              <a className="btn glass-clear hero-btn num" href={href}>
                {figures}
              </a>
            )}
            {date >= today ? (
              <button type="button" className="btn glass-clear hero-btn" onClick={onSwap} aria-label={t('today.swapName', { slot: label })}>
                <Icon name="repeat" size={16} />
                {t('today.swap')}
              </button>
            ) : null}
            {wide ? (
              <a className="btn glass-clear hero-btn" href={videoHref(recipe)} target="_blank" rel="noopener noreferrer">
                <Icon name="play" size={16} />
                {t('today.watch')}
                <span className="visually-hidden">{t('recipe.video.newTab')}</span>
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Tracker cards

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <span className="bar" aria-hidden="true">
      <span className={`bar-fill ${className}`} style={{ inlineSize: `${pct}%` }} />
    </span>
  );
}

/** The eaten ring: kcal eaten against the target, what's left, and protein and fiber so far. */
export function EatenCard({ totals, kcalTarget, proteinTarget }: { totals: DayTotals; kcalTarget: number; proteinTarget: number }) {
  const eaten = Math.round(totals.kcal);
  const left = kcalTarget - eaten;
  const R = 43.2;
  const C = 2 * Math.PI * R;
  const share = Math.min(1, eaten / kcalTarget);
  const fiberGoal = fiberTarget(kcalTarget);
  const headline = Math.abs(left) <= kcalTarget * 0.02 ? t('track.onTarget') : left > 0 ? t('track.left', { n: num(left) }) : t('track.over', { n: num(-left) });
  return (
    <section className="card eaten-card" aria-labelledby="eaten-h">
      <div className="ring" role="img" aria-label={t('track.eatenLabel', { n: num(eaten), target: num(kcalTarget) })}>
        <svg viewBox="0 0 96 96" width="96" height="96" aria-hidden="true">
          <circle className="ring-track" cx="48" cy="48" r={R} />
          <circle className="ring-arc" cx="48" cy="48" r={R} strokeDasharray={`${C * share} ${C}`} />
        </svg>
        <span className="ring-center" aria-hidden="true">
          <span className="ring-value num">{num(eaten)}</span>
          <span className="ring-label">{t('track.eaten')}</span>
        </span>
      </div>
      <div className="eaten-details">
        <h2 id="eaten-h" className="eaten-headline num">
          {headline}
        </h2>
        <div className="eaten-macro">
          <p className="eaten-macro-labels">
            <span>{t('track.protein')}</span>
            <span className="num">{t('track.ofG', { n: num(totals.protein), target: num(proteinTarget) })}</span>
          </p>
          <Bar value={totals.protein} max={proteinTarget} className="bar-protein" />
        </div>
        <div className="eaten-macro">
          <p className="eaten-macro-labels">
            <span>{t('track.fiber')}</span>
            <span className="num">{t('track.ofG', { n: num(totals.fiber), target: num(fiberGoal) })}</span>
          </p>
          <Bar value={totals.fiber} max={fiberGoal} className="bar-fiber" />
        </div>
      </div>
    </section>
  );
}

/** Water: a bar per glass (tap one to set the count there) and a round + button. */
export function WaterCard({ glasses, goal, onSet }: { glasses: number; goal: number; onSet: (n: number) => void }) {
  const slots = Math.max(goal, Math.min(glasses, 12));
  return (
    <section className="card water-card" aria-labelledby="water-h">
      <div className="water-text">
        <h2 id="water-h" className="water-title num">
          <Icon name="droplet" size={15} className="water-icon" />
          {t('track.water', { n: num(glasses), goal: num(goal) })}
        </h2>
        <ul className="glasses">
          {Array.from({ length: slots }, (_, i) => {
            const full = i < glasses;
            // Tapping the last full glass empties it; any other glass fills up to it.
            const next = full && i === glasses - 1 ? i : i + 1;
            return (
              <li key={i}>
                <button type="button" className={`glass-pip${full ? ' is-full' : ''}`} onClick={() => onSet(next)} aria-label={t('track.waterSet', { n: next })} aria-pressed={full}>
                  <span aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <button type="button" className="water-add" onClick={() => onSet(glasses + 1)} aria-label={t('track.addWater')}>
        <Icon name="plus" size={20} />
      </button>
    </section>
  );
}

const SEGMENT_CLASS: Readonly<Record<MealSlot, string>> = { breakfast: 'seg-breakfast', lunch: 'seg-lunch', dinner: 'seg-dinner', snack: 'seg-snack' };

/** The planned day: kcal against the target with a segment per meal, and the macros (row on phones, list wide). */
export function PlanCard({ plan, kcalTarget, proteinTarget, layout, mealKcal }: { plan: DayPlan; kcalTarget: number; proteinTarget: number; layout: 'row' | 'list'; mealKcal: (m: PlannedMeal) => number }) {
  const kcal = Math.round(plan.totals.kcal);
  const status = kcalStatus(kcal, kcalTarget);
  const gap = num(Math.abs(kcal - kcalTarget));
  const statusText = status === 'in' ? t('today.status.in') : t(`today.status.${status}`, { n: gap });
  const totals = plan.totals;
  return (
    <section className={`card plan-card plan-${layout}`} aria-labelledby="plan-h">
      <div className="plan-top">
        <h2 id="plan-h" className="plan-kcal num">
          {tx('today.planTitle', { n: <span className="plan-big">{num(kcal)}</span>, target: <span className="plan-target">{num(kcalTarget)}</span> })}
        </h2>
        <span className={`pill ${status === 'in' ? 'pill-accent' : 'pill-off'}`}>{statusText}</span>
      </div>
      <div className="plan-segments" aria-hidden="true">
        {plan.meals.map((m) => (
          <span key={`${m.slot}-${m.index}`} className={`plan-seg ${SEGMENT_CLASS[m.slot]}`} style={{ flexGrow: mealKcal(m) }} />
        ))}
      </div>
      {layout === 'row' ? (
        <dl className="plan-macros">
          {(['protein', 'carbs', 'fat', 'fiber'] as const).map((k) => (
            <div key={k}>
              <dt>{t(`nutrient.${k}`)}</dt>
              <dd className="num">{t('value.g', { n: num(totals[k]) })}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <dl className="plan-rows">
          <div>
            <dt>{t('nutrient.protein')}</dt>
            <dd className="num">{t('today.planProtein', { n: num(totals.protein), target: num(proteinTarget) })}</dd>
          </div>
          {(['carbs', 'fat', 'fiber'] as const).map((k) => (
            <div key={k}>
              <dt>{t(`nutrient.${k}`)}</dt>
              <dd className="num">{t('value.g', { n: num(totals[k]) })}</dd>
            </div>
          ))}
          <div>
            <dt>{t('nutrient.sodium')}</dt>
            <dd className="num">{t('today.planSodium', { n: num(totals.sodium), limit: num(SODIUM_LIMIT_MG) })}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

/** The week's planned kcal as bars (the day on screen highlighted), linking to Week. */
export function WeekCard({ days, current }: { days: readonly DayPlan[]; current: ISODate }) {
  const max = Math.max(1, ...days.map((d) => d.totals.kcal));
  return (
    <section className="card side-card" aria-labelledby="week-card-h">
      <div className="side-head">
        <h2 id="week-card-h" className="side-title">
          {t('today.weekTitle')}
        </h2>
        <a className="side-link" href="#/week">
          {t('today.seeAll')}
        </a>
      </div>
      <ol className="tw-bars">
        {days.map((d) => (
          <li key={d.date} className={d.date === current ? 'is-current' : undefined}>
            <a href={routeHash({ name: 'today', date: d.date })} aria-label={`${weekdayName(d.date, 'long')}: ${t('value.kcal', { n: num(d.totals.kcal) })}`}>
              <span className="tw-bar" style={{ blockSize: `${Math.max(8, (d.totals.kcal / max) * 74)}px` }} aria-hidden="true" />
              <span className="tw-day" aria-hidden="true">
                {weekdayName(d.date, 'narrow')}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

export interface ShopPreviewItem {
  id: string;
  name: string;
  amount: string;
}

/** "Shopping this week": progress and the next few items to buy, tickable here. */
export function ShopCard({ done, total, items, onToggle }: { done: number; total: number; items: readonly ShopPreviewItem[]; onToggle: (id: string) => void }) {
  return (
    <section className="card side-card" aria-labelledby="shop-card-h">
      <div className="side-head">
        <h2 id="shop-card-h" className="side-title">
          <a href="#/shopping">{t('today.shopTitle')}</a>
        </h2>
        <span className="side-count num">{t('today.shopCount', { done: num(done), total: num(total) })}</span>
      </div>
      <span className="bar" aria-hidden="true">
        <span className="bar-fill bar-accent" style={{ inlineSize: `${total ? (done / total) * 100 : 0}%` }} />
      </span>
      <ul className="shop-preview">
        {items.map((i) => (
          <li key={i.id}>
            <label className="shop-preview-item">
              <input type="checkbox" className="visually-hidden" checked={false} onChange={() => onToggle(i.id)} />
              <span className="shop-preview-box" aria-hidden="true" />
              <span className="shop-preview-name">{i.name}</span>
              <span className="shop-preview-amount num">{i.amount}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Tomorrow's meals as small cards (wide screens). */
export function TomorrowRow({ plan, today, recipeOf, labelOf }: { plan: DayPlan; today: ISODate; recipeOf: (id: string) => CatalogRecipe | undefined; labelOf: (m: PlannedMeal) => string }) {
  const rel = relativeName(plan.date, today);
  return (
    <section className="tomorrow" aria-labelledby="tomorrow-h">
      <h2 id="tomorrow-h" className="tomorrow-title">
        {rel === t('day.tomorrow') ? t('today.tomorrow', { weekday: weekdayName(plan.date, 'long') }) : `${rel ?? weekdayName(plan.date, 'long')} · ${shortDate(plan.date)}`}
      </h2>
      <ul className="tomorrow-row">
        {plan.meals.map((m) => {
          const r = recipeOf(m.recipeId);
          if (!r) return null;
          return (
            <li key={`${m.slot}-${m.index}`} className="tomorrow-card">
              <RecipeImage recipe={r} kind="option" sizes="2.5rem" plateSize={40} className="tomorrow-img" />
              <span className="tomorrow-text">
                <span className="tomorrow-slot">{labelOf(m)}</span>
                <a className="tomorrow-name stretched" href={routeHash(recipeRoute(r.id, { date: plan.date, slot: m.slot, index: m.index }))}>
                  {r.name}
                </a>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

