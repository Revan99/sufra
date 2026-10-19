// Daily target steppers, the body-stats calculator and the grouped-row controls they share with Settings (used by
// Settings and onboarding). Rows are styled in styles/settings.css.
import { useEffect, useId, useState } from 'react';
import type { ActivityLevel, BodyStats, Goal, Profile, Sex } from '../../types.ts';
import { BODY_LIMITS, TARGET_LIMITS, clampTarget, suggestTargets } from '../../lib/targets.ts';
import type { TargetKey } from '../../lib/targets.ts';
import { t } from '../../i18n/index.ts';
import { activityName, goalName, num, sexName } from '../../i18n/labels.ts';
import { Segmented } from '../components/controls.tsx';
import { Icon } from '../components/Icon.tsx';

/** Parses a typed number ("2,000", "72.5", "72,5"), or NaN. */
function parseTyped(s: string): number {
  const clean = s.trim().replace(/\s/g, '');
  if (clean === '') return Number.NaN;
  // A comma followed by exactly three digits is a thousands separator; otherwise a decimal comma.
  const normal = /,\d{3}(\D|$)/.test(clean) ? clean.replace(/,/g, '') : clean.replace(',', '.');
  return Number(normal);
}

/**
 * A grouped row with a number input on the end, which keeps a free-form draft while typing and commits a valid
 * number on blur or Enter.
 */
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
    const n = parseTyped(draft);
    if (!Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const v = normalize ? normalize(n) : Math.round(Math.min(max, Math.max(min, n)));
    setDraft(String(v));
    if (v !== value) onCommit(v);
  };
  return (
    <div className="set-row">
      <label htmlFor={id} className="set-row-label">
        {label}
      </label>
      <input
        id={id}
        className="set-input num"
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint ? (
        <span id={`${id}-hint`} className="visually-hidden">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A grouped row whose value is a native select: the label on the start side, the chosen option and a chevron on the
 * end. The select covers the whole row, so a tap anywhere opens the system picker. `stacked` puts the value under
 * the label, for long option names.
 */
export function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
  stacked = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  stacked?: boolean;
}) {
  const id = useId();
  const current = options.find((o) => o.value === value)?.label ?? '';
  return (
    <div className={`set-row set-select${stacked ? ' set-select-stacked' : ''}`}>
      <span className="set-select-text">
        <label htmlFor={id} className="set-row-label">
          {label}
        </label>
        {stacked ? (
          <span className="set-select-value" aria-hidden="true">
            {current}
          </span>
        ) : null}
      </span>
      <span className="set-select-end" aria-hidden="true">
        {stacked ? null : <span className="set-select-value">{current}</span>}
        <Icon name="chevronRight" size={16} className="set-chevron flip-rtl" />
      </span>
      <select id={id} className="set-select-input" value={value} onChange={(e) => onChange(e.currentTarget.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const STEPS: Readonly<Record<TargetKey, number>> = { kcalTarget: 50, proteinTarget: 5 };

/**
 * A − value + row for a daily target. The value is also a text field: tap it to type an exact number (committed on
 * blur or Enter, clamped to the allowed range).
 */
function TargetStepper({ field, label, value, onChange }: { field: TargetKey; label: string; value: number; onChange: (v: number) => void }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [lo, hi] = TARGET_LIMITS[field];
  const step = STEPS[field];
  const set = (v: number) => {
    const next = clampTarget(field, v, value);
    if (next !== value) onChange(next);
  };
  const commit = () => {
    if (draft === null) return;
    const n = parseTyped(draft);
    setDraft(null);
    if (Number.isFinite(n)) set(n);
  };
  const atMin = value <= lo;
  const atMax = value >= hi;
  const shown = draft ?? num(value);
  return (
    <div className="stepper set-row" role="group" aria-labelledby={`${id}-l`}>
      <label id={`${id}-l`} htmlFor={id} className="set-row-label">
        {label}
      </label>
      <div className="stepper-controls">
        <button type="button" className="icon-btn stepper-btn" onClick={() => !atMin && set(Math.ceil(value / step) * step - step)} aria-disabled={atMin || undefined} aria-label={t('common.decrease', { name: label })}>
          <Icon name="minus" size={15} />
        </button>
        <input
          id={id}
          className="stepper-value stepper-input num"
          type="text"
          inputMode="numeric"
          value={shown}
          style={{ inlineSize: `calc(${Math.max(2, shown.length)}ch + 0.25rem)` }}
          onFocus={() => setDraft(String(value))}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape' && draft !== null) {
              setDraft(String(value));
            }
          }}
          aria-describedby={`${id}-hint`}
        />
        <button type="button" className="icon-btn stepper-btn" onClick={() => !atMax && set(Math.floor(value / step) * step + step)} aria-disabled={atMax || undefined} aria-label={t('common.increase', { name: label })}>
          <Icon name="plus" size={15} />
        </button>
      </div>
      <span id={`${id}-hint`} className="visually-hidden">
        {t('settings.allowed', { min: num(lo), max: num(hi) })}
      </span>
    </div>
  );
}

/** The two daily-target stepper rows (calories, protein), split by a hairline; the parent supplies the card. */
export function TargetInputs({ kcal, protein, onChange }: { kcal: number; protein: number; onChange: (patch: Partial<Profile>) => void }) {
  return (
    <div className="set-rows target-inputs">
      <TargetStepper field="kcalTarget" label={t('settings.kcal')} value={kcal} onChange={(v) => onChange({ kcalTarget: v })} />
      <TargetStepper field="proteinTarget" label={t('settings.protein')} value={protein} onChange={(v) => onChange({ proteinTarget: v })} />
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
      <div className="set-rows calc-card">
        <div className="set-row">
          <span className="set-row-label" aria-hidden="true">
            {t('calc.sex')}
          </span>
          <div className="set-mini-seg calc-sex">
            <Segmented label={t('calc.sex')} hideLabel value={b.sex} onChange={(sex) => set({ sex })} options={SEXES.map((x) => ({ value: x, label: sexName(x) }))} />
          </div>
        </div>
        <NumberField label={t('calc.age')} value={b.age} min={lim.age[0]} max={lim.age[1]} onCommit={(age) => set({ age })} />
        <NumberField label={t('calc.height')} value={b.heightCm} min={lim.heightCm[0]} max={lim.heightCm[1]} onCommit={(heightCm) => set({ heightCm })} />
        <NumberField label={t('calc.weight')} value={b.weightKg} min={lim.weightKg[0]} max={lim.weightKg[1]} onCommit={(weightKg) => set({ weightKg })} />
        <SelectRow label={t('calc.activity')} stacked value={b.activity} onChange={(activity) => set({ activity })} options={ACTIVITIES.map((a) => ({ value: a, label: activityName(a) }))} />
        <div className="set-row set-row-stack">
          <span className="set-row-label" aria-hidden="true">
            {t('calc.goal')}
          </span>
          <div className="set-seg">
            <Segmented label={t('calc.goal')} hideLabel value={b.goal} onChange={(goal) => set({ goal })} options={GOALS.map((g) => ({ value: g, label: goalName(g) }))} />
          </div>
        </div>
      </div>
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
              <button type="button" className="btn btn-accent btn-block calc-use" onClick={() => onApply({ kcalTarget: s.kcalTarget, proteinTarget: s.proteinTarget, body: b })}>
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
