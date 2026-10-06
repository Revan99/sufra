// Small form controls: segmented radio group, stepper, check chips, empty state.
import { useId } from 'react';
import type { ReactNode } from 'react';
import { t } from '../../i18n/index.ts';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';

interface Option<T extends string | number> {
  value: T;
  label: string;
  /** Second line, for roomy radio cards. */
  description?: string;
}

/** A radio group drawn as a segmented control (arrow keys move between options, as native radios do). */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  hideLabel = false,
  name,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (v: T) => void;
  hideLabel?: boolean;
  name?: string;
}) {
  const auto = useId();
  const group = name ?? auto;
  return (
    <fieldset className="segmented">
      <legend className={hideLabel ? 'visually-hidden' : 'field-label'}>{label}</legend>
      <div className="segmented-track">
        {options.map((o) => (
          <label key={String(o.value)} className="segmented-option">
            <input type="radio" name={group} value={String(o.value)} checked={o.value === value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Radio cards with a title and description (diet choice). */
export function RadioCards<T extends string>({
  label,
  options,
  value,
  onChange,
  hideLabel = false,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (v: T) => void;
  hideLabel?: boolean;
}) {
  const group = useId();
  return (
    <fieldset className="radio-cards">
      <legend className={hideLabel ? 'visually-hidden' : 'field-label'}>{label}</legend>
      {options.map((o) => (
        <label key={o.value} className="radio-card">
          <input type="radio" name={group} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} />
          <span className="radio-card-text">
            <span className="radio-card-title">{o.label}</span>
            {o.description ? <span className="radio-card-desc">{o.description}</span> : null}
          </span>
          <Icon name="check" className="radio-card-check" size={20} />
        </label>
      ))}
    </fieldset>
  );
}

/** Toggle chips over checkboxes (allergens, browse filters). */
export function CheckChips<T extends string>({
  label,
  options,
  values,
  onToggle,
  hideLabel = false,
}: {
  label: string;
  options: readonly Option<T>[];
  values: readonly T[];
  onToggle: (v: T) => void;
  hideLabel?: boolean;
}) {
  return (
    <fieldset className="chips">
      <legend className={hideLabel ? 'visually-hidden' : 'field-label'}>{label}</legend>
      <div className="chips-row">
        {options.map((o) => (
          <label key={o.value} className="chip chip-check">
            <input type="checkbox" checked={values.includes(o.value)} onChange={() => onToggle(o.value)} />
            <Icon name="check" size={16} className="chip-tick" />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A − value + stepper. The value is announced through the output element. */
export function Stepper({
  label,
  value,
  display,
  onChange,
  min,
  max,
  step = 1,
  next,
  prev,
}: {
  label: string;
  value: number;
  display?: string;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  next?: (v: number) => number;
  prev?: (v: number) => number;
}) {
  const id = useId();
  const up = next ?? ((v: number) => v + step);
  const down = prev ?? ((v: number) => v - step);
  const atMin = value <= min;
  const atMax = value >= max;
  // aria-disabled rather than disabled: a disabled button drops keyboard focus to <body> the moment the value
  // reaches its limit.
  return (
    <div className="stepper" role="group" aria-labelledby={id}>
      <span id={id} className="field-label">
        {label}
      </span>
      <div className="stepper-controls">
        <button type="button" className="icon-btn stepper-btn" onClick={() => !atMin && onChange(Math.max(min, down(value)))} aria-disabled={atMin || undefined} aria-label={t('common.decrease', { name: label })}>
          <Icon name="minus" />
        </button>
        <output className="stepper-value" aria-live="polite">
          {display ?? value}
        </output>
        <button type="button" className="icon-btn stepper-btn" onClick={() => !atMax && onChange(Math.min(max, up(value)))} aria-disabled={atMax || undefined} aria-label={t('common.increase', { name: label })}>
          <Icon name="plus" />
        </button>
      </div>
    </div>
  );
}

export function EmptyState({ icon = 'leaf', title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-mark" aria-hidden="true">
        <Icon name={icon} size={28} />
      </div>
      <h2 className="empty-title">{title}</h2>
      {children ? <div className="empty-body">{children}</div> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}
