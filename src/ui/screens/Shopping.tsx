import { useId, useMemo, useState } from 'react';
import type { Aisle } from '../../types.ts';
import type { ShoppingItem, ShoppingRange } from '../../lib/shopping.ts';
import { buildShoppingList, shoppingDates, toPlainText } from '../../lib/shopping.ts';
import { shoppingCheckedIds } from '../../lib/storage.ts';
import { addDays, startOfWeek } from '../../lib/dates.ts';
import type { ISODate } from '../../lib/dates.ts';
import { intlLocale, t, tp } from '../../i18n/index.ts';
import { aisleName, dateSpan, dayMonth, friendlyDate, listJoin, unitWord } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { usePlan } from '../plan.tsx';
import { routeHash } from '../router.ts';
import { conflictingOverrides } from '../planHelpers.ts';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import { EmptyState, Segmented } from '../components/controls.tsx';
import { PageHead } from '../components/PageHead.tsx';
import { useToast } from '../components/Toast.tsx';

const AISLE_ICONS: Readonly<Record<Aisle, IconName>> = {
  produce: 'leaf',
  herbs: 'leaf',
  'meat-poultry': 'drumstick',
  seafood: 'fish',
  'dairy-eggs': 'milk',
  'bakery-grains': 'wheat',
  legumes: 'bean',
  'nuts-seeds': 'nut',
  'oils-vinegars': 'droplet',
  spices: 'flame',
  'condiments-sauces': 'package',
  'canned-jarred': 'package',
  frozen: 'snowflake',
  'baking-sweeteners': 'candy',
  other: 'package',
};

/**
 * One item: a tick circle, the name, and what to buy at the end. The whole row is the checkbox (named by the item
 * and its amount). One secondary line carries the other amount ("≈ 11 medium"), the halal sourcing note and the
 * recipes it is for: "For Shakshuka" for one, "For 5 recipes" for several, which expands to list them.
 */
function ItemRow({ item, checked, onToggle, recipeNames, halalNote }: { item: ShoppingItem; checked: boolean; onToggle: () => void; recipeNames: readonly string[]; halalNote?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const all = listJoin(recipeNames);
  const forAll = recipeNames.length ? t('shop.for', { recipes: all }) : '';
  const many = recipeNames.length > 1;
  const parts = [item.countHint, halalNote, many ? undefined : forAll || undefined].filter((p): p is string => !!p);
  const described = [item.countHint, halalNote, forAll].filter(Boolean).join(t('common.sep'));
  return (
    <li className={`shop-row${checked ? ' is-checked' : ''}`}>
      <input type="checkbox" className="shop-input" checked={checked} onChange={onToggle} aria-labelledby={`${id}-n ${id}-a`} aria-describedby={described ? `${id}-d` : undefined} />
      <span className={`tick shop-tick${checked ? ' is-on' : ''}`} aria-hidden="true">
        {checked ? <Icon name="check" size={15} /> : null}
      </span>
      <span className="shop-text">
        <span id={`${id}-n`} className="shop-name">
          {item.name}
        </span>
        {parts.length || many ? (
          <span className="shop-sub" aria-hidden={many ? undefined : true}>
            {parts.length ? <span aria-hidden="true">{parts.join(t('common.sep'))}</span> : null}
            {many ? (
              <span className="shop-sub-tail">
                {parts.length ? <span aria-hidden="true">{t('common.sep')}</span> : null}
                <button type="button" className="shop-for-btn" aria-expanded={open} aria-controls={`${id}-l`} onClick={() => setOpen((o) => !o)}>
                  {tp('shop.forCount', recipeNames.length)}
                  <Icon name="chevronDown" size={14} className="shop-for-chevron" />
                </button>
              </span>
            ) : null}
          </span>
        ) : null}
        {many ? (
          <span id={`${id}-l`} className="shop-for-list" hidden={!open} aria-hidden="true">
            {all}
          </span>
        ) : null}
      </span>
      <span id={`${id}-a`} className="shop-amount num">
        {item.amount}
      </span>
      {described ? (
        <span id={`${id}-d`} className="visually-hidden">
          {described}
        </span>
      ) : null}
    </li>
  );
}

/** A halal note reads as a short line here: without the closing full stop. */
function shortNote(note: string | undefined): string | undefined {
  return note ? note.replace(/\.$/, '') : undefined;
}

export function ShoppingScreen() {
  const { state, dispatch } = useAppState();
  const lib = useLibrary();
  const plan = usePlan();
  const notify = useToast();
  const [range, setRange] = useState<ShoppingRange>('week');
  const household = state.profile.householdSize;

  const dates = shoppingDates(range, plan.today, state.profile.weekStart);
  const first = dates[0] as ISODate;
  const through = dates[dates.length - 1] as ISODate;
  const list = useMemo(() => {
    const days = dates.map((d) => plan.day(d));
    return buildShoppingList(days, lib.byId, lib.ingredientIndex, household, { locale: intlLocale(), unitLabel: unitWord });
  }, [plan, lib, household, first, through]);
  const checked = new Set(shoppingCheckedIds(state, through));
  const all = [...list.groups.flatMap((g) => g.items), ...list.staples];
  const done = all.filter((i) => checked.has(i.ingredientId)).length;
  const names = (item: ShoppingItem) => item.recipeIds.map((id) => lib.byId.get(id)?.name ?? id);
  const halalNote = (item: ShoppingItem) => shortNote(item.ingredientIds.map((id) => lib.ingredientIndex.get(id)?.halalNote).find(Boolean));
  // The week range rolls over to next week near the end of this one: then it's named by its last day.
  const weekEnd = addDays(startOfWeek(plan.today, state.profile.weekStart), 6);
  const weekRange = shoppingDates('week', plan.today, state.profile.weekStart);
  const weekLast = weekRange[weekRange.length - 1] as ISODate;
  const weekLabel = weekLast > weekEnd ? t('shop.range.until', { date: dayMonth(weekLast) }) : t('shop.range.week');
  const conflicts = conflictingOverrides(state.overrides, lib.byId, state.profile, first).filter((o) => o.date <= through);
  const toggle = (id: string) => dispatch({ type: 'shopToggle', ingredientId: id, through });

  const text = () =>
    toPlainText(list, {
      title: t('shop.textTitle', { dates: dateSpan(first, through) }),
      aisleLabel: aisleName,
      staplesLabel: t('shop.staples'),
      locale: intlLocale(),
      unitLabel: unitWord,
      skip: checked,
      formatLine: ({ name, amount, countHint }) => (countHint ? t('shop.textLineCount', { name, amount, count: countHint }) : t('shop.textLine', { name, amount })),
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text());
      notify(t('shop.copied'));
    } catch {
      notify(t('shop.copyFailed'));
    }
  };
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const share = async () => {
    try {
      await navigator.share({ title: t('shop.title'), text: text() });
    } catch {
      // Cancelled or unavailable: nothing to do.
    }
  };
  const row = (i: ShoppingItem) => <ItemRow key={i.ingredientId} item={i} checked={checked.has(i.ingredientId)} onToggle={() => toggle(i.ingredientId)} recipeNames={names(i)} halalNote={halalNote(i)} />;

  return (
    <div className="shop">
      <PageHead sub={<span className="num">{t('common.dotPair', { a: tp('shop.household', household), b: dateSpan(first, through) })}</span>} title={t('shop.title')}>
        {all.length ? (
          <div className="capsule glass shop-capsule">
            <button type="button" className="icon-btn shop-capsule-btn" onClick={copy} aria-label={t('shop.copyLabel')}>
              <Icon name="copy" size={18} />
            </button>
            {canShare ? (
              <button type="button" className="icon-btn shop-capsule-btn" onClick={share} aria-label={t('shop.shareLabel')}>
                <Icon name="share" size={18} />
              </button>
            ) : null}
          </div>
        ) : null}
      </PageHead>

      <div className="shop-range">
        <Segmented
          label={t('shop.rangeLabel')}
          hideLabel
          value={range}
          onChange={setRange}
          options={[
            { value: 'today', label: t('shop.range.today') },
            { value: 'next3', label: t('shop.range.next3') },
            { value: 'week', label: weekLabel },
          ]}
        />
      </div>

      {conflicts.length ? (
        <p className="notice" role="note">
          <Icon name="info" size={20} />
          <span>
            {tp('shop.conflict', conflicts.length)}{' '}
            <a href={routeHash({ name: 'today', date: conflicts[0]!.date === plan.today ? null : conflicts[0]!.date })}>
              {t('shop.conflictReview', { date: friendlyDate(conflicts[0]!.date, plan.today) })}
            </a>
          </span>
        </p>
      ) : null}

      {all.length === 0 ? (
        <EmptyState icon="basket" title={t('shop.empty.title')}>
          <p>{t('shop.empty.body')}</p>
        </EmptyState>
      ) : (
        <>
          <div className="shop-progress">
            <div className="shop-progress-row">
              <p className="shop-progress-label num" aria-live="polite">
                {t('shop.progress', { done, total: all.length })}
              </p>
              {done > 0 ? (
                <button type="button" className="shop-untick" onClick={() => dispatch({ type: 'shopClear' })}>
                  {t('shop.untickAll')}
                </button>
              ) : null}
            </div>
            <div className="shop-bar" aria-hidden="true">
              <span className="shop-bar-fill" style={{ inlineSize: `${(done / all.length) * 100}%` }} />
            </div>
          </div>

          <div className="shop-aisles">
            {list.groups.map((g) => (
              <section key={g.aisle} className="shop-aisle" aria-labelledby={`aisle-${g.aisle}`}>
                <h2 className="shop-aisle-label">
                  <Icon name={AISLE_ICONS[g.aisle]} size={16} />
                  <span id={`aisle-${g.aisle}`}>{aisleName(g.aisle)}</span>
                </h2>
                <ul className="shop-list">{g.items.map(row)}</ul>
              </section>
            ))}
          </div>

          {list.staples.length ? (
            <details className="shop-staples">
              <summary className="shop-staples-summary">
                <span className="shop-staples-icon" aria-hidden="true">
                  <Icon name="package" size={16} />
                </span>
                <span className="shop-staples-text">
                  <span className="shop-staples-title num">{t('shop.staplesCount', { n: list.staples.length })}</span>
                  <span className="shop-staples-hint">{t('shop.staplesHint')}</span>
                </span>
                <Icon name="chevronDown" size={18} className="shop-staples-chevron" />
              </summary>
              <ul className="shop-list shop-staples-list">{list.staples.map(row)}</ul>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}
