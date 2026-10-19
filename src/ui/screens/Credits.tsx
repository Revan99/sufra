import { useMemo } from 'react';
import type { CatalogRecipe } from '../../types.ts';
import { intlLocale, t, tp } from '../../i18n/index.ts';
import { useLibrary } from '../library.tsx';
import { goBack, recipeRoute, routeHash } from '../router.ts';
import { Icon } from '../components/Icon.tsx';
import { EmptyState } from '../components/controls.tsx';
import { PageHead } from '../components/PageHead.tsx';
import { PhotoCreditText, RecipeImage } from '../components/RecipeImage.tsx';

/** Every recipe photo with its full credit, sorted by recipe name and grouped by first letter (Settings › About). */
export function CreditsScreen() {
  const lib = useLibrary();
  const groups = useMemo(() => {
    const locale = intlLocale();
    const collator = new Intl.Collator(locale);
    const sorted = lib.catalog.filter((r) => r.photo).sort((a, b) => collator.compare(a.name, b.name));
    const out: { letter: string; recipes: CatalogRecipe[] }[] = [];
    for (const r of sorted) {
      const letter = (Array.from(r.name)[0] ?? '#').toLocaleUpperCase(locale);
      const last = out[out.length - 1];
      if (last && last.letter === letter) last.recipes.push(r);
      else out.push({ letter, recipes: [r] });
    }
    return out;
  }, [lib.catalog]);
  const count = groups.reduce((n, g) => n + g.recipes.length, 0);

  return (
    <div className="settings credits">
      <div className="set-topbar">
        <button type="button" className="icon-btn glass set-back" onClick={() => goBack({ name: 'settings' })} aria-label={t('credits.backLabel')}>
          <Icon name="chevronLeft" size={22} className="flip-rtl" />
        </button>
      </div>
      <PageHead sub={count ? <span className="num">{tp('credits.count', count)}</span> : undefined} title={t('credits.title')} className="set-head" />
      <p className="credits-intro">{t('credits.intro')}</p>
      {count ? (
        <div className="set-groups">
          {groups.map((g, i) => (
            <section key={g.letter} className="set-group" aria-labelledby={`credits-${i}`}>
              <h2 id={`credits-${i}`} className="set-label">
                {g.letter}
              </h2>
              <ul className="set-card credit-list">
                {g.recipes.map((r) =>
                  r.photo ? (
                    <li key={r.id} className="credit-row">
                      <RecipeImage recipe={r} kind="credit" sizes="3.5rem" plateSize={56} className="credit-thumb" />
                      <div className="credit-text">
                        <h3 className="credit-recipe">
                          <a href={routeHash(recipeRoute(r.id))}>{r.name}</a>
                        </h3>
                        <p className="credit-by">
                          <PhotoCreditText credit={r.photo.credit} />
                        </p>
                      </div>
                    </li>
                  ) : null,
                )}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState icon="book" title={t('credits.empty.title')}>
          <p>{t('credits.empty.body')}</p>
        </EmptyState>
      )}
    </div>
  );
}
