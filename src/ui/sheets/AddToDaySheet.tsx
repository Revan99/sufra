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
import { ConflictNote, useConflictLines } from '../components/MealCard.tsx';

const DAYS_AHEAD = 7;

/** Puts a recipe on a day: pick the date and the meal it replaces, fills or adds. Saves an override. */
export function AddToDaySheet({ recipe, onClose }: { recipe: CatalogRecipe | null; onClose: () => void }) {
  const { state, dispatch } = useAppState();
  const lib = useLibrary();
  const plan = usePlan();
  const notify = useToast();
  const [date, setDate] = useState<ISODate>(plan.today);
  const [choice, setChoice] = useState(0);
  const dateGroup = useId();
  const mealGroup = useId();

  useEffect(() => {
    if (recipe) {
      setDate(plan.today);
      setChoice(0);
    }
  }, [recipe, plan.today]);

  const dates = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(plan.today, i)), [plan.today]);
  const dayPlan = plan.day(date);
  const options = recipe ? addOptions(dayPlan, recipe) : [];
  const selected = options[Math.min(choice, options.length - 1)];
  const conflictLines = useConflictLines(recipe ? recipeConflict(recipe, state.profile) : null, state.profile, recipe?.totalMinutes ?? 0);
  const warnId = useId();

  /** The meal's name as the day will show it once the recipe is added ("Snack" for a first snack). */
  const optionLabel = (o: AddOption): string => dayMealName(dayPlan, o.slot, o.index);
  const optionHint = (o: AddOption): string => {
    if (o.kind === 'replace') return t('add.replaces', { name: (o.replaces && lib.byId.get(o.replaces)?.name) || '' });
    if (o.kind === 'fill') return t('add.fills', { slot: slotLower(o.slot) });
    return t('add.addsSnack');
  };

  const confirm = () => {
    if (!recipe || !selected) return;
    const portion = portionForMeal(dayPlan, selected.slot, selected.index, recipe, state.profile, lib.byId);
    dispatch({ type: 'override', override: { date, slot: selected.slot, index: selected.index, recipeId: recipe.id, portion } });
    const target = date;
    notify(t('add.done', { name: recipe.name, slot: slotLower(selected.slot), date: friendlyDate(date, plan.today) }), {
      label: t('add.viewDay'),
      run: () => navigate({ name: 'today', date: target === plan.today ? null : target }),
    });
    onClose();
  };

  return (
    <Sheet
      open={recipe !== null}
      onClose={onClose}
      title={t('add.title')}
      subtitle={recipe?.name}
      media={recipe ? <RecipeImage recipe={recipe} kind="sheet" sizes="3.5rem" plateSize={56} /> : undefined}
      footer={
        selected ? (
          <button type="button" className="btn btn-primary btn-block" onClick={confirm} aria-describedby={conflictLines.length ? warnId : undefined}>
            {t('add.confirm', { slot: optionLabel(selected) })}
          </button>
        ) : undefined
      }
    >
      {conflictLines.length ? (
        <div className="notice add-conflict" id={warnId} role="note">
          <Icon name="info" size={20} />
          <div>
            <p className="add-conflict-title">{t('add.conflict')}</p>
            <ConflictNote lines={conflictLines} />
          </div>
        </div>
      ) : null}
      <fieldset className="chips">
        <legend className="field-label">{t('add.day')}</legend>
        <div className="day-chips">
          {dates.map((d) => (
            <label key={d} className="day-chip">
              <input
                type="radio"
                name={dateGroup}
                checked={d === date}
                onChange={() => {
                  setDate(d);
                  setChoice(0);
                }}
              />
              <span className="day-chip-week">{weekdayName(d)}</span>
              <span className="day-chip-num num">{formatDate(d, intlLocale(), { day: 'numeric' })}</span>
              {d === plan.today ? (
                <>
                  <span className="day-chip-today" aria-hidden="true" />
                  <span className="visually-hidden">{t('day.today')}</span>
                </>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>
      {options.length ? (
        <fieldset className="radio-cards">
          <legend className="field-label">{t('add.meal')}</legend>
          {options.map((o, i) => (
            <label key={`${o.slot}-${o.index}-${o.kind}`} className="radio-card">
              <input type="radio" name={mealGroup} checked={selected === o} onChange={() => setChoice(i)} />
              <span className="radio-card-text">
                <span className="radio-card-title">{optionLabel(o)}</span>
                <span className="radio-card-desc">{optionHint(o)}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="sheet-empty">{t('add.noSlot')}</p>
      )}
    </Sheet>
  );
}
