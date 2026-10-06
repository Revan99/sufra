// The recipe page's panels: nutrition, allergens and halal notes, scaled ingredients, tickable steps, reference video.
import type { CatalogRecipe, Nutrients } from '../../types.ts';
import { NUTRIENT_KEYS } from '../../types.ts';
import { t, tq } from '../../i18n/index.ts';
import { tx } from '../../i18n/nodes.tsx';
import { allergenName, amountLabel, grams, num, nutrientName, nutrientValue, percent, portionLabel, portionNumber } from '../../i18n/labels.ts';
import { useLibrary } from '../library.tsx';
import { Stepper } from '../components/controls.tsx';
import { SODIUM_LIMIT_MG } from '../components/DaySummary.tsx';
import { Icon } from '../components/Icon.tsx';

export function NutritionPanel({ recipe, portion, kcalTarget, proteinTarget }: { recipe: CatalogRecipe; portion: number; kcalTarget: number; proteinTarget: number }) {
  const value = (k: keyof Nutrients) => recipe.perServing[k] * portion;
  const note = (k: keyof Nutrients): string | null => {
    if (k === 'kcal') return t('recipe.ofTarget', { pct: percent(value(k) / kcalTarget) });
    if (k === 'protein') return t('recipe.ofTarget', { pct: percent(value(k) / proteinTarget) });
    if (k === 'sodium') return t('recipe.ofLimit', { pct: percent(value(k) / SODIUM_LIMIT_MG), limit: num(SODIUM_LIMIT_MG) });
    return null;
  };
  return (
    <section className="card panel" aria-labelledby="nutrition-h">
      <h2 id="nutrition-h" className="panel-title">
        {t('recipe.nutrition')}
      </h2>
      <p className="panel-sub">{tq('recipe.nutritionFor', portion, { portion: portionNumber(portion) })}</p>
      <dl className="nutrients">
        {NUTRIENT_KEYS.map((k) => {
          const n = note(k);
          return (
            <div key={k} className={`nutrient nutrient-${k}`}>
              <dt>{nutrientName(k)}</dt>
              <dd>
                <span className="nutrient-value num">{nutrientValue(k, value(k))}</span>
                {n !== null ? <span className="nutrient-pct">{n}</span> : null}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="fine-print fine-print-start">{t('common.estimates')}</p>
    </section>
  );
}

export function SafetyPanel({ recipe }: { recipe: CatalogRecipe }) {
  return (
    <section className="card panel" aria-labelledby="safety-h">
      <h2 id="safety-h" className="panel-title">
        {t('recipe.allergens')}
      </h2>
      {recipe.allergens.length ? (
        <ul className="badges badges-lg">
          {recipe.allergens.map((a) => (
            <li key={a} className="badge badge-warn">
              {allergenName(a)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="panel-text">{t('recipe.allergens.none')}</p>
      )}
      <p className="fine-print fine-print-start">{t('recipe.allergens.labels')}</p>
      <h2 className="panel-title panel-title-gap">{t('recipe.halal')}</h2>
      {recipe.halalNotes.length ? (
        <ul className="notes">
          {recipe.halalNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : (
        <p className="panel-text">{t('recipe.halal.none')}</p>
      )}
    </section>
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
    <section className="card panel" aria-labelledby="ingredients-h" id="ingredients">
      <div className="panel-head">
        <h2 id="ingredients-h" className="panel-title" tabIndex={-1}>
          {t('recipe.ingredients')}
        </h2>
        <Stepper label={t('recipe.servingsLabel')} value={servings} display={portionNumber(servings)} onChange={onServings} min={0.5} max={24} next={stepUp} prev={stepDown} />
      </div>
      {servings === defaultServings && (household > 1 || portion !== 1) ? (
        <p className="panel-sub">{t('recipe.scaledHint', { people: household, portion: portionLabel(portion) })}</p>
      ) : null}
      <ul className="ingredients">
        {recipe.ingredients.map((ri, i) => {
          const ing = lib.ingredientIndex.get(ri.ingredientId);
          const metric = ri.unit === 'g' || ri.unit === 'kg' || ri.unit === 'ml' || ri.unit === 'l';
          const name = ing?.name ?? ri.ingredientId;
          return (
            <li key={`${ri.ingredientId}-${i}`} className="ingredient">
              <span className="ingredient-amount num">{amountLabel(ri.qty, ri.unit, factor)}</span>
              <span className="ingredient-name">
                {ri.prep ? tx('recipe.withPrep', { name, prep: <span className="ingredient-prep">{ri.prep}</span> }) : name}
                {ri.optional ? <span className="ingredient-opt"> {t('recipe.optional')}</span> : null}
                {!metric ? <span className="ingredient-grams num">{grams(ri.grams * factor)}</span> : null}
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
    <section className="card panel" aria-labelledby="steps-h" id="method">
      <div className="panel-head">
        <h2 id="steps-h" className="panel-title">
          {t('recipe.steps')}
        </h2>
        {done.length ? (
          <button type="button" className="btn btn-quiet btn-sm" onClick={onReset}>
            {t('recipe.stepsReset')}
          </button>
        ) : null}
      </div>
      <p className="panel-sub">{t('recipe.stepsHint')}</p>
      <ol className="steps">
        {recipe.steps.map((s, i) => (
          <li key={i} className={`step${done.includes(i) ? ' is-done' : ''}`}>
            <label className="step-label">
              <input type="checkbox" className="step-check" checked={done.includes(i)} onChange={() => onToggle(i)} />
              <span className="step-num num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="step-text">{s}</span>
            </label>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** A link out to a reference video on YouTube, or to a YouTube search when no video has been picked. Never embedded. */
export function VideoPanel({ recipe }: { recipe: CatalogRecipe }) {
  const v = recipe.video;
  const query = `${recipe.nativeName ?? recipe.name} recipe`;
  const href = v ? `https://www.youtube.com/watch?v=${v.youtubeId}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  return (
    <section className="card panel" aria-labelledby="video-h">
      <h2 id="video-h" className="panel-title">
        {t('recipe.video')}
      </h2>
      {v ? (
        <>
          <p className="panel-text">
            {/* bdi keeps a right-to-left Kurdish, Arabic or Persian title in order inside the sentence. */}
            {v.language === 'en'
              ? tx('recipe.video.about', { title: <bdi>{v.title}</bdi>, channel: <bdi>{v.channel}</bdi> })
              : tx('recipe.video.aboutIn', { title: <bdi>{v.title}</bdi>, channel: <bdi>{v.channel}</bdi>, language: t(`videoLanguage.${v.language}`) })}
          </p>
          <p className="panel-sub">{t(v.match === 'exact' ? 'recipe.video.exact' : 'recipe.video.close')}</p>
        </>
      ) : (
        <p className="panel-sub">{t('recipe.video.searchHint', { query })}</p>
      )}
      <a className="btn btn-quiet" href={href} target="_blank" rel="noopener noreferrer">
        <Icon name="play" size={20} />
        {t(v ? 'recipe.video.watch' : 'recipe.video.search')}
        <span className="visually-hidden">{t('recipe.video.newTab')}</span>
      </a>
    </section>
  );
}
