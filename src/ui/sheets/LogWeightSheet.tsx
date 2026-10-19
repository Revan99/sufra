// Log weight: a big value with − and + (0.1 steps, or type it), kg or lb, the date and time, and the last few
// weights with their change. Saved only on Save (Cancel · Log weight · Save header).
import { useId, useState } from 'react';
import type { ISODate } from '../../lib/dates.ts';
import { isISODate } from '../../lib/dates.ts';
import { WEIGHT_LIMITS_KG, clockTime, fromUnit, latestWeight, toUnit } from '../../lib/tracker.ts';
import type { WeightUnit } from '../../lib/tracker.ts';
import { recentWeights } from '../../lib/progress.ts';
import { intlLocale, t } from '../../i18n/index.ts';
import { dayMonth, shortDate } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { usePlan } from '../plan.tsx';
import { Sheet } from '../components/Sheet.tsx';
import { Icon } from '../components/Icon.tsx';
import { Segmented } from '../components/controls.tsx';
import { useToast } from '../components/Toast.tsx';

/** A number with exactly one decimal in the active locale: "72.4", "73.0". */
export function fixed1(n: number): string {
  try {
    return new Intl.NumberFormat(intlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
  } catch {
    return n.toFixed(1);
  }
}

/** A change with its sign and one decimal: "−0.3", "+1.2", "0.0" (a true minus sign). */
export function signed1(n: number): string {
  const r = Math.round(n * 10) / 10;
  const abs = fixed1(Math.abs(r));
  return r < 0 ? `\u2212${abs}` : r > 0 ? `+${abs}` : abs;
}

/** A weight stored in kg, shown in the user's unit: "72.4 kg", "159.6 lb". */
export function weightText(kg: number, unit: WeightUnit): string {
  return t(unit === 'lb' ? 'progress.weight.lb' : 'progress.weight.kg', { n: fixed1(toUnit(kg, unit)) });
}

const STEP = 0.1;
const DEFAULT_KG = 70;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The limits in the shown unit, rounded inward to 0.1. */
function limits(unit: WeightUnit): [number, number] {
  return [Math.ceil(toUnit(WEIGHT_LIMITS_KG[0], unit) * 10) / 10, Math.floor(toUnit(WEIGHT_LIMITS_KG[1], unit) * 10) / 10];
}

function parseDraft(s: string): number | null {
  const n = Number(s.trim().replace(',', '.'));
  return s.trim() && Number.isFinite(n) ? n : null;
}

/** "72.4" for the input: a plain decimal point, whatever the locale. */
const draftOf = (n: number) => round1(n).toFixed(1);

/** Width that fits the typed number at the big size: digits are tabular, the point and comma are narrow. */
function numberWidth(s: string): string {
  const digits = (s.match(/\d/g) ?? []).length;
  const other = s.length - digits;
  return `${Math.max(2.4, digits * 0.55 + other * 0.28 + 0.08)}em`;
}

/** "9:41" from "09:41". */
const clockLabel = (hhmm: string) => hhmm.replace(/^0(\d)/, '$1');

export function LogWeightSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useAppState();
  const plan = usePlan();
  const notify = useToast();
  const today = plan.today;
  const unit = state.tracker.unit;
  const inputId = useId();
  const errorId = useId();

  const startKg = () => latestWeight(state.tracker)?.kg ?? state.profile.body?.weightKg ?? DEFAULT_KG;
  const [draft, setDraft] = useState(() => draftOf(toUnit(startKg(), unit)));
  const [date, setDate] = useState<ISODate>(today);
  const [time, setTime] = useState(() => clockTime());
  const [error, setError] = useState<string | null>(null);

  // A fresh start each time the sheet opens: the latest weight, today, now.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(draftOf(toUnit(startKg(), unit)));
      setDate(today);
      setTime(clockTime());
      setError(null);
    }
  }

  const [min, max] = limits(unit);
  const value = parseDraft(draft);
  const valid = value !== null && value >= min && value <= max;
  const unitLabel = t(unit === 'lb' ? 'logWeight.lb' : 'logWeight.kg');

  const step = (dir: 1 | -1) => {
    const base = value ?? toUnit(startKg(), unit);
    setDraft(draftOf(Math.min(max, Math.max(min, round1(base) + dir * STEP))));
    setError(null);
  };

  const changeUnit = (next: WeightUnit) => {
    if (next === unit) return;
    if (value !== null) setDraft(draftOf(toUnit(fromUnit(value, unit), next)));
    dispatch({ type: 'weightUnit', unit: next });
    setError(null);
  };

  const save = () => {
    if (!valid || value === null) {
      setError(t('logWeight.invalid', { min: fixed1(min), max: fixed1(max), unit: unitLabel }));
      return;
    }
    if (!isISODate(date) || date > today) {
      setError(t('logWeight.future'));
      return;
    }
    const kg = round1(fromUnit(value, unit));
    dispatch({ type: 'logWeight', entry: { date, at: time || clockTime(), kg } });
    const body = state.profile.body;
    if (body && date === today && body.weightKg !== kg) dispatch({ type: 'profile', patch: { body: { ...body, weightKg: kg } } });
    const shown = weightText(kg, unit);
    notify(date === today ? t('logWeight.saved', { value: shown }) : t('logWeight.savedOn', { value: shown, date: shortDate(date) }));
    onClose();
  };

  const recent = recentWeights(state.tracker, 3);
  const atMin = value !== null && value <= min;
  const atMax = value !== null && value >= max;

  return (
    <Sheet open={open} onClose={onClose} title={t('logWeight.title')} confirm={{ label: t('logWeight.save'), onConfirm: save, disabled: !valid }} className="lw-sheet">
      <div className="lw-picker" role="group" aria-labelledby={inputId}>
        <button type="button" className="lw-step" onClick={() => !atMin && step(-1)} aria-disabled={atMin || undefined} aria-label={t('common.decrease', { name: t('logWeight.name') })}>
          <Icon name="minus" size={22} />
        </button>
        <span className="lw-value">
          <input
            id={inputId}
            className="lw-number num"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={draft}
            style={{ inlineSize: numberWidth(draft) }}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onBlur={() => {
              if (value !== null) setDraft(draftOf(Math.min(max, Math.max(min, value))));
            }}
            aria-label={t('logWeight.value', { unit: unitLabel })}
            aria-invalid={!valid || undefined}
            aria-describedby={error ? errorId : undefined}
          />
          <span className="lw-unit" aria-hidden="true">
            {unitLabel}
          </span>
        </span>
        <button type="button" className="lw-step" onClick={() => !atMax && step(1)} aria-disabled={atMax || undefined} aria-label={t('common.increase', { name: t('logWeight.name') })}>
          <Icon name="plus" size={22} />
        </button>
      </div>

      {error ? (
        <p id={errorId} className="lw-error" role="alert">
          {error}
        </p>
      ) : null}

      <Segmented
        label={t('logWeight.unit')}
        hideLabel
        options={[
          { value: 'kg', label: t('logWeight.kg') },
          { value: 'lb', label: t('logWeight.lb') },
        ]}
        value={unit}
        onChange={changeUnit}
      />

      <div className="lw-fields">
        <label className="lw-field">
          <span className="lw-field-label">{t('logWeight.date')}</span>
          <span className="lw-field-value" aria-hidden="true">
            {date === today ? t('logWeight.todayDate', { date: dayMonth(date) }) : shortDate(date)}
            <Icon name="chevronRight" size={15} />
          </span>
          <input
            className="lw-native"
            type="date"
            value={date}
            max={today}
            required
            onChange={(e) => {
              if (isISODate(e.target.value)) setDate(e.target.value);
              setError(null);
            }}
            onClick={(e) => openPicker(e.currentTarget)}
          />
        </label>
        <label className="lw-field">
          <span className="lw-field-label">{t('logWeight.time')}</span>
          <span className="lw-field-value num" aria-hidden="true">
            {clockLabel(time)}
            <Icon name="chevronRight" size={15} />
          </span>
          <input className="lw-native" type="time" value={time} required onChange={(e) => e.target.value && setTime(e.target.value)} onClick={(e) => openPicker(e.currentTarget)} />
        </label>
      </div>

      {recent.length ? (
        <section className="lw-recent" aria-labelledby={`${inputId}-recent`}>
          <h3 id={`${inputId}-recent`} className="lw-recent-title">
            {t('logWeight.recent')}
          </h3>
          <ul className="lw-recent-list">
            {recent.map(({ entry, change }) => {
              const delta = change === null ? null : round1(toUnit(change, unit));
              return (
                <li key={entry.date} className="lw-recent-row">
                  <span className="lw-recent-date">{shortDate(entry.date)}</span>
                  <span className="lw-recent-value">
                    <span className="lw-recent-weight num">{weightText(entry.kg, unit)}</span>
                    {delta !== null ? (
                      <span className={`lw-recent-delta num${delta > 0 ? ' is-up' : ''}`}>
                        <span aria-hidden="true">{signed1(delta)}</span>
                        <span className="visually-hidden">{t('logWeight.change', { change: signed1(delta) })}</span>
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </Sheet>
  );
}

/** Opens the native date or time picker where the browser supports it (the input itself is invisible). */
function openPicker(input: HTMLInputElement) {
  try {
    input.showPicker?.();
  } catch {
    // Not allowed here (no user gesture, or a cross-origin frame): the input still takes typing.
  }
}
