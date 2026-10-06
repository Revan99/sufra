import { Component, useEffect, useRef } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { t } from '../i18n/index.ts';
import type { MessageKey } from '../i18n/index.ts';
import { AppStateProvider, useAppState } from './AppState.tsx';
import { PlanProvider } from './plan.tsx';
import { useLibrary } from './library.tsx';
import { navigationKind, routeHash, savedScroll, tabOf, useRoute } from './router.ts';
import { longDate } from '../i18n/labels.ts';
import type { Route, TabName } from './router.ts';
import { useThemeEffect } from './theme.ts';
import { Icon } from './components/Icon.tsx';
import type { IconName } from './components/Icon.tsx';
import { Mark } from './components/Mark.tsx';
import { ToastProvider } from './components/Toast.tsx';
import { TodayScreen } from './screens/Today.tsx';
import { RecipeScreen } from './screens/Recipe.tsx';
import { WeekScreen } from './screens/Week.tsx';
import { ShoppingScreen } from './screens/Shopping.tsx';
import { RecipesScreen } from './screens/Recipes.tsx';
import { SettingsScreen } from './screens/Settings.tsx';
import { CreditsScreen } from './screens/Credits.tsx';
import { usePhotoPrefetch } from './usePhotoPrefetch.ts';
import { Onboarding } from './screens/Onboarding.tsx';

const TABS: readonly { name: TabName; icon: IconName; label: MessageKey }[] = [
  { name: 'today', icon: 'today', label: 'nav.today' },
  { name: 'week', icon: 'week', label: 'nav.week' },
  { name: 'shopping', icon: 'basket', label: 'nav.shopping' },
  { name: 'recipes', icon: 'book', label: 'nav.recipes' },
  { name: 'settings', icon: 'sliders', label: 'nav.settings' },
];

function NavBar({ active }: { active: TabName }) {
  return (
    <nav className="nav" aria-label={t('nav.label')}>
      <div className="nav-inner">
        <a className="nav-brand" href="#/today">
          <Mark size={36} />
          <span className="nav-brand-name">{t('app.name')}</span>
        </a>
        <ul className="nav-list">
          {TABS.map((tab) => (
            <li key={tab.name}>
              <a className="nav-link" href={routeHash({ name: tab.name, date: null } as Route)} aria-current={active === tab.name ? 'page' : undefined}>
                <Icon name={tab.icon} />
                <span className="nav-label">{t(tab.label)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'today':
      return <TodayScreen date={route.date} />;
    case 'week':
      return <WeekScreen date={route.date} />;
    case 'shopping':
      return <ShoppingScreen />;
    case 'recipes':
      return <RecipesScreen />;
    case 'recipe':
      return <RecipeScreen id={route.id} date={route.date} slot={route.slot} index={route.index} />;
    case 'settings':
      return <SettingsScreen />;
    case 'credits':
      return <CreditsScreen />;
  }
}

/**
 * When the screen (not just its date) changes, moves focus to the new screen's heading, and scrolls to the top for
 * a new screen or back to where the user was when they return with Back (or Forward).
 */
function useScreenFocus(route: Route) {
  const key = route.name === 'recipe' ? `recipe/${route.id}` : route.name;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const y = navigationKind() === 'traverse' ? savedScroll() : null;
    window.scrollTo({ top: y ?? 0 });
    const h1 = document.querySelector<HTMLElement>('main h1');
    h1?.focus({ preventScroll: true });
  }, [key]);
}

/** The document title for a route: "Shopping · Sufra", the recipe's name, or the day. */
function screenTitle(route: Route, recipeName: (id: string) => string | undefined): string {
  const screen = (() => {
    switch (route.name) {
      case 'today':
        return route.date ? longDate(route.date) : t('nav.today');
      case 'week':
        return t('nav.week');
      case 'shopping':
        return t('nav.shopping');
      case 'recipes':
        return t('nav.recipes');
      case 'recipe':
        return recipeName(route.id) ?? t('recipe.notFound.title');
      case 'settings':
        return t('nav.settings');
      case 'credits':
        return t('credits.title');
    }
  })();
  return t('app.titleScreen', { screen });
}

function Shell() {
  const { state } = useAppState();
  const lib = useLibrary();
  const route = useRoute();
  useThemeEffect(state.theme);
  useScreenFocus(route);
  usePhotoPrefetch(state.onboarded);
  const title = state.onboarded ? screenTitle(route, (id) => lib.byId.get(id)?.name) : t('app.name');
  useEffect(() => {
    document.title = title;
  }, [title]);

  if (!state.onboarded) return <Onboarding />;
  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => {
        e.preventDefault();
        document.getElementById('main')?.focus();
      }}>
        {t('app.skipToContent')}
      </a>
      <NavBar active={tabOf(route)} />
      <main id="main" className={`main main-${route.name}`} tabIndex={-1}>
        <Screen route={route} />
      </main>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Sufra crashed', error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="crash" id="main">
        <h1>{t('app.error.title')}</h1>
        <p>{t('app.error.body')}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {t('app.error.reload')}
        </button>
      </main>
    );
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <AppStateProvider>
        <ToastProvider>
          <PlanProvider>
            <Shell />
          </PlanProvider>
        </ToastProvider>
      </AppStateProvider>
    </ErrorBoundary>
  );
}
