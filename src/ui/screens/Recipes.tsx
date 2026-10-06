import { useId, useMemo, useState } from 'react';
import type { CatalogRecipe, Cuisine, Diet, MealSlot } from '../../types.ts';
import { MEAL_SLOTS } from '../../types.ts';
import { QUICK_MINUTES, cuisinesIn, filterRecipes, isEligible } from '../../lib/filters.ts';
import type { BrowseFilters } from '../../lib/filters.ts';
import { t, tp } from '../../i18n/index.ts';
import { cuisineName, dietName, kcal, minutes, num, slotName } from '../../i18n/labels.ts';
import { useAppState } from '../AppState.tsx';
import { useLibrary } from '../library.tsx';
import { recipeRoute, routeHash } from '../router.ts';
import { Icon } from '../components/Icon.tsx';
import { RecipeImage } from '../components/RecipeImage.tsx';
import { DietBadges, FavoriteButton } from '../components/MealCard.tsx';
import { EmptyState } from '../components/controls.tsx';
import { useToast } from '../components/Toast.tsx';
import { AddToDaySheet } from '../sheets/AddToDaySheet.tsx';

interface Filters {
  query: string;
  slot: MealSlot | null;
  diet: Diet | null;
  quick: boolean;
  cuisine: Cuisine | null;
  favoritesOnly: boolean;
}

const NO_FILTERS: Filters = { query: '', slot: null, diet: null, quick: false, cuisine: null, favoritesOnly: false };
// Kept across visits in this session, so going into a recipe and back keeps the search.
let remembered: Filters = NO_FILTERS;

const DIETS: readonly Diet[] = ['pescatarian', 'vegetarian', 'vegan'];

/** A 3.5rem square on phone rows; across the top of a card (up to about 22rem) on wider screens. */
const CARD_SIZES = '(min-width: 600px) 22rem, 3.5rem';

function RecipeCard({ recipe, favorite, fits, onFavorite, onAdd }: { recipe: CatalogRecipe; favorite: boolean; fits: boolean; onFavorite: () => void; onAdd: () => void }) {
  return (
    <article className="recipe-card card" aria-labelledby={`rc-${recipe.id}`}>
      <RecipeImage recipe={recipe} kind="card" sizes={CARD_SIZES} plateSize={84} className="recipe-card-plate" />
      <div className="recipe-card-main">
        <p className="eyebrow">{recipe.slots.map(slotName).join(t('common.sep'))}</p>
        <h2 className="meal-name" id={`rc-${recipe.id}`}>
          <a className="stretched" href={routeHash(recipeRoute(recipe.id))}>
            {recipe.name}
          </a>
        </h2>
        {recipe.nativeName ? <p className="native">{recipe.nativeName}</p> : null}
        <p className="meta">{t('common.dotPair', { a: cuisineName(recipe.cuisine), b: minutes(recipe.totalMinutes) })}</p>
        <p className="figures">
          <span className="figure num">{kcal(recipe.perServing.kcal)}</span>
          <span className="figure num">{t('value.proteinG', { n: num(recipe.perServing.protein) })}</span>
          <span className="figure-note">{t('common.perServing')}</span>
        </p>
        <DietBadges recipe={recipe} quick />
        {!fits ? <p className="outside">{t('badge.outside')}</p> : null}
      </div>
      <div className="recipe-card-actions">
        <button type="button" className="btn btn-quiet btn-sm recipe-card-add" onClick={onAdd} aria-label={t('recipe.addToDayName', { name: recipe.name })}>
          <Icon name="calendarPlus" size={20} />
          <span className="btn-label">{t('recipe.addToDay')}</span>
        </button>
        <FavoriteButton active={favorite} onToggle={onFavorite} name={recipe.name} />
      </div>
    </article>
  );
}

export function RecipesScreen() {
  const { state, dispatch } = useAppState();
  const lib = useLibrary();
  const notify = useToast();
  const [f, setF] = useState<Filters>(remembered);
  const [adding, setAdding] = useState<CatalogRecipe | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  const update = (patch: Partial<Filters>) =>
    setF((prev) => {
      remembered = { ...prev, ...patch };
      return remembered;
    });

  const cuisines = useMemo(() => cuisinesIn(lib.catalog), [lib.catalog]);
  const results = useMemo(() => {
    const browse: BrowseFilters = { query: f.query, slot: f.slot, diet: f.diet, quick: f.quick, cuisine: f.cuisine, favoritesOnly: f.favoritesOnly };
    return filterRecipes(lib.catalog, browse, { ingredientIndex: lib.ingredientIndex, favorites: state.favorites });
  }, [f, lib, state.favorites]);
  const active = f.query !== '' || f.slot !== null || f.diet !== null || f.quick || f.cuisine !== null || f.favoritesOnly;
  const extraFilters = [f.diet !== null, f.cuisine !== null, f.quick, f.favoritesOnly].filter(Boolean).length;
  const fits = (r: CatalogRecipe) => r.slots.some((s) => isEligible(r, state.profile, s));

  const toggleFavorite = (r: CatalogRecipe) => {
    const was = state.favorites.includes(r.id);
    dispatch({ type: 'favorite', id: r.id });
    notify(t(was ? 'common.favoriteRemoved' : 'common.favoriteAdded', { name: r.name }));
  };

  return (
    <>
      <header className="screen-head">
        <h1 tabIndex={-1} className="screen-title">
          {t('recipes.title')}
        </h1>
      </header>
      <div role="search" className="browse-controls">
        <label className="search-field">
          <span className="visually-hidden">{t('recipes.search')}</span>
          <Icon name="search" size={20} />
          <input type="search" value={f.query} placeholder={t('recipes.searchPlaceholder')} onChange={(e) => update({ query: e.currentTarget.value })} enterKeyHint="search" autoComplete="off" />
        </label>
        <fieldset className="filter-row">
          <legend className="visually-hidden">{t('recipes.meal')}</legend>
          {[null, ...MEAL_SLOTS].map((s) => (
            <label key={s ?? 'all'} className="chip chip-radio">
              <input type="radio" name="browse-slot" checked={f.slot === s} onChange={() => update({ slot: s })} />
              <span>{s ? slotName(s) : t('recipes.allMeals')}</span>
            </label>
          ))}
        </fieldset>
        <button type="button" className="btn btn-quiet btn-sm filters-toggle" aria-expanded={filtersOpen} aria-controls={filtersId} onClick={() => setFiltersOpen((o) => !o)}>
          <Icon name="sliders" size={20} />
          {extraFilters ? t('recipes.filtersActive', { n: extraFilters }) : t('recipes.filters')}
          <Icon name="chevronDown" size={20} className="filters-chevron" />
        </button>
        <div id={filtersId} className={`filter-row filters-panel${filtersOpen ? '' : ' is-collapsed'}`}>
          <label className="select-chip">
            <span className="visually-hidden">{t('recipes.diet')}</span>
            <select value={f.diet ?? ''} onChange={(e) => update({ diet: (e.currentTarget.value || null) as Diet | null })}>
              <option value="">{t('recipes.anyDiet')}</option>
              {DIETS.map((d) => (
                <option key={d} value={d}>
                  {dietName(d)}
                </option>
              ))}
            </select>
          </label>
          <label className="select-chip">
            <span className="visually-hidden">{t('recipes.cuisine')}</span>
            <select value={f.cuisine ?? ''} onChange={(e) => update({ cuisine: (e.currentTarget.value || null) as Cuisine | null })}>
              <option value="">{t('recipes.allCuisines')}</option>
              {cuisines.map((c) => (
                <option key={c} value={c}>
                  {cuisineName(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="chip chip-check">
            <input type="checkbox" checked={f.quick} onChange={(e) => update({ quick: e.currentTarget.checked })} />
            <Icon name="clock" size={16} />
            <span>{t('recipes.quick', { n: QUICK_MINUTES })}</span>
          </label>
          <label className="chip chip-check chip-fav">
            <input type="checkbox" checked={f.favoritesOnly} onChange={(e) => update({ favoritesOnly: e.currentTarget.checked })} />
            <Icon name="heart" size={16} />
            <span>{t('recipes.favorites')}</span>
          </label>
        </div>
      </div>
      <div className="results-bar">
        <p className="results-count" aria-live="polite">
          {tp('recipes.count', results.length)}
        </p>
        {active ? (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => update(NO_FILTERS)}>
            {t('recipes.clear')}
          </button>
        ) : null}
      </div>
      {results.length ? (
        <ul className="recipe-grid-list">
          {results.map((r) => (
            <li key={r.id}>
              <RecipeCard recipe={r} favorite={state.favorites.includes(r.id)} fits={fits(r)} onFavorite={() => toggleFavorite(r)} onAdd={() => setAdding(r)} />
            </li>
          ))}
        </ul>
      ) : f.favoritesOnly && state.favorites.length === 0 ? (
        <EmptyState icon="heart" title={t('recipes.noFavorites.title')}>
          <p>{t('recipes.noFavorites.body')}</p>
        </EmptyState>
      ) : (
        <EmptyState icon="search" title={t('recipes.empty.title')} action={<button type="button" className="btn btn-quiet" onClick={() => update(NO_FILTERS)}>{t('recipes.clear')}</button>}>
          <p>{t('recipes.empty.body')}</p>
        </EmptyState>
      )}
      <AddToDaySheet recipe={adding} onClose={() => setAdding(null)} />
    </>
  );
}
