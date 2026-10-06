import { useState } from 'react';
import { recipeConflict } from '../planHelpers.ts';
import { progressKey, toggleStep, useCookProgress } from '../cookProgress.ts';
import type { MealSlot } from '../../types.ts';
import type { ISODate } from '../../lib/dates.ts';
import { t, tp } from '../../i18n/index.ts';
import { cuisineName, friendlyDate, minutes } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { usePlan } from '../plan.tsx';
import { goBack } from '../router.ts';
import { dayMealName } from '../planHelpers.ts';
import { useWakeLock } from '../useWakeLock.ts';
import { Icon } from '../components/Icon.tsx';
import { HERO_SIZES, PhotoCreditText, RecipeImage, useHeroPhoto } from '../components/RecipeImage.tsx';
import { ConflictNote, DietBadges, FavoriteButton, useConflictLines } from '../components/MealCard.tsx';
import { EmptyState } from '../components/controls.tsx';
import { useToast } from '../components/Toast.tsx';
import { AddToDaySheet } from '../sheets/AddToDaySheet.tsx';
import { IngredientsPanel, NutritionPanel, SafetyPanel, StepsPanel, VideoPanel } from './RecipeParts.tsx';

interface Props {
  id: string;
  date: ISODate | null;
  slot: MealSlot | null;
  index: number | null;
}

export function RecipeScreen({ id, date, slot, index }: Props) {
  const { state, dispatch } = useAppState();
  const lib = useLibrary();
  const plan = usePlan();
  const notify = useToast();
  const [adding, setAdding] = useState(false);
  // The screen stays on once the user starts cooking (Start cooking, or ticking a step), unless they turn it off.
  const [wakeChoice, setWakeChoice] = useState<boolean | null>(null);
  const [started, setStarted] = useState(false);
  const recipe = lib.byId.get(id);
  const [progress, setProgress] = useCookProgress(progressKey(id, date, plan.today), plan.today);
  const cooking = started || progress.steps.length > 0;
  const keepAwake = wakeChoice ?? cooking;
  const wake = useWakeLock(keepAwake);
  const heroPhoto = useHeroPhoto(recipe ?? {});
  const conflictLines = useConflictLines(recipe ? recipeConflict(recipe, state.profile) : null, state.profile, recipe?.totalMinutes ?? 0);

  const back = () => goBack(date ? { name: 'today', date: date === plan.today ? null : date } : { name: 'recipes' });
  const backButton = (
    <button type="button" className="btn btn-quiet back-btn" onClick={back}>
      <Icon name="arrowLeft" size={20} className="flip-rtl" />
      {t('common.back')}
    </button>
  );

  if (!recipe) {
    return (
      <>
        <header className="screen-head">{backButton}</header>
        <h1 tabIndex={-1} className="visually-hidden">
          {t('recipe.notFound.title')}
        </h1>
        <EmptyState icon="book" title={t('recipe.notFound.title')} action={<a className="btn btn-primary" href="#/recipes">{t('recipe.browse')}</a>}>
          <p>{t('recipe.notFound.body')}</p>
        </EmptyState>
      </>
    );
  }

  // The planned meal this page was opened from, when it still holds this recipe.
  const dayPlan = date && slot !== null ? plan.day(date) : null;
  const meal = dayPlan?.meals.find((m) => m.slot === slot && m.index === (index ?? 0) && m.recipeId === recipe.id);
  const portion = meal?.portion ?? 1;
  const household = state.profile.householdSize;
  const favorite = state.favorites.includes(recipe.id);
  const defaultServings = household * portion;
  const servings = progress.servings ?? defaultServings;

  const startCooking = () => {
    setStarted(true);
    const h = document.getElementById('ingredients-h');
    h?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    h?.focus({ preventScroll: true });
  };
  const addButton = (primary: boolean) => (
    <button type="button" className={`btn ${primary ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setAdding(true)}>
      <Icon name="calendarPlus" size={20} />
      {t('recipe.addToDay')}
    </button>
  );
  const cookButton = (primary: boolean) => (
    <button type="button" className={`btn ${primary ? 'btn-primary' : 'btn-quiet'}`} onClick={startCooking}>
      <Icon name="flame" size={20} />
      {t('recipe.startCooking')}
    </button>
  );

  return (
    <article className="recipe" aria-labelledby="recipe-title">
      <header className="screen-head">{backButton}</header>
      <div className={`recipe-hero${heroPhoto ? ' has-photo' : ''}`}>
        {heroPhoto && recipe.photo ? (
          <figure className="recipe-media">
            <RecipeImage recipe={recipe} kind="hero" sizes={HERO_SIZES} plateSize={148} hero className="recipe-photo" />
            <figcaption className="photo-credit">
              <PhotoCreditText credit={recipe.photo.credit} />
            </figcaption>
          </figure>
        ) : (
          <RecipeImage recipe={recipe} kind="hero" sizes={HERO_SIZES} plateSize={148} hero className="recipe-plate" />
        )}
        <div className="recipe-intro">
          <p className="eyebrow">
            {meal && dayPlan ? t('recipe.planned', { slot: dayMealName(dayPlan, meal.slot, meal.index), date: friendlyDate(dayPlan.date, plan.today) }) : cuisineName(recipe.cuisine)}
          </p>
          <h1 id="recipe-title" tabIndex={-1} className="recipe-title">
            {recipe.name}
          </h1>
          {recipe.nativeName ? <p className="native native-lg">{recipe.nativeName}</p> : null}
          <p className="recipe-desc">{recipe.description}</p>
          <ul className="facts">
            <li className="fact">
              <Icon name="clock" size={18} />
              {t('recipe.total', { time: minutes(recipe.totalMinutes) })}
            </li>
            <li className="fact">{t('recipe.prep', { time: minutes(recipe.prepMinutes) })}</li>
            {recipe.cookMinutes > 0 ? <li className="fact">{t('recipe.cook', { time: minutes(recipe.cookMinutes) })}</li> : null}
            <li className="fact">
              <Icon name="people" size={18} />
              {tp('recipe.makes', recipe.servings)}
            </li>
          </ul>
          <DietBadges recipe={recipe} quick />
          <ConflictNote lines={conflictLines} />
          <div className="recipe-actions">
            {meal ? cookButton(true) : addButton(true)}
            {meal ? addButton(false) : cookButton(false)}
            <FavoriteButton
              active={favorite}
              name={recipe.name}
              onToggle={() => {
                dispatch({ type: 'favorite', id: recipe.id });
                notify(t(favorite ? 'common.favoriteRemoved' : 'common.favoriteAdded', { name: recipe.name }));
              }}
            />
          </div>
        </div>
      </div>

      {/* Phones read top to bottom: ingredients, method, then nutrition. Wide screens put nutrition under the
          ingredients, beside the method (see .recipe-grid in recipe.css). */}
      <div className="recipe-grid">
        <div className="recipe-col recipe-col-ingredients">
          <IngredientsPanel
            recipe={recipe}
            servings={servings}
            defaultServings={defaultServings}
            onServings={(n) => setProgress((p) => (n === defaultServings ? { steps: p.steps, day: p.day } : { ...p, servings: n }))}
            household={household}
            portion={portion}
          />
        </div>
        <div className="recipe-col recipe-col-method">
          {wake.supported ? (
            <label className="switch-row card">
              <Icon name="screen" size={20} />
              <span className="switch-text">{t('recipe.wakeLock')}</span>
              <input type="checkbox" role="switch" className="switch" checked={keepAwake} onChange={(e) => setWakeChoice(e.currentTarget.checked)} />
            </label>
          ) : null}
          <StepsPanel
            recipe={recipe}
            done={progress.steps}
            onToggle={(i) => setProgress((p) => toggleStep(p, i, plan.today))}
            onReset={() => {
              setStarted(false);
              setProgress((p) => ({ ...p, steps: [] }));
            }}
          />
          {recipe.tips?.length ? (
            <section className="card panel" aria-labelledby="tips-h">
              <h2 id="tips-h" className="panel-title">
                {t('recipe.tips')}
              </h2>
              <ul className="notes">
                {recipe.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {recipe.storage ? (
            <section className="card panel" aria-labelledby="storage-h">
              <h2 id="storage-h" className="panel-title">
                {t('recipe.storage')}
              </h2>
              <p className="panel-text">{recipe.storage}</p>
            </section>
          ) : null}
          <VideoPanel recipe={recipe} />
        </div>
        <div className="recipe-col recipe-col-facts">
          <NutritionPanel recipe={recipe} portion={portion} kcalTarget={state.profile.kcalTarget} proteinTarget={state.profile.proteinTarget} />
          <SafetyPanel recipe={recipe} />
        </div>
      </div>
      <AddToDaySheet recipe={adding ? recipe : null} onClose={() => setAdding(false)} />
    </article>
  );
}
