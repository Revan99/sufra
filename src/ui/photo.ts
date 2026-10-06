// Recipe photos: URLs under the app's base, the img srcset, which photos to fetch ahead for offline use, and a small
// store of photos that failed to load (offline and not cached), so every place that shows one falls back to the
// plate and doesn't retry until the device is back online.
import { useSyncExternalStore } from 'react';
import type { CatalogRecipe, DayPlan, RecipePhoto } from '../types.ts';

/** Width descriptor of the thumbnail (the library's thumbnails are at most 400 px wide). */
export const THUMB_WIDTH = 400;

/** The message the page posts to the service worker with photo URLs to cache for offline use. */
export const PREFETCH_MESSAGE = 'sufra:prefetch-images';

const BASE: string = import.meta.env?.BASE_URL ?? './';

/** A photo path ('images/x.webp') under the app's base ('./images/x.webp' in a build, '/images/x.webp' in dev). */
export function photoUrl(path: string, base = BASE): string {
  if (/^([a-z][a-z0-9+.-]*:|\/)/i.test(path)) return path;
  const b = base === '' ? './' : base.endsWith('/') ? base : `${base}/`;
  return `${b}${path.replace(/^\.\//, '')}`;
}

export interface PhotoSources {
  src: string;
  thumb: string;
  srcSet: string;
  width: number;
  height: number;
  /** CSS object-position that keeps the food in frame when the photo is cropped. */
  objectPosition: string;
}

/** What an <img> needs for a photo: the large file as src, both files in srcset (thumbnail first). */
export function photoSources(photo: RecipePhoto, base = BASE): PhotoSources {
  const src = photoUrl(photo.src, base);
  const thumb = photoUrl(photo.thumb, base);
  const thumbWidth = Math.min(THUMB_WIDTH, photo.width);
  // A photo no wider than a thumbnail has one useful size (two equal descriptors would make the srcset invalid).
  const srcSet = photo.width > thumbWidth ? `${thumb} ${thumbWidth}w, ${src} ${photo.width}w` : `${src} ${photo.width}w`;
  const [x, y] = photo.focus;
  return { src, thumb, srcSet, width: photo.width, height: photo.height, objectPosition: `${clampPct(x)}% ${clampPct(y)}%` };
}

function clampPct(v: number): number {
  return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 50;
}

/** Identifies one way of showing a photo (the browser picks the file by `sizes`, so a failure is per use). */
export function photoKey(photo: RecipePhoto, sizes: string): string {
  return `${photo.src}|${sizes}`;
}

/**
 * Photo paths worth having offline, most useful first and without repeats: the thumbnail and large photo of each of
 * `focus` days' meals (today, and the day on screen), then the thumbnails of the week's meals.
 */
export function prefetchPaths(focus: readonly DayPlan[], week: readonly DayPlan[], byId: ReadonlyMap<string, CatalogRecipe>): string[] {
  const out = new Set<string>();
  const photoOf = (id: string) => byId.get(id)?.photo;
  for (const day of focus) {
    for (const m of day.meals) {
      const p = photoOf(m.recipeId);
      if (p) out.add(p.thumb).add(p.src);
    }
  }
  for (const day of week) {
    for (const m of day.meals) {
      const p = photoOf(m.recipeId);
      if (p) out.add(p.thumb);
    }
  }
  return [...out];
}

// ---------------------------------------------------------------------------------------------------------------
// Photos that failed to load. Cleared when the device comes back online, so they get another try.

const failed = new Set<string>();
const listeners = new Set<() => void>();
let watchingOnline = false;

function emit(): void {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  if (!watchingOnline && typeof window !== 'undefined') {
    watchingOnline = true;
    window.addEventListener('online', () => {
      if (!failed.size) return;
      failed.clear();
      emit();
    });
  }
  return () => listeners.delete(fn);
}

export function markPhotoFailed(key: string): void {
  if (failed.has(key)) return;
  failed.add(key);
  emit();
}

/** Whether the photo shown this way failed to load (then the plate is drawn instead). */
export function usePhotoFailed(key: string | null): boolean {
  return useSyncExternalStore(
    subscribe,
    () => key !== null && failed.has(key),
    () => false,
  );
}

/** For tests. */
export function resetPhotoFailures(): void {
  failed.clear();
  emit();
}
