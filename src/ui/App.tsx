import { Component, useEffect, useRef } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { t } from '../i18n/index.ts';
import type { MessageKey } from '../i18n/index.ts';
import { AppStateProvider, useAppState } from './AppState.tsx';
import { PlanProvider } from './plan.tsx';
import { useLibrary } from './library.tsx';
import { num } from '../i18n/labels.ts';
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
import { ProgressScreen } from './screens/Progress.tsx';
import { usePhotoPrefetch } from './usePhotoPrefetch.ts';
import { Onboarding } from './screens/Onboarding.tsx';

interface NavItem {
  name: TabName;
  icon: IconName;
  label: MessageKey;
}

/** Phone tab bar: the five everyday screens. Settings opens from Today's header, search from the round button. */
const TABS: readonly NavItem[] = [
  { name: 'today', icon: 'sun', label: 'nav.today' },
  { name: 'week', icon: 'calendar', label: 'nav.week' },
  { name: 'progress', icon: 'chartLine', label: 'nav.progress' },
  { name: 'recipes', icon: 'bookOpen', label: 'nav.recipes' },
  { name: 'shopping', icon: 'basket', label: 'nav.shop' },
];

/** Wide-screen sidebar: every screen, Settings included. */
const SIDEBAR: readonly NavItem[] = [
  { name: 'today', icon: 'sun', label: 'nav.today' },
  { name: 'week', icon: 'calendar', label: 'nav.week' },
  { name: 'progress', icon: 'chartLine', label: 'nav.progress' },
  { name: 'shopping', icon: 'basket', label: 'nav.shopping' },
  { name: 'recipes', icon: 'bookOpen', label: 'nav.recipes' },
  { name: 'settings', icon: 'sliders', label: 'nav.settings' },
];

const tabHref = (name: TabName) => routeHash(name === 'today' || name === 'week' ? { name, date: null } : ({ name } as Route));

/** A floating glass capsule of tabs and a round search button, over the bottom of phone screens. */
function TabBar({ active, hidden }: { active: TabName; hidden: boolean }) {
  return (
    <nav className={`tabbar${hidden ? ' is-hidden' : ''}`} aria-label={t('nav.label')}>
      <ul className="tabbar-tabs glass">
        {TABS.map((tab) => (
          <li key={tab.name}>
            <a className="tab" href={tabHref(tab.name)} aria-current={active === tab.name ? 'page' : undefined}>
              <Icon name={tab.icon} size={20} />
              <span className="tab-label">{t(tab.label)}</span>
            </a>
          </li>
        ))}
      </ul>
      <a className="tabbar-search glass" href={routeHash({ name: 'recipes', search: true })} aria-label={t('nav.search')}>
        <Icon name="search" size={22} />
      </a>
    </nav>
  );
}

/** The floating glass sidebar on wide screens: brand, every screen, and the daily target. */
function Sidebar({ active }: { active: TabName }) {
  const { state } = useAppState();
  return (
    <nav className="sidebar glass" aria-label={t('nav.label')}>
      <a className="sidebar-brand" href="#/today">
        <Mark size={34} />
        <span className="sidebar-brand-text">
          <span className="sidebar-brand-name">{t('app.name')}</span>
          <span className="sidebar-brand-native" lang="ar" dir="rtl">
            {t('app.nativeName')}
          </span>
        </span>
      </a>
      <ul className="sidebar-list">
        {SIDEBAR.map((item) => (
          <li key={item.name}>
            <a className="sidebar-link" href={tabHref(item.name)} aria-current={active === item.name ? 'page' : undefined}>
              <Icon name={item.icon} size={19} />
              <span>{t(item.label)}</span>
            </a>
          </li>
        ))}
      </ul>
      <a className="sidebar-target" href="#/settings">
        <span className="sidebar-target-label">{t('nav.dailyTarget')}</span>
        <span className="sidebar-target-value num">{t('nav.dailyTargetValue', { kcal: num(state.profile.kcalTarget), protein: num(state.profile.proteinTarget) })}</span>
      </a>
    </nav>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'today':
      return <TodayScreen date={route.date} />;
    case 'week':
      return <WeekScreen date={route.date} />;
    case 'progress':
      return <ProgressScreen />;
    case 'shopping':
      return <ShoppingScreen />;
    case 'recipes':
      return <RecipesScreen search={route.search === true} />;
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
      case 'progress':
        return t('nav.progress');
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
  // Phones hide the tab bar where the screen brings its own bottom bar or back button (recipe, Settings).
  const tabBarHidden = route.name === 'recipe' || route.name === 'settings' || route.name === 'credits';
  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => {
        e.preventDefault();
        document.getElementById('main')?.focus();
      }}>
        {t('app.skipToContent')}
      </a>
      <Sidebar active={tabOf(route)} />
      <main id="main" className={`main main-${route.name}${tabBarHidden ? '' : ' has-tabbar'}`} tabIndex={-1}>
        <Screen route={route} />
      </main>
      <TabBar active={tabOf(route)} hidden={tabBarHidden} />
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
        <button type="button" className="btn btn-accent" onClick={() => window.location.reload()}>
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
