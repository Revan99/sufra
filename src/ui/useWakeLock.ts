// Keeps the screen awake while `enabled` (Screen Wake Lock API, when the browser has it). The lock is released by
// the browser when the page is hidden, so it is requested again when the page comes back.
import { useEffect } from 'react';

export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

export function useWakeLock(enabled: boolean): { supported: boolean } {
  const supported = wakeLockSupported();

  useEffect(() => {
    if (!supported || !enabled) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const s = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void s.release();
          return;
        }
        sentinel = s;
      } catch {
        // Refused (battery saver, no user activation): the screen just sleeps as usual.
      }
    };
    void request();
    const onVisible = () => void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (sentinel && !sentinel.released) void sentinel.release().catch(() => {});
    };
  }, [supported, enabled]);

  return { supported };
}
