import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CatalogRecipe, Cuisine, Diet, MealSlot } from '../../types.ts';
import { MEAL_SLOTS } from '../../types.ts';
import { QUICK_MINUTES, cuisinesIn, filterRecipes, isEligible } from '../../lib/filters.ts';
import type { BrowseFilters } from '../../lib/filters.ts';
import { t, tp } from '../../i18n/index.ts';
import { cuisineName, dietName, kcal, minutes, slotName } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { recipeRoute, routeHash } from '../router.ts';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import { PageHead } from '../components/PageHead.tsx';
import { RecipeImage } from '../components/RecipeImage.tsx';
import { EmptyState } from '../components/controls.tsx';
import { useToast } from '../components/Toast.tsx';

interface Filters {
  query: string;
  slot: MealSlot | null;
  diet: Diet | null;
  quick: boolean;
  cuisine: Cuisine | null;
  favoritesOnly: boolean;
}

const NO_FILTERS: Filters = { query: '', slot: null, diet: null, quick: false, cuisine: null, favoritesOnly: false };
/** Cards drawn at first; more are added as the end of the grid scrolls into view. */
const PAGE = 48;
// Kept across visits in this session, so going into a recipe and back keeps the search and the scroll depth.
let remembered: Filters = NO_FILTERS;
let rememberedShown = PAGE;

const DIETS: readonly Diet[] = ['pescatarian', 'vegetarian', 'vegan'];

/** Half the column on phones, a third on tablets, a quarter beside the sidebar. */
const CARD_SIZES = '(min-width: 1000px) 16rem, (min-width: 600px) 13rem, 50vw';

function RecipeCard({ recipe, favorite, fits, onFavorite }: { recipe: CatalogRecipe; favorite: boolean; fits: boolean; onFavorite: () => void }) {
  return (
    <article className="rc" aria-labelledby={`rc-${recipe.id}`}>
      <div className="rc-photo">
        <RecipeImage recipe={recipe} kind="card" sizes={CARD_SIZES} plateSize={120} className="rc-img" />
        <span className="rc-kcal glass-clear num">{kcal(recipe.perServing.kcal)}</span>
        <button type="button" className={`rc-fav${favorite ? ' is-on' : ''}`} aria-pressed={favorite} aria-label={t('common.favoriteName', { name: recipe.name })} onClick={onFavorite}>
          <span className="rc-fav-glass glass-clear">
            <Icon name="heart" size={17} />
          </span>
        </button>
      </div>
      <div className="rc-text">
        <h2 className="rc-name" id={`rc-${recipe.id}`}>
          <a className="stretched" href={routeHash(recipeRoute(recipe.id))}>
            {recipe.name}
          </a>
        </h2>
        <p className="rc-meta">{t('common.dotPair', { a: cuisineName(recipe.cuisine), b: minutes(recipe.totalMinutes) })}</p>
        {!fits ? <p className="rc-outside">{t('badge.outside')}</p> : null}
      </div>
    </article>
  );
}

/** A filter pill around a native select: black with white text once a value is chosen. */
function SelectChip<V extends string>({ label, value, allLabel, options, onChange }: { label: string; value: V | null; allLabel: string; options: readonly { value: V; label: string }[]; onChange: (v: V | null) => void }) {
  const shown = options.find((o) => o.value === value)?.label ?? allLabel;
  return (
    <label className={`rf-chip${value ? ' is-active' : ''}`}>
      <span className="visually-hidden">{label}</span>
      <span className="rf-chip-text" aria-hidden="true">
        {shown}
      </span>
      <Icon name="chevronDown" size={14} />
      <select value={value ?? ''} onChange={(e) => onChange((e.currentTarget.value || null) as V | null)}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** An on/off filter pill (a checkbox). */
function ToggleChip({ checked, onChange, icon, children }: { checked: boolean; onChange: (on: boolean) => void; icon?: IconName; children: ReactNode }) {
  return (
    <label className={`rf-chip${checked ? ' is-active' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
      {icon ? <Icon name={icon} size={14} /> : null}
      <span className="rf-chip-text">{children}</span>
    </label>
  );
}

export function RecipesScreen({ search = false }: { search?: boolean }) {
  const { state, dispatch } = useAppState();
  const lib = useLibrary();
  const notify = useToast();
  const [f, setF] = useState<Filters>(remembered);
  const [shown, setShown] = useState(rememberedShown);
  const searchRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const update = (patch: Partial<Filters>) => {
    setF((prev) => {
      remembered = { ...prev, ...patch };
      return remembered;
    });
    rememberedShown = PAGE;
    setShown(PAGE);
  };

  // #/search (the tab bar's search button) focuses the field. A frame later, so it wins over the screen's heading,
  // which takes focus when the screen opens.
  useEffect(() => {
    if (!search) return;
    const id = requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [search]);

  const cuisines = useMemo(() => cuisinesIn(lib.catalog), [lib.catalog]);
  const results = useMemo(() => {
    const browse: BrowseFilters = { query: f.query, slot: f.slot, diet: f.diet, quick: f.quick, cuisine: f.cuisine, favoritesOnly: f.favoritesOnly };
    const found = filterRecipes(lib.catalog, browse, { ingredientIndex: lib.ingredientIndex, favorites: state.favorites });
    // Browsing (no search): recipes with a photo first, so the grid opens on pictures; a search keeps its ranking.
    return f.query.trim() ? found : [...found.filter((r) => r.photo), ...found.filter((r) => !r.photo)];
  }, [f, lib, state.favorites]);
  const active = f.query !== '' || f.slot !== null || f.diet !== null || f.quick || f.cuisine !== null || f.favoritesOnly;
  const fits = (r: CatalogRecipe) => r.slots.some((s) => isEligible(r, state.profile, s));
  const visible = results.slice(0, shown);
  const more = results.length > shown;

  // Draws the next page of cards when the end of the grid comes near (all at once where there's no observer).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!more || !el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(results.length);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown((n) => {
            rememberedShown = n + PAGE;
            return rememberedShown;
          });
        }
      },
      { rootMargin: '1200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [more, shown, results.length]);

  const toggleFavorite = (r: CatalogRecipe) => {
    const was = state.favorites.includes(r.id);
    dispatch({ type: 'favorite', id: r.id });
    notify(t(was ? 'common.favoriteRemoved' : 'common.favoriteAdded', { name: r.name }));
  };

  return (
    <>
      <PageHead
        className="recipes-head"
        sub={
          <span className="recipes-count num" aria-live="polite">
            {tp('recipes.count', results.length)}
          </span>
        }
        title={t('recipes.title')}
      >
        <div role="search" className="recipes-search-wrap">
          <label className="search-field glass recipes-search">
            <span className="visually-hidden">{t('recipes.search')}</span>
            <Icon name="search" size={18} />
            <input
              ref={searchRef}
              type="search"
              value={f.query}
              placeholder={t('recipes.searchPlaceholder')}
              onChange={(e) => update({ query: e.currentTarget.value })}
              enterKeyHint="search"
              autoComplete="off"
            />
          </label>
        </div>
      </PageHead>

      <div className="rf-row" role="group" aria-label={t('recipes.filters')}>
        <SelectChip label={t('recipes.meal')} value={f.slot} allLabel={t('recipes.allMealsChip')} options={MEAL_SLOTS.map((s) => ({ value: s, label: slotName(s) }))} onChange={(slot) => update({ slot })} />
        <SelectChip label={t('recipes.diet')} value={f.diet} allLabel={t('recipes.anyDiet')} options={DIETS.map((d) => ({ value: d, label: dietName(d) }))} onChange={(diet) => update({ diet })} />
        <ToggleChip checked={f.quick} onChange={(quick) => update({ quick })}>
          {t('recipes.quick', { n: QUICK_MINUTES })}
        </ToggleChip>
        <SelectChip label={t('recipes.cuisine')} value={f.cuisine} allLabel={t('recipes.allCuisines')} options={cuisines.map((c) => ({ value: c, label: cuisineName(c) }))} onChange={(cuisine) => update({ cuisine })} />
        <ToggleChip checked={f.favoritesOnly} onChange={(favoritesOnly) => update({ favoritesOnly })} icon="heart">
          {t('recipes.favorites')}
        </ToggleChip>
        {active ? (
          <button type="button" className="rf-chip rf-clear" onClick={() => update(NO_FILTERS)}>
            <Icon name="close" size={14} />
            <span className="rf-chip-text">{t('recipes.clear')}</span>
          </button>
        ) : null}
      </div>

      {results.length ? (
        <ul className="rc-grid">
          {visible.map((r) => (
            <li key={r.id}>
              <RecipeCard recipe={r} favorite={state.favorites.includes(r.id)} fits={fits(r)} onFavorite={() => toggleFavorite(r)} />
            </li>
          ))}
        </ul>
      ) : null}
      {more ? <div ref={sentinelRef} className="rc-sentinel" aria-hidden="true" /> : null}
      {results.length ? null : f.favoritesOnly && state.favorites.length === 0 ? (
        <EmptyState icon="heart" title={t('recipes.noFavorites.title')}>
          <p>{t('recipes.noFavorites.body')}</p>
        </EmptyState>
      ) : (
        <EmptyState
          icon="search"
          title={t('recipes.empty.title')}
          action={
            <button type="button" className="btn btn-quiet" onClick={() => update(NO_FILTERS)}>
              {t('recipes.clear')}
            </button>
          }
        >
          <p>{t('recipes.empty.body')}</p>
        </EmptyState>
      )}
    </>
  );
}
