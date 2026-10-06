// The service worker's source, generated at build time by the plugin in vite.config.ts with the list of built
// files and a version derived from their contents. Plain JavaScript in a string (the worker is not bundled).
//
// Strategy:
// - install: precache every built file (the app shell, hashed assets, manifest, icons) into `sufra-<version>`.
//   Content-hashed files under assets/ are copied from an older `sufra-*` cache when it has them (the same name
//   always has the same content), so an update only downloads what changed.
// - activate: delete older `sufra-*` caches, then take control of open pages.
// - navigations: network first, so an online launch gets the fresh index.html (and refreshes the cached copy),
//   but never waits more than NAV_TIMEOUT_MS on a stalled connection: then the cached index.html is served while
//   the request finishes in the background. Offline, the cached index.html. The app routes by hash, so every page
//   of the app is index.html; only a navigation to the app's root or index.html refreshes that copy.
// - recipe photos (images/): not precached (there are hundreds). Cache first from their own cache, IMAGE_CACHE,
//   which survives updates (activate leaves it alone) and holds at most MAX_IMAGES entries, oldest dropped first.
//   Entries are keyed by the photo's content hash (IMAGES), so an update prunes photos that changed or were
//   removed. The page posts PREFETCH_MESSAGE with photo URLs to store ahead of time (see ui/usePhotoPrefetch.ts).
//   Offline and not cached, the request fails and the page draws the recipe's plate instead.
// - everything else in scope: cache first, then network, and cached for next time.
// Cache lookups ignore Vary: some hosts send `Vary: Origin`, and the page's crossorigin script and style requests
// carry an Origin header the worker's own precache requests don't, so an exact match would always miss.

/** A short stable hash (FNV-1a, 32 bit) of text, for the cache version. */
export function fnv1a(text: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Hashes bytes (for images) with the same function. */
export function fnv1aBytes(bytes: Uint8Array, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i] as number;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Folder of the recipe photos, relative to the scope. They are cached on use, not precached. */
export const IMAGE_DIR = 'images/';

/** The persistent photo cache (not versioned: activate keeps it) and its size limit. */
export const IMAGE_CACHE = 'sufra-images';
export const MAX_IMAGES = 300;

/** The message the page posts with photo URLs to store for offline use. Mirrored in ui/photo.ts. */
export const PREFETCH_MESSAGE = 'sufra:prefetch-images';

function cleanPath(f: string): string {
  return f.replace(/\\/g, '/').replace(/^\.?\//, '');
}

/**
 * Precache entries: unique, relative to the worker's scope, 'index.html' first, source maps, the worker and the
 * recipe photos left out.
 */
export function precacheList(files: readonly string[]): string[] {
  const clean = files
    .map(cleanPath)
    .filter((f) => f && !f.endsWith('.map') && f !== 'sw.js' && !f.startsWith(IMAGE_DIR) && !f.split('/').some((part) => part.startsWith('.')));
  const unique = [...new Set(clean)].sort();
  return ['index.html', ...unique.filter((f) => f !== 'index.html')];
}

/** Milliseconds a navigation waits for the network before the cached app shell is served. */
export const NAV_TIMEOUT_MS = 3000;

/** Photo path -> content hash, for the photos under IMAGE_DIR (other files are ignored). */
export function imageVersions(images: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, hash] of Object.entries(images)) {
    const p = cleanPath(path);
    if (p.startsWith(IMAGE_DIR) && !p.split('/').some((part) => part.startsWith('.'))) out[p] = hash;
  }
  return out;
}

export function serviceWorkerSource(
  version: string,
  files: readonly string[],
  offlineText = 'Sufra is offline and has not been saved on this device yet.',
  images: Readonly<Record<string, string>> = {},
): string {
  const list = precacheList(files);
  return `// Sufra service worker. Generated at build time by vite.config.ts; do not edit.
const VERSION = ${JSON.stringify(version)};
const CACHE = 'sufra-' + VERSION;
const PRECACHE = ${JSON.stringify(list)};
const IMAGE_CACHE = ${JSON.stringify(IMAGE_CACHE)};
const MAX_IMAGES = ${MAX_IMAGES};
const PREFETCH_MESSAGE = ${JSON.stringify(PREFETCH_MESSAGE)};
const IMAGES = ${JSON.stringify(imageVersions(images))};
const OFFLINE_TEXT = ${JSON.stringify(offlineText)};
const NAV_TIMEOUT_MS = ${NAV_TIMEOUT_MS};
const MATCH = { ignoreVary: true };
const scope = self.registration.scope;
const INDEX = new URL('index.html', scope).href;
const SHELL_PATHS = [new URL(scope).pathname, new URL(INDEX).pathname];
const IMAGE_ROOT = new URL(${JSON.stringify(IMAGE_DIR)}, scope).href;

/** An app version's own cache (not the photo cache, which outlives versions). */
function isVersionCache(key) {
  return key.startsWith('sufra-') && key !== IMAGE_CACHE;
}

async function precache() {
  const cache = await caches.open(CACHE);
  const older = await Promise.all(
    (await caches.keys()).filter((k) => isVersionCache(k) && k !== CACHE).map((k) => caches.open(k)),
  );
  await Promise.all(
    PRECACHE.map(async (file) => {
      const url = new URL(file, scope).href;
      if (file.startsWith('assets/')) {
        for (const old of older) {
          const hit = await old.match(url, MATCH);
          if (hit) return cache.put(url, hit);
        }
      }
      const response = await fetch(new Request(url, { cache: 'reload' }));
      if (!response.ok) throw new Error('Precache failed for ' + file + ': ' + response.status);
      return cache.put(url, response);
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => isVersionCache(k) && k !== CACHE).map((k) => caches.delete(k))))
      .then(pruneImages)
      .then(() => self.clients.claim()),
  );
});

function isShell(url) {
  return SHELL_PATHS.includes(new URL(url).pathname);
}

function offline() {
  return new Response(OFFLINE_TEXT, { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

async function cachedShell() {
  const cache = await caches.open(CACHE);
  return (await cache.match(INDEX, MATCH)) || (await caches.match(INDEX, MATCH));
}

function fromNetworkFirst(event) {
  const request = event.request;
  const shell = isShell(request.url);
  const network = fetch(request).then(async (response) => {
    const html = (response.headers.get('Content-Type') || '').includes('text/html');
    if (shell && html && response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE);
      await cache.put(INDEX, response.clone());
    }
    return response;
  });
  // The fetch (and the cache refresh) finishes even when the cached copy is served first.
  event.waitUntil(network.catch(() => undefined));
  const fallback = async () => (shell ? await cachedShell() : await caches.match(request, MATCH));
  return new Promise((resolve) => {
    let settled = false;
    const settle = (response) => {
      if (settled || !response) return;
      settled = true;
      clearTimeout(timer);
      resolve(response);
    };
    const timer = setTimeout(() => fallback().then(settle), NAV_TIMEOUT_MS);
    network.then(settle, async () => settle((await fallback()) || offline()));
  });
}

async function fromCacheFirst(request) {
  const cached = await caches.match(request, MATCH);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

// Recipe photos -------------------------------------------------------------------------------------------------

/** The photo cache's key for a photo URL (its content hash as the query), or null when it isn't a photo. */
function imageKey(href) {
  const url = new URL(href);
  if (url.origin !== self.location.origin || !url.href.startsWith(IMAGE_ROOT)) return null;
  const clean = url.origin + url.pathname;
  const hash = IMAGES[clean.slice(new URL(scope).href.length)];
  return hash ? clean + '?v=' + hash : clean;
}

/** Drops photos this version no longer has, or has with different content (their hash changed). */
async function pruneImages() {
  if (!(await caches.keys()).includes(IMAGE_CACHE)) return;
  const cache = await caches.open(IMAGE_CACHE);
  const stale = (await cache.keys()).filter((req) => imageKey(new URL(req.url).origin + new URL(req.url).pathname) !== req.url);
  await Promise.all(stale.map((req) => cache.delete(req)));
}

/** Keeps the photo cache at MAX_IMAGES entries, dropping the oldest. */
async function trimImages(cache) {
  const keys = await cache.keys();
  const extra = keys.length - MAX_IMAGES;
  if (extra > 0) await Promise.all(keys.slice(0, extra).map((req) => cache.delete(req)));
}

/** Fetches a photo; resolves with the response as soon as it arrives, and \`saved\` once it is in the cache. */
async function storeImage(cache, request, key) {
  const response = await fetch(request);
  const saved = response.ok && response.type === 'basic' ? cache.put(key, response.clone()).then(() => trimImages(cache)) : Promise.resolve();
  return { response, saved };
}

async function fromImageCache(event, key) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(key, MATCH);
  if (cached) return cached;
  try {
    const { response, saved } = await storeImage(cache, event.request, key);
    event.waitUntil(saved.catch(() => undefined));
    return response;
  } catch {
    // Offline and not cached: a network error, so the page's <img> errors and draws the plate instead.
    return Response.error();
  }
}

/** Stores the photos the page asks for (already cached ones are skipped), two at a time. */
async function prefetchImages(urls) {
  const cache = await caches.open(IMAGE_CACHE);
  const queue = [];
  for (const href of urls) {
    if (typeof href !== 'string') continue;
    const key = imageKey(href);
    if (key && !queue.some((q) => q.key === key) && !(await cache.match(key, MATCH))) queue.push({ href, key });
  }
  const work = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      try {
        await (await storeImage(cache, new Request(next.href), next.key)).saved;
      } catch {
        return; // Offline again: stop; the page asks again when it's back.
      }
    }
  };
  await Promise.all([work(), work()]);
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== PREFETCH_MESSAGE || !Array.isArray(data.urls)) return;
  event.waitUntil(prefetchImages(data.urls.slice(0, MAX_IMAGES)));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fromNetworkFirst(event));
    return;
  }
  const photo = imageKey(request.url);
  if (photo) {
    event.respondWith(fromImageCache(event, photo));
    return;
  }
  event.respondWith(fromCacheFirst(request));
});
`;
}
