import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Allergen, Diet, Profile } from '../../types.ts';
import { HOUSEHOLD_LIMITS } from '../../lib/storage.ts';
import { t, tp } from '../../i18n/index.ts';
import { dietName, listJoin, num, themeName, weekStartName } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { goBack, navigate } from '../router.ts';
import { CheckChips, Segmented, Stepper } from '../components/controls.tsx';
import { Icon } from '../components/Icon.tsx';
import { PageHead } from '../components/PageHead.tsx';
import { Sheet } from '../components/Sheet.tsx';
import { useToast } from '../components/Toast.tsx';
import { IngredientPicker } from '../settings/IngredientPicker.tsx';
import { SelectRow, TargetCalculator, TargetInputs } from '../settings/TargetFields.tsx';
import { DIETS, THEMES, WEEK_STARTS, allergenOptions, toggleIn } from '../settings/options.ts';
import { usePlan } from '../plan.tsx';
import { conflictingOverrides } from '../planHelpers.ts';

const TIME_LIMITS: readonly number[] = [15, 20, 30, 45, 60, 90, 120];

/** An iOS grouped section: an uppercase label, a white card, and a grey hint under it. */
function Group({ id, title, hint, children, className }: { id: string; title: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className="set-group" aria-labelledby={id}>
      <h2 id={id} className="set-label">
        {title}
      </h2>
      <div className={`set-card${className ? ` ${className}` : ''}`}>{children}</div>
      {hint ? <div className="set-hint">{hint}</div> : null}
    </section>
  );
}

/** The diet segment labels: short words that fit four across. */
function dietShort(d: Diet): string {
  return d === 'omnivore' ? t('settings.dietOmnivore') : dietName(d);
}

/** Back to wherever Settings was opened from (Today when it was opened directly). */
const leave = () => goBack({ name: 'today', date: null });

export function SettingsScreen() {
  const { state, dispatch, persistence, reset } = useAppState();
  const lib = useLibrary();
  const plan = usePlan();
  const notify = useToast();
  const [calcOpen, setCalcOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
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
  const nameOf = (id: string) => lib.ingredientIndex.get(id)?.name ?? id.replace(/-/g, ' ');
  const disliked = p.dislikedIngredients.length ? listJoin(p.dislikedIngredients.map(nameOf)) : t('settings.dislikedNone');

  return (
    <div className="settings">
      <div className="set-topbar">
        <button type="button" className="icon-btn glass set-back" onClick={leave} aria-label={t('settings.backLabel')}>
          <Icon name="chevronLeft" size={22} className="flip-rtl" />
        </button>
        <button type="button" className="glass-accent set-done" onClick={leave}>
          {t('settings.done')}
        </button>
      </div>
      <PageHead title={t('settings.title')} className="set-head" />

      {persistence !== 'saved' ? (
        <p className="notice" role="note">
          <Icon name="info" size={20} />
          {t(persistence === 'newer' ? 'settings.storageNewer' : 'settings.storageOff')}
        </p>
      ) : null}
      {conflicts.length ? (
        <div className="notice set-conflicts" role="status">
          <Icon name="info" size={20} />
          <div className="set-conflicts-text">
            <p>{tp('settings.conflicts', conflicts.length)}</p>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => replaceConflicts()}>
              {t('settings.conflictsReplace')}
            </button>
          </div>
        </div>
      ) : null}

      <div className="set-groups">
        <Group id="set-targets" title={t('settings.targets')} hint={t('settings.targetsHint')}>
          <TargetInputs kcal={p.kcalTarget} protein={p.proteinTarget} onChange={patch} />
          <button type="button" className="set-row set-row-btn set-accent" onClick={() => setCalcOpen(true)} aria-haspopup="dialog">
            <span>{t('settings.calculator')}</span>
            <Icon name="chevronRight" size={16} className="set-chevron flip-rtl" />
          </button>
        </Group>

        <Group id="set-diet" title={t('settings.diet')}>
          <div className="set-seg set-seg-diet">
            <Segmented label={t('settings.diet')} hideLabel value={p.diet} onChange={(diet) => patch({ diet })} options={DIETS.map((d) => ({ value: d, label: dietShort(d) }))} />
          </div>
        </Group>

        <Group id="set-allergens" title={t('settings.allergens')} hint={t('settings.allergensHint')} className="set-card-chips">
          <CheckChips<Allergen> label={t('settings.allergens')} hideLabel values={p.excludeAllergens} onToggle={(a) => patch({ excludeAllergens: toggleIn(p.excludeAllergens, a) })} options={allergenOptions()} />
        </Group>

        <Group id="set-disliked" title={t('settings.disliked')}>
          <button type="button" className="set-row set-row-btn" onClick={() => setPickerOpen(true)} aria-haspopup="dialog" aria-describedby="set-disliked">
            <span className="set-disliked-names">{disliked}</span>
            <Icon name="chevronRight" size={16} className="set-chevron flip-rtl" />
          </button>
        </Group>

        <Group id="set-meals" title={t('settings.meals')} hint={t('settings.mealsHint')}>
          <div className="set-row">
            <span className="set-row-label" aria-hidden="true">
              {t('settings.snacks')}
            </span>
            <div className="set-mini-seg">
              <Segmented label={t('settings.snacks')} hideLabel value={p.snacksPerDay} onChange={(snacksPerDay) => patch({ snacksPerDay })} options={[0, 1, 2].map((n) => ({ value: n as 0 | 1 | 2, label: num(n) }))} />
            </div>
          </div>
          <SelectRow
            label={t('settings.maxTime')}
            value={p.maxTotalMinutes === null ? '' : String(p.maxTotalMinutes)}
            onChange={(v) => patch({ maxTotalMinutes: v ? Number(v) : null })}
            options={[{ value: '', label: t('settings.maxTime.none') }, ...times.map((m) => ({ value: String(m), label: t('settings.maxTime.value', { n: m }) }))]}
          />
          <div className="set-row">
            <Stepper label={t('settings.household')} value={p.householdSize} min={HOUSEHOLD_LIMITS[0]} max={HOUSEHOLD_LIMITS[1]} display={num(p.householdSize)} onChange={(householdSize) => patch({ householdSize })} />
          </div>
          <SelectRow label={t('settings.weekStart')} value={p.weekStart} onChange={(weekStart) => patch({ weekStart })} options={WEEK_STARTS.map((w) => ({ value: w, label: weekStartName(w) }))} />
        </Group>

        <Group id="set-theme" title={t('settings.theme')}>
          <div className="set-seg">
            <Segmented label={t('settings.theme')} hideLabel value={state.theme} onChange={(theme) => dispatch({ type: 'theme', theme })} options={THEMES.map((th) => ({ value: th, label: themeName(th) }))} />
          </div>
        </Group>

        <Group
          id="set-about"
          title={t('about.title')}
          hint={
            <>
              <p>{t('about.privacy')}</p>
              <p>{t('about.tracker')}</p>
              <p className="num">{tp('about.library', lib.catalog.length)}</p>
            </>
          }
        >
          <div className="set-about">
            <p>{t('about.body')}</p>
            <h3 className="set-about-title">{t('about.halalTitle')}</h3>
            <p>{t('about.halal')}</p>
            <h3 className="set-about-title">{t('about.nutritionTitle')}</h3>
            <p>{t('about.nutrition')}</p>
          </div>
          {photoCount ? (
            <a className="set-row set-row-btn set-link" href="#/credits">
              <span className="set-link-icon" aria-hidden="true">
                <Icon name="camera" size={16} />
              </span>
              <span className="set-link-text">
                <span className="set-row-label">{t('about.photos')}</span>
                <span className="set-link-hint num">{tp('about.photosHint', photoCount)}</span>
              </span>
              <Icon name="chevronRight" size={16} className="set-chevron flip-rtl" />
            </a>
          ) : null}
        </Group>

        <Group id="set-reset" title={t('settings.reset')} hint={t('settings.resetHintAll')}>
          <button type="button" className="set-row set-row-btn set-reset" onClick={() => setConfirmReset(true)} aria-haspopup="dialog">
            {t('settings.resetButton')}
          </button>
        </Group>
      </div>

      <Sheet open={calcOpen} onClose={() => setCalcOpen(false)} title={t('settings.calculator')} subtitle={t('settings.calcSub')}>
        <TargetCalculator
          body={p.body}
          onApply={(x) => {
            patch(x);
            setCalcOpen(false);
            notify(t('calc.applied'));
          }}
        />
      </Sheet>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title={t('settings.disliked')} subtitle={t('settings.dislikedHint')}>
        <IngredientPicker selected={p.dislikedIngredients} onChange={(ids) => patch({ dislikedIngredients: ids })} />
      </Sheet>

      <Sheet
        open={confirmReset}
        kind="alert"
        onClose={() => setConfirmReset(false)}
        title={t('settings.resetTitle')}
        footer={
          <div className="set-alert-actions">
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
        <p className="set-alert-body">{t('settings.resetBodyAll')}</p>
      </Sheet>
    </div>
  );
}
