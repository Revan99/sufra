// A CSS media query as React state, for screens whose phone and wide layouts differ in structure (not just style).
import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia?.(query);
      mq?.addEventListener('change', onChange);
      return () => mq?.removeEventListener('change', onChange);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}

/** Wide screens: the sidebar layout (keep in sync with styles/shell.css). */
export const WIDE_QUERY = '(min-width: 1000px)';
