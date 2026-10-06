import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App.tsx';
import { trackHistoryDepth } from './ui/router.ts';
import { currentLocale, t } from './i18n/index.ts';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/overlays.css';
import './styles/screens.css';
import './styles/recipe.css';
import './styles/pages.css';
import './styles/photos.css';

const locale = currentLocale();
document.documentElement.lang = locale.lang;
document.documentElement.dir = locale.dir;
document.title = t('app.name');
trackHistoryDepth();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// The service worker only exists in production builds (vite.config.ts emits sw.js).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const register = () => {
    navigator.serviceWorker.register('./sw.js').catch((err: unknown) => console.warn('Service worker registration failed', err));
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
