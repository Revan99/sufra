// The recipe page. Phones: a full-bleed photo with glass controls, a white sheet over it with the title, nutrition
// tiles and Ingredients / Method / Video, and a floating Start cooking bar. Wide screens: a tall sticky photo card
// beside the details, with ingredients and method side by side. Start cooking opens cooking mode.
import { useRef, useState } from 'react';
import { recipeConflict } from '../planHelpers.ts';
import { progressKey, toggleStep, useCookProgress } from '../cookProgress.ts';
import type { CatalogRecipe, MealSlot } from '../../types.ts';
import type { ISODate } from '../../lib/dates.ts';
import { firstOpenStep, recipeHighlight } from '../../lib/cooking.ts';
import { t, tp } from '../../i18n/index.ts';
import { cuisineName, friendlyDate, minutes } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { usePlan } from '../plan.tsx';
import { goBack, recipeRoute, routeHash } from '../router.ts';
import { dayMealName } from '../planHelpers.ts';
import { photoKey, usePhotoFailed } from '../photo.ts';
import { useMediaQuery, WIDE_QUERY } from '../useMediaQuery.ts';
import { useWakeLock } from '../useWakeLock.ts';
import { Icon } from '../components/Icon.tsx';
import { RecipeImage } from '../components/RecipeImage.tsx';
import { useConflictLines } from '../components/Conflict.tsx';
import { EmptyState, Segmented } from '../components/controls.tsx';
import { Sheet } from '../components/Sheet.tsx';
import { useToast } from '../components/Toast.tsx';
import { AddToDaySheet } from '../sheets/AddToDaySheet.tsx';
import { CookingMode, useStepTimers } from './CookingMode.tsx';
import { AboutPanel, CreditPanel, IngredientsPanel, NutritionPanel, SafetyPanel, StatTiles, StepsPanel, TipsPanel, VideoPanel, videoHref } from './RecipeParts.tsx';

interface Props {
  id: string;
  date: ISODate | null;
  slot: MealSlot | null;
  index: number | null;
}

/** The hero photo's drawn width: the photo card on wide screens, the column on tablets, the screen on phones. */
const HERO_SIZES = '(min-width: 1000px) 32.5rem, (min-width: 700px) 40rem, 100vw';

type Tab = 'ingredients' | 'method' | 'video';
type MoreAction = 'add' | 'nutrition' | 'credit';

function useHeroPhoto(recipe: Pick<CatalogRecipe, 'photo'> | undefined): boolean {
  const photo = recipe?.photo;
  return !usePhotoFailed(photo ? photoKey(photo, HERO_SIZES) : null) && !!photo;
}

/** Scrolls a section into view and moves focus to its heading. */
function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
}

export function RecipeScreen({ id, date, slot, index }: Props) {
  const { state, dispatch } = useAppState();
  const lib = useLibrary();
  const plan = usePlan();
  const notify = useToast();
  const wide = useMediaQuery(WIDE_QUERY);
  const [adding, setAdding] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreAction = useRef<MoreAction | null>(null);
  const [cooking, setCooking] = useState<{ startAt: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  // The screen stays on once the user starts cooking (cooking mode, or ticking a step), unless they turn it off.
  const [wakeChoice, setWakeChoice] = useState<boolean | null>(null);
  const [started, setStarted] = useState(false);
  const recipe = lib.byId.get(id);
  const [progress, setProgress] = useCookProgress(progressKey(id, date, plan.today), plan.today);
  const [tab, setTab] = useState<Tab>(() => (progress.steps.length ? 'method' : 'ingredients'));
  const isCooking = started || cooking !== null || progress.steps.length > 0;
  const keepAwake = wakeChoice ?? isCooking;
  const wake = useWakeLock(keepAwake);
  const heroPhoto = useHeroPhoto(recipe);
  const conflictLines = useConflictLines(recipe ? recipeConflict(recipe, state.profile) : null, state.profile, recipe?.totalMinutes ?? 0);
  const cookingOpen = cooking !== null;
  const timers = useStepTimers((step) => {
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      // No vibration on this device.
    }
    const msg = t('cook.timerDoneStep', { n: step + 1 });
    if (cookingOpen) setAnnouncement((a) => (a === msg ? `${msg} ` : msg));
    else notify(msg);
  });

  const back = () => goBack(date ? { name: 'today', date: date === plan.today ? null : date } : { name: 'recipes' });
  const backLabel = date ? t('nav.today') : t('nav.recipes');

  if (!recipe) {
    return (
      <div className="rx-missing">
        <button type="button" className="icon-btn glass rx-missing-back" onClick={back} aria-label={t('common.back')}>
          <Icon name="chevronLeft" size={22} className="flip-rtl" />
        </button>
        <h1 tabIndex={-1} className="visually-hidden">
          {t('recipe.notFound.title')}
        </h1>
        <EmptyState
          icon="book"
          title={t('recipe.notFound.title')}
          action={
            <a className="btn btn-accent" href={routeHash({ name: 'recipes' })}>
              {t('recipe.browse')}
            </a>
          }
        >
          <p>{t('recipe.notFound.body')}</p>
        </EmptyState>
      </div>
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
  const glass = heroPhoto ? 'glass-clear' : 'glass';
  const highlight = recipeHighlight(recipe);
  const time = minutes(recipe.totalMinutes);
  const serves = tp('recipe.serves', recipe.servings);
  const eyebrowParts =
    meal && dayPlan ? [dayMealName(dayPlan, meal.slot, meal.index), friendlyDate(dayPlan.date, plan.today)] : [cuisineName(recipe.cuisine), ...(highlight ? [t(`recipe.highlight.${highlight}`)] : [])];
  const eyebrow = (wide ? [...eyebrowParts, time, serves] : eyebrowParts).join(t('common.sep'));
  const video = videoHref(recipe);
  const hasSteps = recipe.steps.length > 0;

  const toggleFavorite = () => {
    dispatch({ type: 'favorite', id: recipe.id });
    notify(t(favorite ? 'common.favoriteRemoved' : 'common.favoriteAdded', { name: recipe.name }));
  };
  const share = async () => {
    const url = `${location.origin}${location.pathname}${routeHash(recipeRoute(recipe.id))}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: recipe.name, url });
      } catch {
        // Cancelled.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      notify(t('recipe.linkCopied'));
    } catch {
      notify(t('recipe.copyFailed'));
    }
  };
  const startCooking = () => {
    setStarted(true);
    setAnnouncement('');
    setCooking({ startAt: firstOpenStep(recipe.steps.length, progress.steps) });
  };
  const tick = (i: number) => setProgress((p) => toggleStep(p, i, plan.today));
  const resetSteps = () => {
    setStarted(false);
    setProgress((p) => ({ ...p, steps: [] }));
  };
  const chooseMore = (a: MoreAction) => {
    moreAction.current = a;
    setMoreOpen(false);
  };
  // Runs after the More sheet has closed and given focus back to its button.
  const afterMore = () => {
    setMoreOpen(false);
    const a = moreAction.current;
    moreAction.current = null;
    if (a === 'add') setAdding(true);
    else if (a) window.setTimeout(() => jumpTo(a === 'nutrition' ? 'nutrition-h' : 'credit-h'), 0);
  };

  const ingredients = (
    <IngredientsPanel
      recipe={recipe}
      servings={servings}
      defaultServings={defaultServings}
      onServings={(n) => setProgress((p) => (n === defaultServings ? { steps: p.steps, day: p.day } : { ...p, servings: n }))}
      household={household}
      portion={portion}
    />
  );
  const steps = <StepsPanel recipe={recipe} done={progress.steps} onToggle={tick} onReset={resetSteps} />;
  const cookLabel = (
    <>
      <Icon name="flame" size={wide ? 18 : 19} />
      {t('recipe.startCooking')}
    </>
  );

  return (
    <article className={`rx${heroPhoto ? ' rx-photo' : ' rx-plate'}`} aria-labelledby="recipe-title">
      <div className="rx-hero bleed">
        <RecipeImage recipe={recipe} kind="hero" sizes={HERO_SIZES} plateSize={220} hero className="rx-hero-img" />
        {heroPhoto ? <span className="rx-hero-shade" aria-hidden="true" /> : null}
        <div className="rx-hero-top">
          <button type="button" className={`rx-back ${glass}`} onClick={back} aria-label={t('recipe.backTo', { screen: backLabel })}>
            <Icon name="chevronLeft" size={wide ? 20 : 22} className="flip-rtl" />
            {wide ? <span className="rx-back-label">{backLabel}</span> : null}
          </button>
          <div className={`capsule rx-tools ${glass}`}>
            <button type="button" className={`rx-tool${favorite ? ' is-fav' : ''}`} aria-pressed={favorite} aria-label={t('common.favoriteName', { name: recipe.name })} onClick={toggleFavorite}>
              <Icon name="heart" size={wide ? 18 : 19} />
            </button>
            <button type="button" className="rx-tool" aria-label={t('recipe.share')} onClick={() => void share()}>
              <Icon name="share" size={wide ? 18 : 19} />
            </button>
            <button type="button" className="rx-tool" aria-label={t('recipe.more')} aria-haspopup="dialog" onClick={() => setMoreOpen(true)}>
              <Icon name="ellipsis" size={wide ? 18 : 19} />
            </button>
          </div>
        </div>
        {wide ? (
          <a className={`rx-watch ${glass}`} href={video} target="_blank" rel="noopener noreferrer">
            <span className="rx-watch-play" aria-hidden="true">
              <Icon name="play" size={15} />
            </span>
            {t('recipe.video')}
            <span className="visually-hidden">{t('recipe.video.newTab')}</span>
          </a>
        ) : (
          <p className={`rx-chip ${glass}`}>
            <Icon name="timer" size={15} />
            <span>{t('common.dotPair', { a: time, b: serves })}</span>
          </p>
        )}
      </div>

      <div className="rx-body">
        <header className="rx-head">
          <p className="rx-eyebrow">{eyebrow}</p>
          <h1 id="recipe-title" tabIndex={-1} className="rx-title">
            {recipe.name}
          </h1>
          {recipe.nativeName ? (
            <p className="rx-native">
              <bdi>{recipe.nativeName}</bdi>
            </p>
          ) : null}
          {wide ? <p className="rx-desc">{recipe.description}</p> : null}
        </header>

        {conflictLines.length ? (
          <div className="notice rx-conflict">
            <Icon name="info" size={18} />
            <ul>
              {conflictLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <StatTiles recipe={recipe} portion={portion} wide={wide} kcalTarget={state.profile.kcalTarget} proteinTarget={state.profile.proteinTarget} />

        {wide ? (
          <>
            <div className="rx-columns">
              {ingredients}
              {steps}
            </div>
            <div className="rx-actions">
              {hasSteps ? (
                <button type="button" className="glass-accent rx-cook" onClick={startCooking}>
                  {cookLabel}
                </button>
              ) : null}
              <button type="button" className="rx-add" onClick={() => setAdding(true)}>
                <Icon name="calendarPlus" size={18} />
                {t('recipe.addToDay')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="rx-tabs">
              <Segmented
                label={t('recipe.sections')}
                hideLabel
                options={[
                  { value: 'ingredients', label: t('recipe.ingredients') },
                  { value: 'method', label: t('recipe.steps') },
                  { value: 'video', label: t('recipe.tab.video') },
                ]}
                value={tab}
                onChange={setTab}
              />
            </div>
            <div className="rx-panel">{tab === 'ingredients' ? ingredients : tab === 'method' ? steps : <VideoPanel recipe={recipe} />}</div>
          </>
        )}

        <div className="rx-details">
          <AboutPanel recipe={recipe} showDescription={!wide}>
            {!wide ? (
              <button type="button" className="btn btn-quiet btn-block rx-add-phone" onClick={() => setAdding(true)}>
                <Icon name="calendarPlus" size={18} />
                {t('recipe.addToDay')}
              </button>
            ) : null}
          </AboutPanel>
          <NutritionPanel recipe={recipe} portion={portion} kcalTarget={state.profile.kcalTarget} proteinTarget={state.profile.proteinTarget} />
          <SafetyPanel recipe={recipe} />
          <TipsPanel recipe={recipe} />
          {wide ? <VideoPanel recipe={recipe} /> : null}
          {heroPhoto ? <CreditPanel recipe={recipe} /> : null}
        </div>
      </div>

      {!wide ? (
        <div className="rx-bar">
          {hasSteps ? (
            <button type="button" className="glass-accent rx-bar-cook" onClick={startCooking}>
              {cookLabel}
            </button>
          ) : null}
          <a className="glass rx-bar-play" href={video} target="_blank" rel="noopener noreferrer" aria-label={`${t('recipe.video')} ${t('recipe.video.newTab')}`}>
            <Icon name="play" size={21} className="flip-rtl" />
          </a>
        </div>
      ) : null}

      <Sheet open={moreOpen} onClose={afterMore} title={recipe.name} subtitle={recipe.nativeName} className="rx-more">
        <ul className="list-card rx-more-list">
          <li>
            <button type="button" className="rx-more-item" onClick={() => chooseMore('add')}>
              <Icon name="calendarPlus" size={20} />
              {t('recipe.addToDay')}
            </button>
          </li>
          <li>
            <a className="rx-more-item" href={video} target="_blank" rel="noopener noreferrer" onClick={() => setMoreOpen(false)}>
              <Icon name="playCircle" size={20} />
              {t('recipe.video')}
              <span className="visually-hidden">{t('recipe.video.newTab')}</span>
            </a>
          </li>
          <li>
            <button type="button" className="rx-more-item" onClick={() => chooseMore('nutrition')}>
              <Icon name="info" size={20} />
              {t('recipe.more.nutrition')}
            </button>
          </li>
          {heroPhoto ? (
            <li>
              <button type="button" className="rx-more-item" onClick={() => chooseMore('credit')}>
                <Icon name="camera" size={20} />
                {t('recipe.more.credit')}
              </button>
            </li>
          ) : null}
          {wake.supported ? (
            <li>
              <label className="rx-more-item rx-more-switch">
                <Icon name="screen" size={20} />
                <span className="rx-more-switch-text">{t('recipe.wakeLock')}</span>
                <input type="checkbox" role="switch" className="rx-switch" checked={keepAwake} onChange={(e) => setWakeChoice(e.currentTarget.checked)} />
              </label>
            </li>
          ) : null}
          {progress.steps.length ? (
            <li>
              <button
                type="button"
                className="rx-more-item"
                onClick={() => {
                  resetSteps();
                  setMoreOpen(false);
                }}
              >
                <Icon name="restart" size={20} />
                {t('recipe.stepsReset')}
              </button>
            </li>
          ) : null}
        </ul>
      </Sheet>
      <AddToDaySheet recipe={adding ? recipe : null} onClose={() => setAdding(false)} />
      {cooking ? (
        <CookingMode
          recipe={recipe}
          startAt={cooking.startAt}
          done={progress.steps}
          onTick={tick}
          onClose={() => setCooking(null)}
          onFinish={() => {
            setCooking(null);
            notify(t('cook.finished'));
          }}
          timers={timers}
          announcement={announcement}
          showPhoto={heroPhoto}
          photoSizes={HERO_SIZES}
          wake={{ supported: wake.supported, on: keepAwake, toggle: () => setWakeChoice(!keepAwake) }}
        />
      ) : null}
    </article>
  );
}
