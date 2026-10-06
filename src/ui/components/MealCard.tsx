import { useId, useState } from 'react';
import type { CatalogRecipe, PlannedMeal, Profile } from '../../types.ts';
import { QUICK_MINUTES } from '../../lib/filters.ts';
import { t } from '../../i18n/index.ts';
import { allergenName, cuisineName, dietName, kcal, listJoin, minutes, num, portionLabel, portionNumber } from '../../i18n/labels.ts';
import { recipeRoute, routeHash } from '../router.ts';
import type { ISODate } from '../../lib/dates.ts';
import type { Conflict } from '../planHelpers.ts';
import { useLibrary } from '../library.tsx';
import { Icon } from './Icon.tsx';
import { RecipeImage } from './RecipeImage.tsx';

/** Meal-card photos: 76 px on phones, 104 px on wide screens (always the thumbnail at 1x and 2x). */
const MEAL_SIZES = '(min-width: 900px) 6.5rem, 4.75rem';

/** Up to three short diet badges for a recipe. */
export function DietBadges({ recipe, quick = false }: { recipe: CatalogRecipe; quick?: boolean }) {
  const f = recipe.flags;
  const badges: string[] = [];
  if (f.vegan) badges.push(t('badge.vegan'));
  else if (f.vegetarian) badges.push(t('badge.vegetarian'));
  else if (f.pescatarian) badges.push(t('badge.pescatarian'));
  if (f.glutenFree) badges.push(t('badge.glutenFree'));
  if (f.dairyFree && !f.vegan) badges.push(t('badge.dairyFree'));
  if (quick && recipe.totalMinutes <= QUICK_MINUTES) badges.push(t('badge.quick'));
  if (!badges.length) return null;
  return (
    <ul className="badges">
      {badges.slice(0, 3).map((b) => (
        <li key={b} className="badge">
          {b}
        </li>
      ))}
    </ul>
  );
}

export function FavoriteButton({ active, onToggle, name }: { active: boolean; onToggle: () => void; name: string }) {
  return (
    <button type="button" className={`icon-btn fav-btn${active ? ' is-on' : ''}`} aria-pressed={active} aria-label={t('common.favoriteName', { name })} onClick={onToggle}>
      <Icon name="heart" className={active ? 'icon-filled' : undefined} />
    </button>
  );
}

/** Sentences for what in a recipe goes against the user's settings ("Contains egg, which you avoid"). */
export function useConflictLines(conflict: Conflict | null, profile: Profile, totalMinutes: number): string[] {
  const lib = useLibrary();
  if (!conflict) return [];
  const lines: string[] = [];
  if (conflict.allergens.length) lines.push(t('meal.conflict.allergen', { list: listJoin(conflict.allergens.map((a) => allergenName(a).toLocaleLowerCase())) }));
  if (conflict.disliked.length) lines.push(t('meal.conflict.disliked', { list: listJoin(conflict.disliked.map((id) => lib.ingredientIndex.get(id)?.name.toLocaleLowerCase() ?? id)) }));
  if (conflict.diet) lines.push(t('meal.conflict.diet', { diet: dietName(profile.diet) }));
  if (conflict.time && profile.maxTotalMinutes !== null) lines.push(t('meal.conflict.time', { time: minutes(totalMinutes), limit: minutes(profile.maxTotalMinutes) }));
  return lines;
}

/** A warning under a meal or recipe that no longer fits the settings. */
export function ConflictNote({ lines, id }: { lines: readonly string[]; id?: string }) {
  if (!lines.length) return null;
  return (
    <ul className="conflict" id={id}>
      {lines.map((line) => (
        <li key={line}>
          <Icon name="info" size={16} />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

interface Props {
  meal: PlannedMeal;
  recipe: CatalogRecipe;
  date: ISODate;
  label: string;
  profile: Profile;
  /** The user picked this meal (a swap or "Add to a day"). */
  overridden: boolean;
  /** The pick added a meal the profile doesn't plan: undoing it removes the meal. */
  added: boolean;
  /** What in the recipe goes against the settings (for picks made before a setting changed). */
  conflict: Conflict | null;
  favorite: boolean;
  onSwap: () => void;
  onRestore: () => void;
  onToggleFavorite: () => void;
}

/** One planned meal: photo (or plate), names, time, kcal and protein for the portion, badges, and its actions. */
export function MealCard({ meal, recipe, date, label, profile, overridden, added, conflict, favorite, onSwap, onRestore, onToggleFavorite }: Props) {
  const [portionOpen, setPortionOpen] = useState(false);
  const helpId = useId();
  const k = recipe.perServing.kcal * meal.portion;
  const p = recipe.perServing.protein * meal.portion;
  const href = routeHash(recipeRoute(recipe.id, { date, slot: meal.slot, index: meal.index }));
  const nameId = `meal-${meal.slot}-${meal.index}`;
  const lines = useConflictLines(conflict, profile, recipe.totalMinutes);
  return (
    <article className={`meal-card card${lines.length ? ' has-conflict' : ''}`} aria-labelledby={nameId}>
      <RecipeImage recipe={recipe} kind="meal" sizes={MEAL_SIZES} plateSize={76} className="meal-plate" />
      <div className="meal-main">
        <p className="eyebrow">
          {label}
          {overridden ? <span className="pick-tag">{t('badge.yourPick')}</span> : null}
        </p>
        <h3 className="meal-name" id={nameId}>
          <a href={href} className="stretched">
            {recipe.name}
          </a>
        </h3>
        {recipe.nativeName ? <p className="native">{recipe.nativeName}</p> : null}
        <p className="meta">
          <span>{cuisineName(recipe.cuisine)}</span>
          <span className="meta-sep" aria-hidden="true">
            ·
          </span>
          <span className="meta-time">
            <Icon name="clock" size={16} />
            {minutes(recipe.totalMinutes)}
          </span>
        </p>
        <p className="figures">
          <span className="figure num">{kcal(k)}</span>
          <span className="figure num">{t('value.proteinG', { n: num(p) })}</span>
          <button type="button" className="portion-chip" aria-expanded={portionOpen} aria-controls={helpId} onClick={() => setPortionOpen((o) => !o)}>
            {portionLabel(meal.portion)}
            <Icon name="info" size={14} />
          </button>
        </p>
        <p id={helpId} className="portion-help" hidden={!portionOpen}>
          {t('meal.portionHelp', { portion: portionNumber(meal.portion), kcal: num(profile.kcalTarget) })}
        </p>
        <ConflictNote lines={lines} />
        <DietBadges recipe={recipe} />
      </div>
      <div className="meal-actions">
        <button type="button" className={`btn btn-sm ${lines.length ? 'btn-primary' : 'btn-quiet'}`} onClick={onSwap} aria-label={t('meal.swapFor', { slot: label })}>
          <Icon name="swap" size={20} />
          <span>{t('meal.swap')}</span>
        </button>
        {overridden ? (
          <button type="button" className="btn btn-quiet btn-sm" onClick={onRestore}>
            <Icon name={added ? 'close' : 'undo'} size={20} />
            <span>{t(added ? 'meal.remove' : 'meal.restore')}</span>
          </button>
        ) : null}
        <FavoriteButton active={favorite} onToggle={onToggleFavorite} name={recipe.name} />
      </div>
    </article>
  );
}
