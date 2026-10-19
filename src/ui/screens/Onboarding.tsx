import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Allergen, CatalogRecipe, Profile } from '../../types.ts';
import { defaultProfile } from '../../lib/storage.ts';
import { clampTarget } from '../../lib/targets.ts';
import { t, tp } from '../../i18n/index.ts';
import { num } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { markPhotoFailed, photoKey, photoSources, usePhotoFailed } from '../photo.ts';
import { CheckChips, RadioCards } from '../components/controls.tsx';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import { PhotoCreditText } from '../components/RecipeImage.tsx';
import { TargetCalculator, TargetInputs } from '../settings/TargetFields.tsx';
import type { TargetPatch } from '../settings/TargetFields.tsx';
import { allergenOptions, dietOptions, toggleIn } from '../settings/options.ts';

type Draft = Pick<Profile, 'kcalTarget' | 'proteinTarget' | 'diet' | 'excludeAllergens' | 'body'>;
const STEPS = 3;
/** The Welcome screen's photo: Iraqi dolma, or the first recipe with a photo if that one has none. */
const WELCOME_RECIPE = 'iraqi-dolma';
const WELCOME_SIZES = '100vw';

export function Onboarding() {
  const { state, dispatch } = useAppState();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => ({ ...state.profile }));
  // The calculator's result, while its panel is open: the step's one primary button applies it.
  const [calcOpen, setCalcOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<TargetPatch | null>(null);
  const [announce, setAnnounce] = useState('');
  const pending = step === 1 && calcOpen ? suggestion : null;
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const defaults = defaultProfile();

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const set = (patch: Partial<Profile>) =>
    setDraft((d) => ({
      ...d,
      ...patch,
      kcalTarget: clampTarget('kcalTarget', patch.kcalTarget ?? d.kcalTarget, d.kcalTarget),
      proteinTarget: clampTarget('proteinTarget', patch.proteinTarget ?? d.proteinTarget, d.proteinTarget),
    }));
  const finish = () => dispatch({ type: 'onboarded', profile: draft });
  const skip = () => dispatch({ type: 'onboarded' });

  if (step === 0) {
    return (
      <Welcome
        heading={heading}
        onStart={() => setStep(1)}
        onSkip={skip}
        defaultsLine={`${t('onb.defaults', { kcal: num(defaults.kcalTarget), protein: num(defaults.proteinTarget) })} ${t('onb.welcome.estimates')}`}
      />
    );
  }

  const summary = pending ?? draft;

  return (
    <main className="onboarding onb-steps" id="main">
      <div className="onb-column">
        <div className="onb-progress" aria-hidden="true">
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={`onb-seg${i < step ? ' is-done' : ''}`} />
          ))}
        </div>
        <header className="onb-head">
          <p className="page-sub">{t('onb.step', { n: step, total: STEPS })}</p>
          <h1 ref={heading} tabIndex={-1} className="page-title">
            {step === 1 ? t('onb.targets.title') : step === 2 ? t('onb.diet.title') : t('onb.allergens.title')}
          </h1>
          {step === 1 ? <p className="onb-lead">{t('onb.targets.body')}</p> : null}
          {step === 3 ? <p className="onb-lead">{t('onb.allergens.body')}</p> : null}
        </header>

        <div className="onb-body">
          {step === 1 ? (
            <>
              <div className="card onb-card">
                <TargetInputs kcal={draft.kcalTarget} protein={draft.proteinTarget} onChange={set} />
              </div>
              <details className="card onb-calc" open={calcOpen} onToggle={(e) => setCalcOpen(e.currentTarget.open)}>
                <summary className="onb-calc-summary">
                  <span className="onb-calc-icon">
                    <Icon name="sparkle" size={18} />
                  </span>
                  <span className="onb-calc-label">{t('settings.calculator')}</span>
                  <Icon name="chevronDown" size={20} className="onb-calc-chevron" />
                </summary>
                <div className="onb-calc-body">
                  <TargetCalculator body={draft.body} onSuggest={setSuggestion} />
                </div>
              </details>
              <p className="onb-summary num">
                <Icon name="target" size={20} />
                <span>{t('onb.targets.summary', { kcal: num(summary.kcalTarget), protein: num(summary.proteinTarget) })}</span>
              </p>
            </>
          ) : step === 2 ? (
            <div className="onb-diet">
              <RadioCards label={t('onb.diet.title')} hideLabel value={draft.diet} onChange={(diet) => set({ diet })} options={dietOptions()} />
            </div>
          ) : (
            <div className="card onb-card onb-allergens">
              <CheckChips<Allergen> label={t('onb.allergens.title')} hideLabel values={draft.excludeAllergens} onToggle={(a) => set({ excludeAllergens: toggleIn(draft.excludeAllergens, a) })} options={allergenOptions()} />
            </div>
          )}
        </div>

        <div className="onb-nav">
          <button type="button" className="btn btn-lg btn-quiet onb-back" onClick={() => setStep(step - 1)}>
            <Icon name="arrowLeft" size={20} className="flip-rtl" />
            {t('onb.back')}
          </button>
          {step < STEPS ? (
            <button
              type="button"
              className="btn btn-lg glass-accent onb-next"
              onClick={() => {
                if (pending) {
                  set(pending);
                  setCalcOpen(false);
                  setAnnounce(t('calc.set', { kcal: num(pending.kcalTarget), protein: num(pending.proteinTarget) }));
                }
                setStep(step + 1);
              }}
            >
              {pending ? t('onb.useAndNext') : t('onb.next')}
              <Icon name="arrowRight" size={20} className="flip-rtl" />
            </button>
          ) : (
            <button type="button" className="btn btn-lg glass-accent onb-next" onClick={finish}>
              {t('onb.finish')}
            </button>
          )}
        </div>
        <p className="visually-hidden" role="status">
          {announce}
        </p>
      </div>
    </main>
  );
}

/** The recipe whose photo fills the Welcome screen. */
function welcomeRecipe(catalog: readonly CatalogRecipe[], byId: ReadonlyMap<string, CatalogRecipe>): CatalogRecipe | undefined {
  const preferred = byId.get(WELCOME_RECIPE);
  return preferred?.photo ? preferred : catalog.find((r) => r.photo);
}

function Welcome({ heading, onStart, onSkip, defaultsLine }: { heading: RefObject<HTMLHeadingElement | null>; onStart: () => void; onSkip: () => void; defaultsLine: string }) {
  const lib = useLibrary();
  const recipe = useMemo(() => welcomeRecipe(lib.catalog, lib.byId), [lib]);
  const photo = recipe?.photo;
  const key = photo ? photoKey(photo, WELCOME_SIZES) : null;
  const failed = usePhotoFailed(key);
  const showPhoto = !!photo && !!key && !failed;
  const src = photo ? photoSources(photo) : null;

  const facts: { icon: IconName; label: string }[] = [
    { icon: 'utensils', label: tp('onb.recipes', lib.catalog.length, { n: num(lib.catalog.length) }) },
    { icon: 'play', label: t('onb.videos') },
    { icon: 'shieldCheck', label: t('onb.halal') },
  ];

  return (
    <main className="onboarding onb-welcome" id="main">
      {showPhoto && src && key ? (
        <img
          className="onb-photo"
          src={src.src}
          srcSet={src.srcSet}
          sizes={WELCOME_SIZES}
          width={src.width}
          height={src.height}
          alt=""
          style={{ objectPosition: src.objectPosition }}
          fetchPriority="high"
          onError={() => markPhotoFailed(key)}
        />
      ) : null}
      <div className="onb-shade" aria-hidden="true" />

      <div className="onb-top">
        <p className="glass-clear onb-brand">
          <Icon name="leaf" size={16} />
          <span>{t('common.dotPair', { a: t('app.name'), b: t('app.nativeName') })}</span>
        </p>
      </div>

      <div className="onb-bottom">
        <div className="onb-text">
          <h1 ref={heading} tabIndex={-1} className="onb-title">
            {t('onb.welcome.title')}
          </h1>
          <p className="onb-intro">{t('onb.welcome.body')}</p>
        </div>
        <ul className="onb-facts" aria-label={t('onb.features')}>
          {facts.map((f) => (
            <li key={f.icon} className="glass-clear onb-fact">
              <Icon name={f.icon} size={14} />
              <span>{f.label}</span>
            </li>
          ))}
        </ul>
        <div className="onb-actions">
          <button type="button" className="btn btn-lg btn-block glass-accent" onClick={onStart}>
            {t('onb.start')}
          </button>
          <button type="button" className="btn btn-lg btn-block glass-clear" onClick={onSkip}>
            {t('onb.skip')}
          </button>
          <p className="onb-fine num">{defaultsLine}</p>
          {showPhoto && photo ? (
            <p className="onb-credit">
              <PhotoCreditText credit={photo.credit} />
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
