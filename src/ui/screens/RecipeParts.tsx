// The recipe page's panels: stat tiles, scaled ingredients, tickable steps, reference video, nutrition, allergens and
// halal notes, tips, storage and the photo credit. Recipe.tsx lays them out for phones and wide screens.
import type { ReactNode } from 'react';
import type { CatalogRecipe, Nutrients } from '../../types.ts';
import { NUTRIENT_KEYS } from '../../types.ts';
import { QUICK_MINUTES } from '../../lib/filters.ts';
import { t, tq } from '../../i18n/index.ts';
import { tx } from '../../i18n/nodes.tsx';
import { allergenName, amountLabel, grams, num, nutrientName, nutrientValue, percent, portionLabel, portionNumber } from '../../i18n/labels.ts';
import { useLibrary } from '../library.tsx';
import { Stepper } from '../components/controls.tsx';
import { SODIUM_LIMIT_MG } from '../dayStatus.ts';
import { Icon } from '../components/Icon.tsx';
import { PhotoCreditText } from '../components/RecipeImage.tsx';

/** A recipe's reference video on YouTube, or a YouTube search when no video has been picked. Never embedded. */
export function videoHref(recipe: CatalogRecipe): string {
  const v = recipe.video;
  return v ? `https://www.youtube.com/watch?v=${v.youtubeId}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(videoQuery(recipe))}`;
}

function videoQuery(recipe: CatalogRecipe): string {
  return `${recipe.nativeName ?? recipe.name} recipe`;
}

type StatKey = 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sodium';

/** Nutrition tiles for the portion: kcal, protein, carbs, fat (phones), plus fiber and sodium and the share of the
 *  daily target (wide screens). */
export function StatTiles({ recipe, portion, wide, kcalTarget, proteinTarget }: { recipe: CatalogRecipe; portion: number; wide: boolean; kcalTarget: number; proteinTarget: number }) {
  const keys: StatKey[] = wide ? ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sodium'] : ['kcal', 'protein', 'carbs', 'fat'];
  const value = (k: keyof Nutrients) => recipe.perServing[k] * portion;
  const shown = (k: StatKey) => (k === 'kcal' ? num(value(k)) : k === 'sodium' ? t('value.mg', { n: num(value(k)) }) : grams(value(k)));
  const label = (k: StatKey) => {
    const name = t(`recipe.stat.${k}`);
    if (!wide) return name;
    if (k === 'kcal') return t('common.dotPair', { a: name, b: percent(value(k) / kcalTarget) });
    if (k === 'protein') return t('common.dotPair', { a: name, b: percent(value(k) / proteinTarget) });
    return name;
  };
  return (
    <ul className="rx-stats" aria-label={t('recipe.statsLabel')}>
      {keys.map((k) => (
        <li key={k} className="rx-stat">
          <span className="rx-stat-value num">{shown(k)}</span> <span className="rx-stat-label">{label(k)}</span>
        </li>
      ))}
    </ul>
  );
}

function stepUp(v: number): number {
  const s = v < 2 ? 0.25 : v < 6 ? 0.5 : 1;
  return Math.floor(v / s + 1e-9) * s + s;
}

function stepDown(v: number): number {
  const s = v <= 2 ? 0.25 : v <= 6 ? 0.5 : 1;
  return Math.ceil(v / s - 1e-9) * s - s;
}

export function IngredientsPanel({
  recipe,
  servings,
  defaultServings,
  onServings,
  household,
  portion,
}: {
  recipe: CatalogRecipe;
  servings: number;
  defaultServings: number;
  onServings: (n: number) => void;
  household: number;
  portion: number;
}) {
  const lib = useLibrary();
  const factor = servings / recipe.servings;
  return (
    <section className="rx-card rx-ingredients" aria-labelledby="ingredients-h" id="ingredients">
      <div className="rx-card-head rx-ing-head">
        <h2 id="ingredients-h" className="rx-card-title" tabIndex={-1}>
          {t('recipe.ingredients')}
        </h2>
        <Stepper label={t('recipe.servingsLabel')} value={servings} display={portionNumber(servings)} onChange={onServings} min={0.5} max={24} next={stepUp} prev={stepDown} />
      </div>
      {servings === defaultServings && (household > 1 || portion !== 1) ? <p className="rx-hint">{t('recipe.scaledHint', { people: household, portion: portionLabel(portion) })}</p> : null}
      <ul className="rx-ing-list">
        {recipe.ingredients.map((ri, i) => {
          const ing = lib.ingredientIndex.get(ri.ingredientId);
          const metric = ri.unit === 'g' || ri.unit === 'kg' || ri.unit === 'ml' || ri.unit === 'l';
          const name = ing?.name ?? ri.ingredientId;
          return (
            <li key={`${ri.ingredientId}-${i}`} className="rx-ing">
              <span className="rx-ing-name">
                {ri.prep ? tx('recipe.withPrep', { name, prep: <span className="rx-ing-prep">{ri.prep}</span> }) : name}
                {ri.optional ? <span className="rx-ing-opt"> {t('recipe.optional')}</span> : null}
              </span>
              <span className="rx-ing-amount num">
                {amountLabel(ri.qty, ri.unit, factor)}
                {!metric ? <span className="rx-ing-grams">{grams(ri.grams * factor)}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function StepsPanel({ recipe, done, onToggle, onReset }: { recipe: CatalogRecipe; done: readonly number[]; onToggle: (i: number) => void; onReset: () => void }) {
  return (
    <section className="rx-card rx-method" aria-labelledby="steps-h" id="method">
      <div className="rx-card-head">
        <h2 id="steps-h" className="rx-card-title" tabIndex={-1}>
          {t('recipe.steps')}
        </h2>
        <p className="rx-card-hint">{t('recipe.stepsHint')}</p>
      </div>
      <ol className="rx-steps">
        {recipe.steps.map((s, i) => {
          const on = done.includes(i);
          return (
            <li key={i} className={`rx-step${on ? ' is-done' : ''}`}>
              <label className="rx-step-label">
                <input type="checkbox" className="rx-step-check" checked={on} onChange={() => onToggle(i)} />
                <span className="rx-step-badge num" aria-hidden="true">
                  {on ? <Icon name="check" size={14} /> : i + 1}
                </span>
                <span className="rx-step-text">
                  <span className="visually-hidden">{t('cook.stepOf', { n: i + 1, total: recipe.steps.length })}: </span>
                  {s}
                </span>
              </label>
            </li>
          );
        })}
      </ol>
      {done.length ? (
        <button type="button" className="btn btn-plain btn-sm rx-steps-reset" onClick={onReset}>
          <Icon name="restart" size={16} />
          {t('recipe.stepsReset')}
        </button>
      ) : null}
    </section>
  );
}

/** The reference video: what it is, how close it is to this recipe, and a link out to YouTube. */
export function VideoPanel({ recipe }: { recipe: CatalogRecipe }) {
  const v = recipe.video;
  return (
    <section className="rx-card rx-video" aria-labelledby="video-h">
      <h2 id="video-h" className="rx-card-title">
        {t('recipe.video')}
      </h2>
      <div className="rx-video-body">
        <span className="rx-video-mark" aria-hidden="true">
          <Icon name="playCircle" size={28} />
        </span>
        <div className="rx-video-text">
          {v ? (
            <>
              <p className="rx-video-title">
                {/* bdi keeps a right-to-left Kurdish, Arabic or Persian title in order inside the sentence. */}
                {v.language === 'en'
                  ? tx('recipe.video.about', { title: <bdi>{v.title}</bdi>, channel: <bdi>{v.channel}</bdi> })
                  : tx('recipe.video.aboutIn', { title: <bdi>{v.title}</bdi>, channel: <bdi>{v.channel}</bdi>, language: t(`videoLanguage.${v.language}`) })}
              </p>
              <p className="rx-hint">{t(v.match === 'exact' ? 'recipe.video.exact' : 'recipe.video.close')}</p>
            </>
          ) : (
            <p className="rx-hint">{t('recipe.video.searchHint', { query: videoQuery(recipe) })}</p>
          )}
        </div>
      </div>
      <a className="btn btn-quiet rx-video-link" href={videoHref(recipe)} target="_blank" rel="noopener noreferrer">
        <Icon name="play" size={18} />
        {t(v ? 'recipe.video.watch' : 'recipe.video.search')}
        <span className="visually-hidden">{t('recipe.video.newTab')}</span>
      </a>
    </section>
  );
}

/** Description and diet badges (phones show the description here; wide screens show it under the title). */
export function AboutPanel({ recipe, showDescription, children }: { recipe: CatalogRecipe; showDescription: boolean; children?: ReactNode }) {
  const f = recipe.flags;
  const badges: string[] = [];
  if (f.vegan) badges.push(t('badge.vegan'));
  else if (f.vegetarian) badges.push(t('badge.vegetarian'));
  else if (f.pescatarian) badges.push(t('badge.pescatarian'));
  if (f.glutenFree) badges.push(t('badge.glutenFree'));
  if (f.dairyFree && !f.vegan) badges.push(t('badge.dairyFree'));
  if (recipe.totalMinutes <= QUICK_MINUTES) badges.push(t('badge.quick'));
  if (!showDescription && !badges.length && !children) return null;
  return (
    <section className="rx-card rx-about" aria-labelledby="about-h">
      <h2 id="about-h" className="rx-card-title">
        {t('recipe.about')}
      </h2>
      {showDescription ? <p className="rx-text">{recipe.description}</p> : null}
      {badges.length ? (
        <ul className="rx-badges">
          {badges.map((b) => (
            <li key={b} className="rx-badge">
              {b}
            </li>
          ))}
        </ul>
      ) : null}
      {children}
    </section>
  );
}

export function NutritionPanel({ recipe, portion, kcalTarget, proteinTarget }: { recipe: CatalogRecipe; portion: number; kcalTarget: number; proteinTarget: number }) {
  const value = (k: keyof Nutrients) => recipe.perServing[k] * portion;
  const note = (k: keyof Nutrients): string | null => {
    if (k === 'kcal') return t('recipe.ofTarget', { pct: percent(value(k) / kcalTarget) });
    if (k === 'protein') return t('recipe.ofTarget', { pct: percent(value(k) / proteinTarget) });
    if (k === 'sodium') return t('recipe.ofLimit', { pct: percent(value(k) / SODIUM_LIMIT_MG), limit: num(SODIUM_LIMIT_MG) });
    return null;
  };
  return (
    <section className="rx-card rx-nutrition" aria-labelledby="nutrition-h" id="nutrition">
      <div className="rx-card-head rx-card-head-stack">
        <h2 id="nutrition-h" className="rx-card-title" tabIndex={-1}>
          {t('recipe.nutrition')}
        </h2>
        <p className="rx-card-hint">{tq('recipe.nutritionFor', portion, { portion: portionNumber(portion) })}</p>
      </div>
      <dl className="rx-nutrients">
        {NUTRIENT_KEYS.map((k) => {
          const n = note(k);
          return (
            <div key={k} className="rx-nutrient">
              <dt>{nutrientName(k)}</dt>
              <dd>
                <span className="rx-nutrient-value num">{nutrientValue(k, value(k))}</span>
                {n !== null ? <span className="rx-nutrient-note">{n}</span> : null}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="fine-print">{t('common.estimates')}</p>
    </section>
  );
}

export function SafetyPanel({ recipe }: { recipe: CatalogRecipe }) {
  return (
    <section className="rx-card rx-safety" aria-labelledby="safety-h">
      <h2 id="safety-h" className="rx-card-title">
        {t('recipe.allergens')}
      </h2>
      {recipe.allergens.length ? (
        <ul className="rx-badges">
          {recipe.allergens.map((a) => (
            <li key={a} className="rx-badge rx-badge-warn">
              {allergenName(a)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rx-text">{t('recipe.allergens.none')}</p>
      )}
      <p className="fine-print">{t('recipe.allergens.labels')}</p>
      <h2 className="rx-card-title rx-card-title-gap">{t('recipe.halal')}</h2>
      {recipe.halalNotes.length ? (
        <ul className="rx-notes">
          {recipe.halalNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : (
        <p className="rx-text">{t('recipe.halal.none')}</p>
      )}
    </section>
  );
}

export function TipsPanel({ recipe }: { recipe: CatalogRecipe }) {
  if (!recipe.tips?.length && !recipe.storage) return null;
  return (
    <section className="rx-card rx-tips" aria-labelledby={recipe.tips?.length ? 'tips-h' : 'storage-h'}>
      {recipe.tips?.length ? (
        <>
          <h2 id="tips-h" className="rx-card-title">
            {t('recipe.tips')}
          </h2>
          <ul className="rx-notes">
            {recipe.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </>
      ) : null}
      {recipe.storage ? (
        <>
          <h2 id="storage-h" className={`rx-card-title${recipe.tips?.length ? ' rx-card-title-gap' : ''}`}>
            {t('recipe.storage')}
          </h2>
          <p className="rx-text">{recipe.storage}</p>
        </>
      ) : null}
    </section>
  );
}

/** The photo's credit and licence (required wherever the photo is shown). */
export function CreditPanel({ recipe }: { recipe: CatalogRecipe }) {
  if (!recipe.photo) return null;
  return (
    <section className="rx-credit" aria-labelledby="credit-h" id="credit">
      <h2 id="credit-h" className="rx-credit-title" tabIndex={-1}>
        {t('recipe.photoCredit')}
      </h2>
      <p className="photo-credit">
        <PhotoCreditText credit={recipe.photo.credit} />
      </p>
    </section>
  );
}
