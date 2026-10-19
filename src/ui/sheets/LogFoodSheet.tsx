// Log food: something eaten that wasn't planned. Pick the meal, then add a recipe (search the library), one of the
// recent foods in one tap, or a quick entry with a name and calories.
import { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { CatalogRecipe, MealSlot } from '../../types.ts';
import { MEAL_SLOTS } from '../../types.ts';
import type { ISODate } from '../../lib/dates.ts';
import type { FoodLog } from '../../lib/tracker.ts';
import { KCAL_LOG_LIMITS, clockTime, newFoodId, recentFoods } from '../../lib/tracker.ts';
import { t } from '../../i18n/index.ts';
import { num, slotLower, slotName } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { Icon } from '../components/Icon.tsx';
import { RecipeImage } from '../components/RecipeImage.tsx';
import { Segmented } from '../components/controls.tsx';
import { Sheet } from '../components/Sheet.tsx';
import { useToast } from '../components/Toast.tsx';

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();

/** Recipes whose name or native name contains every word of the query, best (name starts with it) first. */
export function searchRecipes(catalog: readonly CatalogRecipe[], query: string, limit = 8): CatalogRecipe[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: { r: CatalogRecipe; score: number }[] = [];
  for (const r of catalog) {
    const hay = fold(`${r.name} ${r.nativeName ?? ''}`);
    if (!words.every((w) => hay.includes(w))) continue;
    hits.push({ r, score: hay.startsWith(words[0] as string) ? 0 : 1 });
  }
  return hits
    .sort((a, b) => a.score - b.score || a.r.name.localeCompare(b.r.name))
    .slice(0, limit)
    .map((h) => h.r);
}

interface Props {
  open: boolean;
  date: ISODate;
  /** The meal to log to first (the next one). */
  initialSlot: MealSlot;
  onClose: () => void;
}

export function LogFoodSheet({ open, date, initialSlot, onClose }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={t('logFood.title')} className="log-food">
      {open ? <LogFoodBody date={date} initialSlot={initialSlot} onDone={onClose} /> : null}
    </Sheet>
  );
}

function LogFoodBody({ date, initialSlot, onDone }: { date: ISODate; initialSlot: MealSlot; onDone: () => void }) {
  const { state, dispatch } = useAppState();
  const lib = useLibrary();
  const notify = useToast();
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [kcalText, setKcalText] = useState('');
  const [proteinText, setProteinText] = useState('');
  const [tried, setTried] = useState(false);
  const ids = { name: useId(), kcal: useId(), protein: useId(), error: useId() };

  const recent = useMemo(() => recentFoods(state.tracker, 3), [state.tracker]);
  const results = useMemo(() => searchRecipes(lib.catalog, query), [lib.catalog, query]);

  const log = (food: Omit<FoodLog, 'id' | 'slot' | 'at'>) => {
    const entry: FoodLog = { ...food, id: newFoodId(), slot, at: clockTime() };
    dispatch({ type: 'logFood', date, food: entry });
    notify(t('track.foodLogged', { name: entry.name, slot: slotLower(slot) }), { label: t('common.undo'), run: () => dispatch({ type: 'removeFood', date, id: entry.id }) });
    onDone();
  };
  const logRecipe = (r: CatalogRecipe) => log({ name: r.name, kcal: Math.round(r.perServing.kcal), protein: Math.round(r.perServing.protein), fiber: Math.round(r.perServing.fiber), recipeId: r.id });
  const logAgain = (f: FoodLog) => log({ name: f.name, kcal: f.kcal, protein: f.protein, fiber: f.fiber, ...(f.recipeId ? { recipeId: f.recipeId } : {}) });

  const kcalValue = Number(kcalText.replace(',', '.'));
  const proteinValue = proteinText.trim() ? Number(proteinText.replace(',', '.')) : 0;
  const nameError = !name.trim() ? t('logFood.needName') : null;
  const kcalError = !kcalText.trim() || !Number.isFinite(kcalValue) || kcalValue < KCAL_LOG_LIMITS[0] || kcalValue > KCAL_LOG_LIMITS[1] ? t('logFood.needKcal') : null;
  const valid = !nameError && !kcalError && Number.isFinite(proteinValue) && proteinValue >= 0;
  const submit = () => {
    setTried(true);
    if (!valid) return;
    log({ name: name.trim(), kcal: Math.round(kcalValue), protein: Math.round(proteinValue), fiber: 0 });
  };
  const error = tried ? (nameError ?? kcalError) : null;

  const row = (key: string, media: ReactNode, title: string, kcal: number, protein: number, onAdd: () => void) => (
    <li key={key} className="food-row">
      {media}
      <span className="food-row-text">
        <span className="food-row-name">{title}</span>
        <span className="food-row-meta num">{t('logFood.figures', { kcal: num(kcal), protein: num(protein) })}</span>
      </span>
      <button type="button" className="food-row-add" onClick={onAdd} aria-label={t('logFood.addName', { name: title, slot: slotLower(slot) })}>
        <Icon name="plus" size={16} />
      </button>
    </li>
  );
  const icon = (
    <span className="food-row-icon" aria-hidden="true">
      <Icon name="apple" size={18} />
    </span>
  );

  return (
    <>
      <Segmented label={t('logFood.slot')} hideLabel value={slot} onChange={setSlot} options={MEAL_SLOTS.map((s) => ({ value: s, label: slotName(s) }))} />
      <label className="food-search">
        <span className="visually-hidden">{t('logFood.searchLabel')}</span>
        <Icon name="search" size={17} />
        <input type="search" value={query} onChange={(e) => setQuery(e.currentTarget.value)} placeholder={t('logFood.search', { n: num(lib.catalog.length) })} enterKeyHint="search" autoComplete="off" />
      </label>
      {query.trim() ? (
        <section className="food-group" aria-labelledby="food-results-h">
          <h3 id="food-results-h" className="section-label">
            {t('logFood.results')}
          </h3>
          {results.length ? (
            <ul className="food-list">{results.map((r) => row(r.id, <RecipeImage recipe={r} kind="option" sizes="2.5rem" plateSize={40} className="food-row-img" />, r.name, r.perServing.kcal, r.perServing.protein, () => logRecipe(r)))}</ul>
          ) : (
            <p className="food-empty">{t('logFood.noResults')}</p>
          )}
        </section>
      ) : recent.length ? (
        <section className="food-group" aria-labelledby="food-recent-h">
          <h3 id="food-recent-h" className="section-label">
            {t('logFood.recent')}
          </h3>
          <ul className="food-list">
            {recent.map((f) => {
              const r = f.recipeId ? lib.byId.get(f.recipeId) : undefined;
              return row(f.id, r ? <RecipeImage recipe={r} kind="option" sizes="2.5rem" plateSize={40} className="food-row-img" /> : icon, f.name, f.kcal, f.protein, () => logAgain(f));
            })}
          </ul>
        </section>
      ) : null}
      <section className="food-group" aria-labelledby="food-quick-h">
        <h3 id="food-quick-h" className="section-label">
          {t('logFood.quick')}
        </h3>
        <form
          className="food-fields"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="food-field">
            <label htmlFor={ids.name}>{t('logFood.name')}</label>
            <input id={ids.name} value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder={t('logFood.namePlaceholder')} maxLength={80} autoComplete="off" aria-invalid={tried && !!nameError} aria-describedby={error ? ids.error : undefined} />
          </div>
          <div className="food-field">
            <label htmlFor={ids.kcal}>{t('logFood.kcal')}</label>
            <input id={ids.kcal} value={kcalText} onChange={(e) => setKcalText(e.currentTarget.value)} placeholder={t('logFood.kcalPlaceholder')} inputMode="numeric" autoComplete="off" aria-invalid={tried && !!kcalError} aria-describedby={error ? ids.error : undefined} />
          </div>
          <div className="food-field">
            <label htmlFor={ids.protein}>{t('logFood.protein')}</label>
            <input id={ids.protein} value={proteinText} onChange={(e) => setProteinText(e.currentTarget.value)} placeholder={t('logFood.proteinPlaceholder')} inputMode="decimal" autoComplete="off" />
          </div>
          {/* Lets Enter in a field submit the form. */}
          <button type="submit" hidden />
        </form>
        {error ? (
          <p id={ids.error} className="food-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
      <button type="button" className="btn btn-lg btn-block glass-accent food-submit" onClick={submit}>
        <Icon name="plus" size={18} />
        {t('logFood.add', { slot: slotLower(slot) })}
      </button>
    </>
  );
}
