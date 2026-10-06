import { useMemo } from 'react';
import { intlLocale, t, tp } from '../../i18n/index.ts';
import { useLibrary } from '../library.tsx';
import { goBack, recipeRoute, routeHash } from '../router.ts';
import { Icon } from '../components/Icon.tsx';
import { EmptyState } from '../components/controls.tsx';
import { PhotoCreditText, RecipeImage } from '../components/RecipeImage.tsx';

/** Every recipe photo with its full credit, sorted by recipe name (linked from Settings › About). */
export function CreditsScreen() {
  const lib = useLibrary();
  const withPhotos = useMemo(() => {
    const collator = new Intl.Collator(intlLocale());
    return lib.catalog.filter((r) => r.photo).sort((a, b) => collator.compare(a.name, b.name));
  }, [lib.catalog]);

  return (
    <>
      <header className="screen-head">
        <button type="button" className="btn btn-quiet back-btn" onClick={() => goBack({ name: 'settings' })}>
          <Icon name="arrowLeft" size={20} className="flip-rtl" />
          {t('credits.back')}
        </button>
      </header>
      <h1 tabIndex={-1} className="screen-title credits-title">
        {t('credits.title')}
      </h1>
      <p className="credits-intro">{t('credits.intro')}</p>
      {withPhotos.length ? (
        <>
          <p className="results-count credits-count">{tp('credits.count', withPhotos.length)}</p>
          <ul className="credit-list">
            {withPhotos.map((r) =>
              r.photo ? (
                <li key={r.id} className="credit-item card">
                  <RecipeImage recipe={r} kind="credit" sizes="4.5rem" plateSize={72} />
                  <div className="credit-text">
                    <h2 className="credit-recipe">
                      <a href={routeHash(recipeRoute(r.id))}>{r.name}</a>
                    </h2>
                    <p className="photo-credit">
                      <PhotoCreditText credit={r.photo.credit} />
                    </p>
                  </div>
                </li>
              ) : null,
            )}
          </ul>
        </>
      ) : (
        <EmptyState icon="book" title={t('credits.empty.title')}>
          <p>{t('credits.empty.body')}</p>
        </EmptyState>
      )}
    </>
  );
}
