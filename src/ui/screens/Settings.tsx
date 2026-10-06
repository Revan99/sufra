import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Allergen, Profile } from '../../types.ts';
import { HOUSEHOLD_LIMITS } from '../../lib/storage.ts';
import { t, tp } from '../../i18n/index.ts';
import { num, themeName, weekStartName } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { navigate } from '../router.ts';
import { CheckChips, RadioCards, Segmented, Stepper } from '../components/controls.tsx';
import { Icon } from '../components/Icon.tsx';
import { Sheet } from '../components/Sheet.tsx';
import { useToast } from '../components/Toast.tsx';
import { IngredientPicker } from '../settings/IngredientPicker.tsx';
import { TargetCalculator, TargetInputs } from '../settings/TargetFields.tsx';
import { THEMES, WEEK_STARTS, allergenOptions, dietOptions, toggleIn } from '../settings/options.ts';
import { usePlan } from '../plan.tsx';
import { conflictingOverrides } from '../planHelpers.ts';
const TIME_LIMITS: readonly number[] = [15, 20, 30, 45, 60, 90, 120];

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card panel settings-section" aria-labelledby={id}>
      <h2 id={id} className="panel-title">
        {title}
      </h2>
      {hint ? <p className="panel-sub">{hint}</p> : null}
      {children}
    </section>
  );
}

export function SettingsScreen() {
  const { state, dispatch, persistence, reset } = useAppState();
  const lib = useLibrary();
  const plan = usePlan();
  const notify = useToast();
  const [calcOpen, setCalcOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const timeId = useId();
  const p = state.profile;
  const patch = (x: Partial<Profile>) => dispatch({ type: 'profile', patch: x });
  // Picks (swaps, "Add to a day") from today on that the current settings rule out.
  const conflicts = conflictingOverrides(state.overrides, lib.byId, p, plan.today);
  const replaceConflicts = (list = conflicts) => {
    for (const o of list) dispatch({ type: 'clearOverride', date: o.date, slot: o.slot, index: o.index });
    notify(tp('settings.conflictsDone', list.length));
  };
  // A change that makes earlier picks conflict says so right away, with a one-tap fix.
  const seen = useRef(conflicts.length);
  useEffect(() => {
    if (conflicts.length > seen.current) {
      const list = conflicts;
      notify(tp('settings.conflicts', list.length), { label: t('settings.conflictsReplace'), run: () => replaceConflicts(list) });
    }
    seen.current = conflicts.length;
  });
  const photoCount = lib.catalog.filter((r) => r.photo).length;
  const times = p.maxTotalMinutes !== null && !TIME_LIMITS.includes(p.maxTotalMinutes) ? [...TIME_LIMITS, p.maxTotalMinutes].sort((a, b) => a - b) : TIME_LIMITS;

  return (
    <>
      <header className="screen-head">
        <h1 tabIndex={-1} className="screen-title">
          {t('settings.title')}
        </h1>
      </header>
      {persistence !== 'saved' ? (
        <p className="notice" role="note">
          <Icon name="info" size={20} />
          {t(persistence === 'newer' ? 'settings.storageNewer' : 'settings.storageOff')}
        </p>
      ) : null}
      {conflicts.length ? (
        <div className="notice settings-conflicts" role="status">
          <Icon name="info" size={20} />
          <p>{tp('settings.conflicts', conflicts.length)}</p>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => replaceConflicts()}>
            {t('settings.conflictsReplace')}
          </button>
        </div>
      ) : null}
      <div className="settings-grid">
        <Section id="set-targets" title={t('settings.targets')} hint={t('settings.targetsHint')}>
          <TargetInputs kcal={p.kcalTarget} protein={p.proteinTarget} onChange={patch} />
          <details className="disclosure" open={calcOpen} onToggle={(e) => setCalcOpen(e.currentTarget.open)}>
            <summary className="disclosure-summary">
              <Icon name="sparkle" size={20} />
              {t('settings.calculator')}
              <Icon name="chevronDown" size={20} className="disclosure-chevron" />
            </summary>
            {calcOpen ? (
              <TargetCalculator
                body={p.body}
                onApply={(x) => {
                  patch(x);
                  setCalcOpen(false);
                  notify(t('calc.applied'));
                }}
              />
            ) : null}
          </details>
        </Section>

        <Section id="set-diet" title={t('settings.diet')}>
          <RadioCards label={t('settings.diet')} hideLabel value={p.diet} onChange={(diet) => patch({ diet })} options={dietOptions()} />
        </Section>

        <Section id="set-allergens" title={t('settings.allergens')} hint={t('settings.allergensHint')}>
          <CheckChips<Allergen> label={t('settings.allergens')} hideLabel values={p.excludeAllergens} onToggle={(a) => patch({ excludeAllergens: toggleIn(p.excludeAllergens, a) })} options={allergenOptions()} />
        </Section>

        <Section id="set-disliked" title={t('settings.disliked')} hint={t('settings.dislikedHint')}>
          <IngredientPicker selected={p.dislikedIngredients} onChange={(ids) => patch({ dislikedIngredients: ids })} />
        </Section>

        <Section id="set-meals" title={t('settings.meals')}>
          <Segmented label={t('settings.snacks')} value={p.snacksPerDay} onChange={(snacksPerDay) => patch({ snacksPerDay })} options={[0, 1, 2].map((n) => ({ value: n as 0 | 1 | 2, label: num(n) }))} />
          <div className="field">
            <label htmlFor={timeId} className="field-label">
              {t('settings.maxTime')}
            </label>
            <select id={timeId} className="input" value={p.maxTotalMinutes ?? ''} onChange={(e) => patch({ maxTotalMinutes: e.currentTarget.value ? Number(e.currentTarget.value) : null })}>
              <option value="">{t('settings.maxTime.none')}</option>
              {times.map((m) => (
                <option key={m} value={m}>
                  {t('settings.maxTime.value', { n: m })}
                </option>
              ))}
            </select>
          </div>
          <Stepper label={t('settings.household')} value={p.householdSize} min={HOUSEHOLD_LIMITS[0]} max={HOUSEHOLD_LIMITS[1]} onChange={(householdSize) => patch({ householdSize })} />
          <p className="field-hint">{t('settings.householdHint')}</p>
        </Section>

        <Section id="set-week" title={t('settings.weekStart')}>
          <Segmented label={t('settings.weekStart')} hideLabel value={p.weekStart} onChange={(weekStart) => patch({ weekStart })} options={WEEK_STARTS.map((w) => ({ value: w, label: weekStartName(w) }))} />
        </Section>

        <Section id="set-theme" title={t('settings.theme')}>
          <Segmented label={t('settings.theme')} hideLabel value={state.theme} onChange={(theme) => dispatch({ type: 'theme', theme })} options={THEMES.map((th) => ({ value: th, label: themeName(th) }))} />
        </Section>

        <Section id="set-about" title={t('about.title')}>
          <p className="panel-text">{t('about.body')}</p>
          <h3 className="panel-subtitle">{t('about.halalTitle')}</h3>
          <p className="panel-text">{t('about.halal')}</p>
          <h3 className="panel-subtitle">{t('about.nutritionTitle')}</h3>
          <p className="panel-text">{t('about.nutrition')}</p>
          <p className="field-hint">{t('about.privacy')}</p>
          <p className="field-hint">{tp('about.library', lib.catalog.length)}</p>
          {photoCount ? (
            <a className="settings-link" href="#/credits">
              <Icon name="camera" size={20} />
              <span className="settings-link-text">
                <span className="settings-link-title">{t('about.photos')}</span>
                <span className="settings-link-hint">{tp('about.photosHint', photoCount)}</span>
              </span>
              <Icon name="chevronRight" size={20} className="flip-rtl" />
            </a>
          ) : null}
        </Section>

        <Section id="set-reset" title={t('settings.reset')} hint={t('settings.resetHint')}>
          <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}>
            <Icon name="restart" size={20} />
            {t('settings.resetButton')}
          </button>
        </Section>
      </div>

      <Sheet
        open={confirmReset}
        kind="alert"
        onClose={() => setConfirmReset(false)}
        title={t('settings.resetTitle')}
        footer={
          <div className="btn-row">
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmReset(false)} autoFocus>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                setConfirmReset(false);
                reset();
                navigate({ name: 'today', date: null }, { replace: true });
                notify(t('settings.resetDone'));
              }}
            >
              {t('settings.resetConfirm')}
            </button>
          </div>
        }
      >
        <p className="panel-text">{t('settings.resetBody')}</p>
      </Sheet>
    </>
  );
}
