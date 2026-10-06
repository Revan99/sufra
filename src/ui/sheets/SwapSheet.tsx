import { useMemo } from 'react';
import type { MealOverride, MealSlot } from '../../types.ts';
import { swapCandidates } from '../../lib/planner.ts';
import type { ISODate } from '../../lib/dates.ts';
import { t } from '../../i18n/index.ts';
import { cuisineName, kcal, minutes, num, portionLabel } from '../../i18n/labels.ts';
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
      title={target ? t('swap.title', { slot: target.label }) : ''}
      subtitle={currentRecipe ? t('swap.now', { name: currentRecipe.name }) : undefined}
      footer={
        existing ? (
          <button type="button" className="btn btn-quiet" onClick={restore}>
            <Icon name="undo" size={20} />
            {t('swap.restore')}
          </button>
        ) : undefined
      }
    >
      {candidates.length ? (
        <>
          <p className="sheet-hint">{t('swap.hint')}</p>
          <ul className="option-list">
            {candidates.map((c) => (
              <li key={c.recipe.id}>
                <button type="button" className="option" onClick={() => choose(c.recipe.id, c.portion, c.recipe.name)} aria-label={t('swap.choose', { name: c.recipe.name })}>
                  <RecipeImage recipe={c.recipe} kind="option" sizes="3.25rem" plateSize={52} />
                  <span className="option-text">
                    <span className="option-title">{c.recipe.name}</span>
                    <span className="option-meta">{t('common.dotPair', { a: cuisineName(c.recipe.cuisine), b: minutes(c.recipe.totalMinutes) })}</span>
                    <span className="option-figures num">
                      <span>{kcal(c.kcal)}</span>
                      <span>{t('value.proteinG', { n: num(c.protein) })}</span>
                      <span>{portionLabel(c.portion)}</span>
                    </span>
                  </span>
                  <Icon name="chevronRight" size={20} className="option-go flip-rtl" />
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
