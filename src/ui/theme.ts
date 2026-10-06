// Applies the theme choice: data-theme on <html> for a manual light or dark choice (system follows
// prefers-color-scheme in CSS), and a matching browser UI colour.
import { useEffect } from 'react';
import type { ThemeChoice } from '../lib/storage.ts';

/** Page background per theme; keep in sync with --bg in src/styles/tokens.css. */
export const THEME_COLORS = { light: '#FBF6EE', dark: '#1A1511' } as const;

export function applyTheme(choice: ThemeChoice, root: HTMLElement = document.documentElement): void {
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
  const dark = choice === 'dark' || (choice === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
  }
  meta.content = dark ? THEME_COLORS.dark : THEME_COLORS.light;
}

export function useThemeEffect(choice: ThemeChoice): void {
  useEffect(() => {
    applyTheme(choice);
    if (choice !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [choice]);
}
