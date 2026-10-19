import { useEffect, useId, useMemo, useState } from 'react';
import type { CatalogRecipe } from '../../types.ts';
import { addDays, formatDate } from '../../lib/dates.ts';
import type { ISODate } from '../../lib/dates.ts';
import { intlLocale, t } from '../../i18n/index.ts';
import { friendlyDate, slotLower, weekdayName } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { usePlan } from '../plan.tsx';
import { navigate } from '../router.ts';
import { addOptions, dayMealName, portionForMeal, recipeConflict } from '../planHelpers.ts';
import type { AddOption } from '../planHelpers.ts';
import { Sheet } from '../components/Sheet.tsx';
import { Icon } from '../components/Icon.tsx';
import { RecipeImage } from '../components/RecipeImage.tsx';
import { useToast } from '../components/Toast.tsx';
import { ConflictNote, useConflictLines } from '../components/Conflict.tsx';

const DAYS_AHEAD = 7;

/** Puts a recipe on a day: pick the date, then the meal it replaces, fills or adds. Saves an override. */
export function AddToDaySheet({ recipe, onClose }: { recipe: CatalogRecipe | null; onClose: () => void }) {
  const { state, dispatch } = useAppState();
  const lib = useLibrary();
  const plan = usePlan();
  const notify = useToast();
  const [date, setDate] = useState<ISODate>(plan.today);
  const dateGroup = useId();
  const warnId = useId();
  const hintId = useId();

  useEffect(() => {
    if (recipe) setDate(plan.today);
  }, [recipe, plan.today]);

  const dates = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(plan.today, i)), [plan.today]);
  const dayPlan = plan.day(date);
  const options = recipe ? addOptions(dayPlan, recipe) : [];
  const conflictLines = useConflictLines(recipe ? recipeConflict(recipe, state.profile) : null, state.profile, recipe?.totalMinutes ?? 0);
  const dayName = friendlyDate(date, plan.today);

  /** The meal's name as the day will show it once the recipe is added ("Snack" for a first snack). */
  const optionLabel = (o: AddOption): string => dayMealName(dayPlan, o.slot, o.index);
  const optionHint = (o: AddOption): string => {
    if (o.kind === 'replace') return t('add.replaces', { name: (o.replaces && lib.byId.get(o.replaces)?.name) || '' });
    if (o.kind === 'fill') return t('add.fills', { slot: slotLower(o.slot) });
    return t('add.addsSnack');
  };

  const confirm = (o: AddOption) => {
    if (!recipe) return;
    const portion = portionForMeal(dayPlan, o.slot, o.index, recipe, state.profile, lib.byId);
    dispatch({ type: 'override', override: { date, slot: o.slot, index: o.index, recipeId: recipe.id, portion } });
    const target = date;
    notify(t('add.done', { name: recipe.name, slot: slotLower(o.slot), date: dayName }), {
      label: t('add.viewDay'),
      run: () => navigate({ name: 'today', date: target === plan.today ? null : target }),
    });
    onClose();
  };

  return (
    <Sheet open={recipe !== null} onClose={onClose} className="pick-sheet" title={t('add.title')}>
      {recipe ? (
        <div className="pick-now">
          <RecipeImage recipe={recipe} kind="option" sizes="2.75rem" plateSize={44} className="pick-now-img" />
          <p className="pick-now-text">
            <span className="pick-now-label">{t('pick.adding')}</span>
            <span className="pick-now-name">{recipe.name}</span>
          </p>
        </div>
      ) : null}
      {conflictLines.length ? (
        <div className="notice pick-conflict" id={warnId} role="note">
          <Icon name="info" size={20} />
          <div>
            <p className="pick-conflict-title">{t('add.conflict')}</p>
            <ConflictNote lines={conflictLines} />
          </div>
        </div>
      ) : null}
      <fieldset className="pick-days">
        <legend className="section-label">{t('add.day')}</legend>
        <div className="pick-days-row">
          {dates.map((d) => (
            <label key={d} className="pick-day">
              <input type="radio" name={dateGroup} checked={d === date} onChange={() => setDate(d)} />
              <span className="pick-day-week">{weekdayName(d)}</span>
              <span className="pick-day-num num">{formatDate(d, intlLocale(), { day: 'numeric' })}</span>
              {d === plan.today ? (
                <>
                  <span className="pick-day-dot" aria-hidden="true" />
                  <span className="visually-hidden">{t('day.today')}</span>
                </>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>
      <section className="pick-meals" aria-labelledby={`${hintId}-h`}>
        <h3 id={`${hintId}-h`} className="section-label">
          {t('add.meal')}
        </h3>
        {options.length ? (
          <ul className="pick-list">
            {options.map((o, i) => {
              const replaced = o.kind === 'replace' && o.replaces ? lib.byId.get(o.replaces) : undefined;
              const label = optionLabel(o);
              const rowHint = `${hintId}-${i}`;
              return (
                <li key={`${o.slot}-${o.index}-${o.kind}`} className="pick-row pick-row-slot">
                  {replaced ? (
                    <RecipeImage recipe={replaced} kind="option" sizes="2.75rem" plateSize={44} className="pick-img pick-img-sm" />
                  ) : (
                    <span className="pick-empty-slot" aria-hidden="true">
                      <Icon name="plus" size={20} />
                    </span>
                  )}
                  <div className="pick-text">
                    <p className="pick-name">{label}</p>
                    <p className="pick-meta" id={rowHint}>
                      {optionHint(o)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`btn pick-btn stretched ${i === 0 ? 'btn-accent' : 'btn-quiet'}`}
                    onClick={() => confirm(o)}
                    aria-label={t(o.kind === 'replace' ? 'pick.replaceAt' : 'pick.addTo', { slot: label, date: dayName })}
                    aria-describedby={conflictLines.length ? `${rowHint} ${warnId}` : rowHint}
                  >
                    {t(o.kind === 'replace' ? 'pick.replace' : 'pick.add')}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="sheet-empty">{t('add.noSlot')}</p>
        )}
      </section>
    </Sheet>
  );
}
