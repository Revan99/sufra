import type { DayPlan, MealSlot } from '../../types.ts';
import { t, tp } from '../../i18n/index.ts';
import { dietName, minutes, slotLower } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { dayMealName, explainUnfilled } from '../planHelpers.ts';
import type { FilterReason } from '../planHelpers.ts';
import { Icon } from './Icon.tsx';

/**
 * A meal no recipe can fill. Says why: the settings leave nothing (and which filter is strictest), or what fits is
 * already another meal of the day (a recipe is never planned twice on a day). Links to Settings and Recipes.
 */
export function UnfilledCard({ slot, index, label, dayPlan }: { slot: MealSlot; index: number; label: string; dayPlan: DayPlan }) {
  const { state } = useAppState();
  const lib = useLibrary();
  const profile = state.profile;
  const why = explainUnfilled(lib.catalog, profile, slot, dayPlan.meals);
  const value = (r: FilterReason): string => {
    if (r === 'diet') return dietName(profile.diet);
    if (r === 'time') return profile.maxTotalMinutes !== null ? minutes(profile.maxTotalMinutes) : '';
    return '';
  };
  const used = why.usedToday;
  const first = used[0];
  const reasons = why.reasons.length ? (
    <ul className="reasons">
      {why.reasons.map((r) => (
        <li key={r.reason}>
          {t(`unfilled.reason.${r.reason}`, { n: r.excluded, value: value(r.reason) })}
          {r.unlocks > 0 ? <span className="reason-unlock"> {t('unfilled.unlock', { n: r.unlocks })}</span> : null}
        </li>
      ))}
    </ul>
  ) : null;
  return (
    <article className="meal-card card unfilled" aria-labelledby={`unfilled-${slot}-${index}`}>
      <div className="unfilled-mark" aria-hidden="true">
        <Icon name="info" />
      </div>
      <div className="meal-main">
        <p className="eyebrow">{label}</p>
        <h3 className="meal-name" id={`unfilled-${slot}-${index}`}>
          {t('unfilled.title', { slot: slotLower(slot) })}
        </h3>
        {why.inSlot === 0 ? (
          <p className="unfilled-text">{t('unfilled.noneInLibrary', { slot: slotLower(slot) })}</p>
        ) : (
          <>
            {first ? (
              <>
                <p className="unfilled-text">
                  {used.length === 1
                    ? tp('unfilled.usedToday', 1, {
                        slot: slotLower(slot),
                        name: lib.byId.get(first.recipeId)?.name ?? first.recipeId,
                        other: dayMealName(dayPlan, first.slot, first.index).toLocaleLowerCase(),
                      })
                    : tp('unfilled.usedToday', used.length, { slot: slotLower(slot) })}
                </p>
                {reasons ? <p className="unfilled-text">{t('unfilled.relax')}</p> : null}
              </>
            ) : (
              <p className="unfilled-text">{tp('unfilled.excluded', why.inSlot, { slot: slotLower(slot) })}</p>
            )}
            {reasons}
            <div className="unfilled-actions">
              <a className="btn btn-quiet btn-sm" href="#/settings">
                <Icon name="sliders" size={20} />
                {t('common.openSettings')}
              </a>
              {first ? (
                <a className="btn btn-quiet btn-sm" href="#/recipes">
                  <Icon name="book" size={20} />
                  {t('unfilled.browse')}
                </a>
              ) : null}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
