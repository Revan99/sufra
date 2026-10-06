import { useEffect, useRef, useState } from 'react';
import type { Allergen, Profile } from '../../types.ts';
import { defaultProfile } from '../../lib/storage.ts';
import { clampTarget } from '../../lib/targets.ts';
import { t } from '../../i18n/index.ts';
import { num } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { CheckChips, RadioCards } from '../components/controls.tsx';
import { Icon } from '../components/Icon.tsx';
import { Mark } from '../components/Mark.tsx';
import { TargetCalculator, TargetInputs } from '../settings/TargetFields.tsx';
import type { TargetPatch } from '../settings/TargetFields.tsx';
import { allergenOptions, dietOptions, toggleIn } from '../settings/options.ts';

type Draft = Pick<Profile, 'kcalTarget' | 'proteinTarget' | 'diet' | 'excludeAllergens' | 'body'>;
const STEPS = 3;

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
      <main className="onboarding onboarding-welcome" id="main">
        <div className="onb-card">
          <Mark size={88} />
          <h1 ref={heading} tabIndex={-1} className="onb-title">
            {t('onb.welcome.title')}
          </h1>
          <p className="onb-lead">{t('onb.welcome.body')}</p>
          <p className="field-hint">{t('onb.welcome.estimates')}</p>
          <div className="onb-actions">
            <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(1)}>
              {t('onb.start')}
            </button>
            <button type="button" className="btn btn-quiet btn-block" onClick={skip}>
              {t('onb.skip')}
            </button>
          </div>
          <p className="field-hint onb-defaults">{t('onb.defaults', { kcal: num(defaults.kcalTarget), protein: num(defaults.proteinTarget) })}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="onboarding" id="main">
      <div className="onb-card onb-step">
        <div className="onb-progress">
          <p className="eyebrow">{t('onb.step', { n: step, total: STEPS })}</p>
          <ol className="onb-dots" aria-hidden="true">
            {Array.from({ length: STEPS }, (_, i) => (
              <li key={i} className={i < step ? 'is-done' : ''} />
            ))}
          </ol>
        </div>
        {step === 1 ? (
          <>
            <h1 ref={heading} tabIndex={-1} className="onb-title">
              {t('onb.targets.title')}
            </h1>
            <p className="onb-lead">{t('onb.targets.body')}</p>
            <TargetInputs kcal={draft.kcalTarget} protein={draft.proteinTarget} onChange={set} />
            <details className="disclosure" open={calcOpen} onToggle={(e) => setCalcOpen(e.currentTarget.open)}>
              <summary className="disclosure-summary">
                <Icon name="sparkle" size={20} />
                {t('settings.calculator')}
                <Icon name="chevronDown" size={20} className="disclosure-chevron" />
              </summary>
              <TargetCalculator body={draft.body} onSuggest={setSuggestion} />
            </details>
            <p className="onb-summary num">{t('onb.targets.summary', { kcal: num((pending ?? draft).kcalTarget), protein: num((pending ?? draft).proteinTarget) })}</p>
          </>
        ) : step === 2 ? (
          <>
            <h1 ref={heading} tabIndex={-1} className="onb-title">
              {t('onb.diet.title')}
            </h1>
            <RadioCards label={t('onb.diet.title')} hideLabel value={draft.diet} onChange={(diet) => set({ diet })} options={dietOptions()} />
          </>
        ) : (
          <>
            <h1 ref={heading} tabIndex={-1} className="onb-title">
              {t('onb.allergens.title')}
            </h1>
            <p className="onb-lead">{t('onb.allergens.body')}</p>
            <CheckChips<Allergen> label={t('onb.allergens.title')} hideLabel values={draft.excludeAllergens} onToggle={(a) => set({ excludeAllergens: toggleIn(draft.excludeAllergens, a) })} options={allergenOptions()} />
          </>
        )}
        <div className="onb-nav">
          <button type="button" className="btn btn-quiet" onClick={() => setStep(step - 1)}>
            <Icon name="arrowLeft" size={20} className="flip-rtl" />
            {t('onb.back')}
          </button>
          {step < STEPS ? (
            <button
              type="button"
              className="btn btn-primary"
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
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={finish}>
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
