import type { Nutrients } from '../../types.ts';
import { KCAL_TOLERANCE } from '../../lib/planner.ts';
import { t } from '../../i18n/index.ts';
import { tx } from '../../i18n/nodes.tsx';
import { grams, num, nutrientName, percent } from '../../i18n/labels.ts';
import { Icon } from './Icon.tsx';

interface Props {
  totals: Nutrients;
  kcalTarget: number;
  proteinTarget: number;
  headingId: string;
}

/** WHO: under 2,000 mg sodium a day for adults. */
export const SODIUM_LIMIT_MG = 2000;
/** Above this the day's sodium is flagged (the US and EU upper reference, 2,300 mg). */
export const SODIUM_HIGH_MG = 2300;

/** Energy from each macro, in kcal (Atwater: fiber at 2 kcal/g). */
export function energySplit(n: Nutrients): { protein: number; carbs: number; fat: number } {
  const fiber = Math.min(n.fiber, n.carbs);
  return { protein: 4 * n.protein, carbs: 4 * (n.carbs - fiber) + 2 * fiber, fat: 9 * n.fat };
}

export type KcalStatus = 'in' | 'under' | 'over';

export function kcalStatus(kcal: number, target: number): KcalStatus {
  if (kcal < target * (1 - KCAL_TOLERANCE)) return 'under';
  if (kcal > target * (1 + KCAL_TOLERANCE)) return 'over';
  return 'in';
}

/** The day's kcal against the target (with the on-target band labelled), the energy split and the nutrients. */
export function DaySummary({ totals, kcalTarget, proteinTarget, headingId }: Props) {
  const kcal = Math.round(totals.kcal);
  const status = kcalStatus(kcal, kcalTarget);
  const diff = Math.abs(kcal - kcalTarget);
  const statusText = status === 'in' ? t('today.status.in') : t(`today.status.${status}`, { n: num(diff) });
  // The meter runs to 125% of the target; the band marks the on-target range, ±10%.
  const scale = kcalTarget * 1.25;
  const low = kcalTarget * (1 - KCAL_TOLERANCE);
  const high = kcalTarget * (1 + KCAL_TOLERANCE);
  const fill = Math.min(100, (kcal / scale) * 100);
  const bandStart = (low / scale) * 100;
  const bandEnd = (high / scale) * 100;
  const e = energySplit(totals);
  const eTotal = e.protein + e.carbs + e.fat || 1;
  const shares = [
    { key: 'protein', share: e.protein / eTotal },
    { key: 'carbs', share: e.carbs / eTotal },
    { key: 'fat', share: e.fat / eTotal },
  ] as const;
  const proteinMet = totals.protein >= proteinTarget - 0.5;
  const sodiumHigh = totals.sodium > SODIUM_HIGH_MG;

  return (
    <section className="summary card" aria-labelledby={headingId}>
      <h2 id={headingId} className="visually-hidden">
        {t('today.summary')}
      </h2>
      <div className="summary-top">
        <p className="summary-kcal">
          {tx('today.kcalOf', {
            n: <span className="summary-big num">{num(kcal)}</span>,
            target: <span className="num">{num(kcalTarget)}</span>,
          })}
        </p>
        <span className={`status status-${status}`}>
          {status === 'in' ? <Icon name="check" size={16} /> : null}
          {statusText}
        </span>
      </div>
      <div className="meter" aria-hidden="true">
        <span className="meter-band" style={{ insetInlineStart: `${bandStart}%`, inlineSize: `${bandEnd - bandStart}%` }} />
        <span className={`meter-fill meter-${status}`} style={{ inlineSize: `${fill}%` }} />
        <span className="meter-target" style={{ insetInlineStart: `${(kcalTarget / scale) * 100}%` }} />
      </div>
      <p className="meter-caption">
        <span className="band-swatch" aria-hidden="true" />
        {t('today.targetBand', { low: num(low), high: num(high) })}
      </p>
      <div className="split" aria-hidden="true">
        {shares.map((s) => (
          <span key={s.key} className={`split-seg seg-${s.key}`} style={{ flexGrow: s.share }} />
        ))}
      </div>
      <ul className="split-legend" aria-label={t('today.splitLabel')}>
        {shares.map((s) => (
          <li key={s.key}>
            <span className={`dot dot-${s.key}`} aria-hidden="true" />
            {tx('today.splitItem', { name: nutrientName(s.key), pct: <span className="num">{percent(s.share)}</span> })}
          </li>
        ))}
      </ul>
      <dl className="macros">
        <div className="macro">
          <dt>{nutrientName('protein')}</dt>
          <dd>
            <span className="num">{t('today.proteinOf', { n: num(totals.protein), target: num(proteinTarget) })}</span>
            {proteinMet ? (
              <>
                <Icon name="check" size={16} className="macro-ok" />
                <span className="visually-hidden">{t('today.proteinMet')}</span>
              </>
            ) : null}
          </dd>
        </div>
        <div className="macro">
          <dt>{nutrientName('carbs')}</dt>
          <dd className="num">{grams(totals.carbs)}</dd>
        </div>
        <div className="macro">
          <dt>{nutrientName('fat')}</dt>
          <dd className="num">{grams(totals.fat)}</dd>
        </div>
        <div className="macro">
          <dt>{nutrientName('fiber')}</dt>
          <dd className="num">{grams(totals.fiber)}</dd>
        </div>
        <div className={`macro macro-wide${sodiumHigh ? ' is-high' : ''}`}>
          <dt>{nutrientName('sodium')}</dt>
          <dd>
            <span className="num">{t('today.sodiumOf', { n: num(totals.sodium), limit: num(SODIUM_LIMIT_MG) })}</span>
            {sodiumHigh ? <span className="status status-over status-xs">{t('today.sodiumHigh')}</span> : null}
          </dd>
        </div>
      </dl>
    </section>
  );
}
