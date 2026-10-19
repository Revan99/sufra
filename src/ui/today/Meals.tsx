// Today's meals: a list of rows on phones (tick circle, photo, name, status, kcal) and photo tiles on wide screens.
// Each planned meal is ticked off as eaten, then skipped, then back to planned; extra foods sit with their meal.
import type { CatalogRecipe, DayPlan, MealSlot, PlannedMeal, Profile } from '../../types.ts';
import type { ISODate } from '../../lib/dates.ts';
import type { FoodLog, MealLog } from '../../lib/tracker.ts';
import { t } from '../../i18n/index.ts';
import { kcal, num } from '../../i18n/labels.ts';
import { recipeRoute, routeHash } from '../router.ts';
import { recipeConflict } from '../planHelpers.ts';
import { ConflictNote, useConflictLines } from '../components/Conflict.tsx';
import { Icon } from '../components/Icon.tsx';
import { RecipeImage } from '../components/RecipeImage.tsx';
import { UnfilledCard } from '../components/UnfilledCard.tsx';
import { SLOT_ORDER, shortTime } from '../tracking.ts';

export type Row =
  | { kind: 'meal'; meal: PlannedMeal; recipe: CatalogRecipe; label: string; log: MealLog | undefined; picked: boolean }
  | { kind: 'food'; food: FoodLog; recipe: CatalogRecipe | undefined; label: string }
  | { kind: 'unfilled'; slot: MealSlot; index: number; label: string };

/** Planned meals, unfilled slots and extra foods, in meal order (extras after the planned meal of their slot). */
export function buildRows(input: {
  plan: DayPlan;
  foods: readonly FoodLog[];
  recipeOf: (id: string) => CatalogRecipe | undefined;
  labelOf: (slot: MealSlot, index: number) => string;
  logOf: (m: PlannedMeal) => MealLog | undefined;
  pickedOf: (m: PlannedMeal) => boolean;
}): Row[] {
  const { plan, foods, recipeOf, labelOf, logOf, pickedOf } = input;
  const keyed: { order: number; row: Row }[] = [];
  for (const m of plan.meals) {
    const log = logOf(m);
    // An eaten meal shows what was eaten, even if the plan has changed since.
    const recipe = (log?.status === 'eaten' ? recipeOf(log.recipeId) : undefined) ?? recipeOf(m.recipeId);
    if (recipe) keyed.push({ order: SLOT_ORDER[m.slot] * 100 + m.index, row: { kind: 'meal', meal: m, recipe, label: labelOf(m.slot, m.index), log, picked: pickedOf(m) } });
  }
  for (const u of plan.unfilled) keyed.push({ order: SLOT_ORDER[u.slot] * 100 + u.index, row: { kind: 'unfilled', slot: u.slot, index: u.index, label: labelOf(u.slot, u.index) } });
  foods.forEach((f, i) => keyed.push({ order: SLOT_ORDER[f.slot] * 100 + 50 + i / 100, row: { kind: 'food', food: f, recipe: f.recipeId ? recipeOf(f.recipeId) : undefined, label: labelOf(f.slot, 0) } }));
  return keyed.sort((a, b) => a.order - b.order).map((k) => k.row);
}

export interface MealActions {
  /** Logging is open for this date (today or earlier). */
  canLog: boolean;
  /** Swapping is open for this date (today or later). */
  canSwap: boolean;
  onCycle: (row: Extract<Row, { kind: 'meal' }>) => void;
  onSwap: (row: Extract<Row, { kind: 'meal' }>) => void;
  onRemoveFood: (food: FoodLog) => void;
}

function statusLine(row: Row): string {
  if (row.kind === 'food') return t('track.extraAt', { time: shortTime(row.food.at) });
  if (row.kind !== 'meal') return '';
  if (row.log?.status === 'eaten') return t('track.eatenAt', { slot: row.label, time: shortTime(row.log.at) });
  if (row.log?.status === 'skipped') return t('track.skippedSlot', { slot: row.label });
  return t('track.plannedSlot', { slot: row.label });
}

function TickButton({ row, onCycle }: { row: Extract<Row, { kind: 'meal' }>; onCycle: () => void }) {
  const s = row.log?.status;
  const label = s === 'eaten' ? t('track.markSkipped', { name: row.recipe.name }) : s === 'skipped' ? t('track.markPlanned', { name: row.recipe.name }) : t('track.markEaten', { name: row.recipe.name });
  return (
    <button type="button" className={`tick meal-tick${s === 'eaten' ? ' is-on' : ''}${s === 'skipped' ? ' is-skipped' : ''}`} onClick={onCycle} aria-label={label}>
      {s === 'eaten' ? <Icon name="check" size={16} /> : s === 'skipped' ? <Icon name="minus" size={14} /> : null}
    </button>
  );
}

function ConflictLines({ recipe, profile }: { recipe: CatalogRecipe; profile: Profile }) {
  const lines = useConflictLines(recipeConflict(recipe, profile), profile, recipe.totalMinutes);
  return <ConflictNote lines={lines} />;
}

function rowKcal(row: Extract<Row, { kind: 'meal' }>): number {
  return row.log?.status === 'eaten' ? row.log.kcal : row.recipe.perServing.kcal * row.meal.portion;
}

/** Phones: the meal log card. */
export function MealList({ rows, date, dayPlan, profile, actions }: { rows: readonly Row[]; date: ISODate; dayPlan: DayPlan; profile: Profile; actions: MealActions }) {
  return (
    <ol className="list-card meal-list">
      {rows.map((row) => {
        if (row.kind === 'unfilled') {
          return (
            <li key={`u-${row.slot}-${row.index}`} className="meal-row-unfilled">
              <UnfilledCard slot={row.slot} index={row.index} label={row.label} dayPlan={dayPlan} />
            </li>
          );
        }
        if (row.kind === 'food') {
          const f = row.food;
          return (
            <li key={f.id} className="meal-row is-food">
              <button type="button" className="tick meal-tick is-on" onClick={() => actions.onRemoveFood(f)} aria-label={t('track.removeFood', { name: f.name })}>
                <Icon name="check" size={16} />
              </button>
              {row.recipe ? (
                <RecipeImage recipe={row.recipe} kind="option" sizes="2.75rem" plateSize={44} className="meal-row-img" />
              ) : (
                <span className="meal-row-icon" aria-hidden="true">
                  <Icon name="apple" size={20} />
                </span>
              )}
              <div className="meal-row-text">
                <h3 className="meal-row-name">{row.recipe ? <a className="stretched" href={routeHash(recipeRoute(row.recipe.id))}>{f.name}</a> : f.name}</h3>
                <p className="meal-row-sub">{statusLine(row)}</p>
              </div>
              <span className="meal-row-kcal num">{kcal(f.kcal)}</span>
            </li>
          );
        }
        const s = row.log?.status;
        const href = routeHash(recipeRoute(row.recipe.id, { date, slot: row.meal.slot, index: row.meal.index }));
        return (
          <li key={`${row.meal.slot}-${row.meal.index}`} className={`meal-row${s ? ` is-${s}` : ''}`}>
            {actions.canLog ? <TickButton row={row} onCycle={() => actions.onCycle(row)} /> : null}
            <RecipeImage recipe={row.recipe} kind="option" sizes="2.75rem" plateSize={44} className="meal-row-img" />
            <div className="meal-row-text">
              <h3 className="meal-row-name">
                <a className="stretched" href={href}>
                  {row.recipe.name}
                </a>
              </h3>
              <p className="meal-row-sub">
                {actions.canLog ? statusLine(row) : row.label}
                {row.picked ? <span className="pick-tag">{t('badge.yourPick')}</span> : null}
              </p>
              {row.picked ? <ConflictLines recipe={row.recipe} profile={profile} /> : null}
            </div>
            <span className="meal-row-kcal num">{kcal(rowKcal(row))}</span>
            {actions.canSwap && s !== 'eaten' ? (
              <button type="button" className="icon-btn meal-row-swap" onClick={() => actions.onSwap(row)} aria-label={t('meal.swapFor', { slot: row.label })}>
                <Icon name="repeat" size={16} />
              </button>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Wide screens: a photo tile per meal, with its slot on the photo and the tick and swap over it. */
export function MealTiles({ rows, date, dayPlan, profile, actions }: { rows: readonly Row[]; date: ISODate; dayPlan: DayPlan; profile: Profile; actions: MealActions }) {
  const meals = rows.filter((r) => r.kind !== 'food');
  const foods = rows.filter((r): r is Extract<Row, { kind: 'food' }> => r.kind === 'food');
  return (
    <>
      <ol className="meal-tiles">
        {meals.map((row) => {
          if (row.kind === 'unfilled') {
            return (
              <li key={`u-${row.slot}-${row.index}`} className="meal-tile meal-tile-unfilled card">
                <UnfilledCard slot={row.slot} index={row.index} label={row.label} dayPlan={dayPlan} />
              </li>
            );
          }
          if (row.kind !== 'meal') return null;
          const s = row.log?.status;
          const p = row.log?.status === 'eaten' ? row.log.protein : row.recipe.perServing.protein * row.meal.portion;
          return (
            <li key={`${row.meal.slot}-${row.meal.index}`} className={`meal-tile card${s ? ` is-${s}` : ''}`}>
              <div className="meal-tile-photo">
                <RecipeImage recipe={row.recipe} kind="card" sizes="(min-width: 1440px) 16rem, 20vw" plateSize={110} className="meal-tile-img" />
                <span className="slot-chip glass-clear">{row.label}</span>
                {actions.canLog ? <TickButton row={row} onCycle={() => actions.onCycle(row)} /> : null}
                {actions.canSwap && s !== 'eaten' ? (
                  <button type="button" className="icon-btn glass-clear meal-tile-swap" onClick={() => actions.onSwap(row)} aria-label={t('meal.swapFor', { slot: row.label })}>
                    <Icon name="repeat" size={16} />
                  </button>
                ) : null}
              </div>
              <div className="meal-tile-text">
                <h3 className="meal-tile-name">
                  <a className="stretched" href={routeHash(recipeRoute(row.recipe.id, { date, slot: row.meal.slot, index: row.meal.index }))}>
                    {row.recipe.name}
                  </a>
                </h3>
                <p className="meal-tile-meta num">{t('today.mealFigures', { kcal: num(rowKcal(row)), protein: num(p) })}</p>
                {actions.canLog && s ? <p className={`meal-tile-status is-${s}`}>{statusLine(row)}</p> : null}
                {row.picked ? <ConflictLines recipe={row.recipe} profile={profile} /> : null}
              </div>
            </li>
          );
        })}
      </ol>
      {foods.length ? (
        <ul className="list-card meal-list food-list">
          {foods.map((row) => (
            <li key={row.food.id} className="meal-row is-food">
              <button type="button" className="tick meal-tick is-on" onClick={() => actions.onRemoveFood(row.food)} aria-label={t('track.removeFood', { name: row.food.name })}>
                <Icon name="check" size={16} />
              </button>
              {row.recipe ? (
                <RecipeImage recipe={row.recipe} kind="option" sizes="2.75rem" plateSize={44} className="meal-row-img" />
              ) : (
                <span className="meal-row-icon" aria-hidden="true">
                  <Icon name="apple" size={20} />
                </span>
              )}
              <div className="meal-row-text">
                <h3 className="meal-row-name">{row.food.name}</h3>
                <p className="meal-row-sub">{t('track.extraSlotAt', { slot: row.label, time: shortTime(row.food.at) })}</p>
              </div>
              <span className="meal-row-kcal num">{kcal(row.food.kcal)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
