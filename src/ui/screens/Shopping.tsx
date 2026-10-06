import { useId, useMemo, useState } from 'react';
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
import { EmptyState, Segmented } from '../components/controls.tsx';
import { useToast } from '../components/Toast.tsx';

/**
 * One item: the checkbox's name is the item and its amount; the recipes it is for are its description. One recipe
 * shows as "For Shakshuka" (wrapping, never cut); several as "For 5 recipes", which expands to list them.
 */
function ItemRow({ item, checked, onToggle, recipeNames }: { item: ShoppingItem; checked: boolean; onToggle: () => void; recipeNames: readonly string[] }) {
  const forId = useId();
  const all = listJoin(recipeNames);
  return (
    <li className={`shop-item${checked ? ' is-checked' : ''}`}>
      <label className="shop-label">
        <input type="checkbox" className="shop-check" checked={checked} onChange={onToggle} aria-describedby={forId} />
        <span className="shop-box" aria-hidden="true">
          <Icon name="check" size={18} />
        </span>
        <span className="shop-name">{item.name}</span>
        <span className="shop-amount num">
          {item.amount}
          {item.countHint ? <span className="shop-count">{item.countHint}</span> : null}
        </span>
      </label>
      <span id={forId} className="visually-hidden">
        {t('shop.for', { recipes: all })}
      </span>
      {recipeNames.length > 1 ? (
        <details className="shop-for">
          <summary>
            {tp('shop.forCount', recipeNames.length)}
            <Icon name="chevronDown" size={16} className="shop-for-chevron" />
          </summary>
          <p>{all}</p>
        </details>
      ) : (
        <p className="shop-for" aria-hidden="true">
          {t('shop.for', { recipes: all })}
        </p>
      )}
    </li>
  );
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

  return (
    <>
      <header className="screen-head">
        <div>
          <p className="eyebrow">{tp('shop.household', household)}</p>
          <h1 tabIndex={-1} className="screen-title">
            {t('shop.title')}
          </h1>
        </div>
      </header>
      <div className="shop-controls">
        <Segmented
          label={t('shop.rangeLabel')}
          value={range}
          onChange={setRange}
          options={[
            { value: 'today', label: t('shop.range.today') },
            { value: 'next3', label: t('shop.range.next3') },
            { value: 'week', label: weekLabel },
          ]}
        />
        <p className="shop-dates num">{dateSpan(first, through)}</p>
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
          <div className="shop-bar">
            <p className="shop-progress num" aria-live="polite">
              {t('shop.progress', { done, total: all.length })}
            </p>
            <div className="shop-actions">
              <button type="button" className="btn btn-quiet btn-sm" onClick={copy}>
                <Icon name="copy" size={20} />
                {t('shop.copy')}
              </button>
              {canShare ? (
                <button type="button" className="btn btn-quiet btn-sm" onClick={share}>
                  <Icon name="share" size={20} />
                  {t('shop.share')}
                </button>
              ) : null}
              {done > 0 ? (
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => dispatch({ type: 'shopClear' })}>
                  {t('shop.untickAll')}
                </button>
              ) : null}
            </div>
          </div>
          <div className="shop-groups">
            {list.groups.map((g) => (
              <section key={g.aisle} className="card shop-group" aria-labelledby={`aisle-${g.aisle}`}>
                <h2 id={`aisle-${g.aisle}`} className="panel-title">
                  {aisleName(g.aisle)}
                </h2>
                <ul className="shop-list">
                  {g.items.map((i) => (
                    <ItemRow key={i.ingredientId} item={i} checked={checked.has(i.ingredientId)} onToggle={() => toggle(i.ingredientId)} recipeNames={names(i)} />
                  ))}
                </ul>
              </section>
            ))}
            {list.staples.length ? (
              <details className="card shop-group staples">
                <summary className="staples-summary">
                  <span className="panel-title">{t('shop.staples')}</span>
                  <span className="staples-count num">{list.staples.length}</span>
                  <Icon name="chevronDown" size={20} className="staples-chevron" />
                </summary>
                <p className="panel-sub">{t('shop.staplesHint')}</p>
                <ul className="shop-list">
                  {list.staples.map((i) => (
                    <ItemRow key={i.ingredientId} item={i} checked={checked.has(i.ingredientId)} onToggle={() => toggle(i.ingredientId)} recipeNames={names(i)} />
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
