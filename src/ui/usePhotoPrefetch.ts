// Keeps the photos the user is about to need on the device: once the app is idle and online (and the user hasn't
// asked to save data), it hands the service worker the thumbnails of the planning week's meals and the large photos
// of today's, which it stores in its image cache (see pwa/sw-template.ts). Without a service worker (dev) it does
// nothing.
import { useEffect } from 'react';
import { useAppState } from './AppState.tsx';
import { useLibrary } from './library.tsx';
import { usePlan } from './plan.tsx';
import { planningWeek } from './planHelpers.ts';
import { PREFETCH_MESSAGE, photoUrl, prefetchPaths } from './photo.ts';

interface NetworkInformationLike {
  saveData?: boolean;
}

/** Whether now is a good time to download extra images. */
function mayPrefetch(): boolean {
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  return navigator.onLine && !connection?.saveData;
}

/** Runs `fn` when the browser is idle (or after a short delay where requestIdleCallback is missing). */
function whenIdle(fn: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: 8000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 2500);
  return () => window.clearTimeout(id);
}

// What was last handed over, so a re-render with the same plan doesn't send it again.
let lastSent = '';

export function usePhotoPrefetch(enabled: boolean): void {
  const { state } = useAppState();
  const lib = useLibrary();
  const plan = usePlan();
  const weekStart = state.profile.weekStart;

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;
    let cancelIdle: (() => void) | null = null;

    const send = () => {
      const worker = sw.controller;
      if (!worker || !mayPrefetch()) return;
      const today = plan.day(plan.today);
      const week = planningWeek(plan.today, weekStart).map((d) => plan.day(d));
      const urls = prefetchPaths([today], week, lib.byId).map((p) => new URL(photoUrl(p), document.baseURI).href);
      const key = urls.join('\n');
      if (!urls.length || key === lastSent) return;
      lastSent = key;
      worker.postMessage({ type: PREFETCH_MESSAGE, urls });
    };
    const schedule = () => {
      cancelIdle?.();
      cancelIdle = whenIdle(send);
    };
    const retry = () => {
      // Back online or newly controlled: whatever was sent before may not have been stored.
      lastSent = '';
      schedule();
    };

    schedule();
    window.addEventListener('online', retry);
    sw.addEventListener('controllerchange', retry);
    return () => {
      cancelIdle?.();
      window.removeEventListener('online', retry);
      sw.removeEventListener('controllerchange', retry);
    };
  }, [enabled, plan, lib, weekStart]);
}
