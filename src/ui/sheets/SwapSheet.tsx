import { useMemo } from 'react';
import type { MealOverride, MealSlot } from '../../types.ts';
import { swapCandidates } from '../../lib/planner.ts';
import type { ISODate } from '../../lib/dates.ts';
import { t } from '../../i18n/index.ts';
import { cuisineName, kcal, minutes, num, portionLabel, slotLower, slotName } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { usePlan } from '../plan.tsx';
import { Icon } from '../components/Icon.tsx';
import { RecipeImage } from '../components/RecipeImage.tsx';
import { Sheet } from '../components/Sheet.tsx';
import { useToast } from '../components/Toast.tsx';

export interface SwapTarget {
  date: ISODate;
  slot: MealSlot;
  index: number;
  /** "Lunch", "Snack 2". */
  label: string;
}

/** The meal's name inside a sentence: "lunch", but a numbered snack keeps its label ("Snack 2"). */
function slotInSentence(target: SwapTarget): string {
  return target.label === slotName(target.slot) ? slotLower(target.slot) : target.label;
}

/** Alternatives for one meal, best fit first. Choosing one saves an override and announces it. */
export function SwapSheet({ target, onClose }: { target: SwapTarget | null; onClose: () => void }) {
  const { state, dispatch } = useAppState();
  const lib = useLibrary();
  const plan = usePlan();
  const notify = useToast();

  const candidates = useMemo(() => (target ? swapCandidates(target.date, target.slot, target.index, plan.ctx, 8) : []), [target, plan.ctx]);
  const current = target ? plan.day(target.date).meals.find((m) => m.slot === target.slot && m.index === target.index) : undefined;
  const currentRecipe = current ? lib.byId.get(current.recipeId) : undefined;
  const existing = target
    ? state.overrides.find((o) => o.date === target.date && o.slot === target.slot && o.index === target.index)
    : undefined;
  const slotText = target ? slotInSentence(target) : '';

  const undoTo = (prev: MealOverride | undefined, t0: SwapTarget) => () => {
    if (prev) dispatch({ type: 'override', override: prev });
    else dispatch({ type: 'clearOverride', date: t0.date, slot: t0.slot, index: t0.index });
  };

  const choose = (recipeId: string, portion: number, name: string) => {
    if (!target) return;
    dispatch({ type: 'override', override: { date: target.date, slot: target.slot, index: target.index, recipeId, portion } });
    notify(t('swap.done', { slot: target.label, name }), { label: t('common.undo'), run: undoTo(existing, target) });
    onClose();
  };

  const restore = () => {
    if (!target) return;
    dispatch({ type: 'clearOverride', date: target.date, slot: target.slot, index: target.index });
    notify(t('swap.restored', { slot: target.label }), { label: t('common.undo'), run: undoTo(existing, target) });
    onClose();
  };

  return (
    <Sheet
      open={target !== null}
      onClose={onClose}
      className="pick-sheet"
      title={target ? t('swap.title', { slot: slotText }) : ''}
      footer={
        existing ? (
          <button type="button" className="btn btn-quiet btn-block" onClick={restore}>
            <Icon name="undo" size={20} />
            {t('swap.restore')}
          </button>
        ) : undefined
      }
    >
      {currentRecipe ? (
        <div className="pick-now">
          <RecipeImage recipe={currentRecipe} kind="option" sizes="2.75rem" plateSize={44} className="pick-now-img" />
          <p className="pick-now-text">
            <span className="pick-now-label">{t('pick.now')}</span>
            <span className="pick-now-name">{currentRecipe.name}</span>
          </p>
        </div>
      ) : null}
      {candidates.length ? (
        <>
          <p className="pick-hint">{t('swap.hint')}</p>
          <ul className="pick-list">
            {candidates.map((c, i) => (
              <li key={c.recipe.id} className="pick-row">
                <RecipeImage recipe={c.recipe} kind="option" sizes="3.375rem" plateSize={54} className="pick-img" />
                <div className="pick-text">
                  <p className="pick-name">{c.recipe.name}</p>
                  <p className="pick-meta">{t('common.dotPair', { a: c.recipe.nativeName ?? cuisineName(c.recipe.cuisine), b: minutes(c.recipe.totalMinutes) })}</p>
                  <p className="pick-figures num">
                    <span className="pick-figs">
                      {[kcal(c.kcal), t('value.proteinG', { n: num(c.protein) }), ...(c.portion === 1 ? [] : [portionLabel(c.portion)])].map((part) => (
                        <span key={part} className="pick-fig">
                          {part}
                        </span>
                      ))}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  className={`btn pick-btn stretched ${i === 0 ? 'btn-accent' : 'btn-quiet'}`}
                  onClick={() => choose(c.recipe.id, c.portion, c.recipe.name)}
                  aria-label={t('pick.chooseFor', { name: c.recipe.name, slot: slotText })}
                >
                  {t('pick.choose')}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="sheet-empty">{t('swap.empty')}</p>
      )}
    </Sheet>
  );
}
