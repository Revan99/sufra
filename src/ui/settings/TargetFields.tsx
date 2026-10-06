// Daily target inputs and the body-stats calculator (used by Settings and onboarding).
import { useEffect, useId, useState } from 'react';
import type { ActivityLevel, BodyStats, Goal, Profile, Sex } from '../../types.ts';
import { BODY_LIMITS, TARGET_LIMITS, clampTarget, suggestTargets } from '../../lib/targets.ts';
import type { TargetKey } from '../../lib/targets.ts';
import { t } from '../../i18n/index.ts';
import { activityName, goalName, num, sexName } from '../../i18n/labels.ts';
import { Segmented } from '../components/controls.tsx';
import { Icon } from '../components/Icon.tsx';

/** A number input that keeps a free-form draft while typing and commits a valid number on blur or Enter. */
export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  hint,
  normalize,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min: number;
  max: number;
  hint?: string;
  normalize?: (v: number) => number;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number(draft.replace(',', '.'));
    if (draft.trim() === '' || !Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const v = normalize ? normalize(n) : Math.round(Math.min(max, Math.max(min, n)));
    setDraft(String(v));
    if (v !== value) onCommit(v);
  };
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        className="input num"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const range = (key: TargetKey) => t('settings.allowed', { min: num(TARGET_LIMITS[key][0]), max: num(TARGET_LIMITS[key][1]) });

export function TargetInputs({ kcal, protein, onChange }: { kcal: number; protein: number; onChange: (patch: Partial<Profile>) => void }) {
  return (
    <div className="field-row">
      <NumberField label={t('settings.kcal')} value={kcal} min={TARGET_LIMITS.kcalTarget[0]} max={TARGET_LIMITS.kcalTarget[1]} hint={range('kcalTarget')} normalize={(v) => clampTarget('kcalTarget', v, kcal)} onCommit={(v) => onChange({ kcalTarget: v })} />
      <NumberField label={t('settings.protein')} value={protein} min={TARGET_LIMITS.proteinTarget[0]} max={TARGET_LIMITS.proteinTarget[1]} hint={range('proteinTarget')} normalize={(v) => clampTarget('proteinTarget', v, protein)} onCommit={(v) => onChange({ proteinTarget: v })} />
    </div>
  );
}

const DEFAULT_BODY: BodyStats = { sex: 'female', age: 30, heightCm: 165, weightKg: 65, activity: 'light', goal: 'maintain' };
const ACTIVITIES: readonly ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very-active'];
const GOALS: readonly Goal[] = ['lose', 'maintain', 'gain'];
const SEXES: readonly Sex[] = ['female', 'male'];

export type TargetPatch = Pick<Profile, 'kcalTarget' | 'proteinTarget'> & { body: BodyStats };

/**
 * Body stats in, suggested targets out. With `onApply`, a "Use these targets" button applies them (and keeps the
 * body stats). `onSuggest` hears every valid suggestion (null while the stats are invalid), for a screen whose own
 * primary button applies it instead (onboarding).
 */
export function TargetCalculator({ body, onApply, onSuggest }: { body?: BodyStats; onApply?: (patch: TargetPatch) => void; onSuggest?: (patch: TargetPatch | null) => void }) {
  const [b, setB] = useState<BodyStats>(body ?? DEFAULT_BODY);
  const activityId = useId();
  const set = (patch: Partial<BodyStats>) => setB((prev) => ({ ...prev, ...patch }));
  const s = suggestTargets(b);
  const lim = BODY_LIMITS;
  const suggestion = s ? JSON.stringify([s.kcalTarget, s.proteinTarget, b]) : '';
  useEffect(() => {
    onSuggest?.(s ? { kcalTarget: s.kcalTarget, proteinTarget: s.proteinTarget, body: b } : null);
    // Keyed on the suggestion's content, so a parent re-render doesn't re-announce it.
  }, [suggestion]);
  return (
    <div className="calculator">
      <Segmented label={t('calc.sex')} value={b.sex} onChange={(sex) => set({ sex })} options={SEXES.map((x) => ({ value: x, label: sexName(x) }))} />
      <div className="field-row field-row-3">
        <NumberField label={t('calc.age')} value={b.age} min={lim.age[0]} max={lim.age[1]} onCommit={(age) => set({ age })} />
        <NumberField label={t('calc.height')} value={b.heightCm} min={lim.heightCm[0]} max={lim.heightCm[1]} onCommit={(heightCm) => set({ heightCm })} />
        <NumberField label={t('calc.weight')} value={b.weightKg} min={lim.weightKg[0]} max={lim.weightKg[1]} onCommit={(weightKg) => set({ weightKg })} />
      </div>
      <div className="field">
        <label htmlFor={activityId} className="field-label">
          {t('calc.activity')}
        </label>
        <select id={activityId} className="input" value={b.activity} onChange={(e) => set({ activity: e.currentTarget.value as ActivityLevel })}>
          {ACTIVITIES.map((a) => (
            <option key={a} value={a}>
              {activityName(a)}
            </option>
          ))}
        </select>
      </div>
      <Segmented label={t('calc.goal')} value={b.goal} onChange={(goal) => set({ goal })} options={GOALS.map((g) => ({ value: g, label: goalName(g) }))} />
      <div className="calc-result" aria-live="polite">
        {s ? (
          <>
            <p className="calc-figure">
              <Icon name="sparkle" size={20} />
              <span className="num">{t('calc.result', { kcal: num(s.kcalTarget), protein: num(s.proteinTarget) })}</span>
            </p>
            {s.floored ? <p className="field-hint">{t('calc.floored', { n: num(s.kcalTarget) })}</p> : null}
            {s.capped ? <p className="field-hint">{t('calc.capped')}</p> : null}
            <p className="field-hint">{t('calc.method')}</p>
            {onApply ? (
              <button type="button" className="btn btn-primary" onClick={() => onApply({ kcalTarget: s.kcalTarget, proteinTarget: s.proteinTarget, body: b })}>
                {t('calc.use')}
              </button>
            ) : null}
          </>
        ) : (
          <p className="field-hint">{t('calc.invalid')}</p>
        )}
      </div>
    </div>
  );
}
