import { describe, expect, it } from 'vitest';
import { IMAGE_CACHE, MAX_IMAGES, PREFETCH_MESSAGE, fnv1a, fnv1aBytes, imageVersions, precacheList, serviceWorkerSource } from './sw-template.ts';
import { PREFETCH_MESSAGE as PAGE_PREFETCH_MESSAGE } from '../photo.ts';

describe('precacheList', () => {
  it('puts index.html first, dedupes, and drops maps, the worker and dotfiles', () => {
    expect(precacheList(['assets/b.js', './assets/a.css', 'index.html', 'assets/b.js.map', 'sw.js', '.DS_Store', 'icons/.keep', 'icons/icon-192.png', 'assets/b.js'])).toEqual([
      'index.html',
      'assets/a.css',
      'assets/b.js',
      'icons/icon-192.png',
    ]);
  });

  it('always includes index.html', () => {
    expect(precacheList([])).toEqual(['index.html']);
  });

  it('leaves the recipe photos out (they are cached as they are used)', () => {
    expect(precacheList(['images/dolma.webp', 'images/dolma-thumb.webp', 'icons/icon-192.png'])).toEqual(['index.html', 'icons/icon-192.png']);
  });
});

describe('imageVersions', () => {
  it('keeps only photos under images/', () => {
    expect(imageVersions({ './images/a.webp': 'h1', 'icons/i.png': 'h2', 'images/.DS_Store': 'h3' })).toEqual({ 'images/a.webp': 'h1' });
  });
});

// ---------------------------------------------------------------------------------------------------------------
// A tiny fake of the worker globals, enough to run the generated source: caches that honour Vary: Origin the way
// browsers do (unless ignoreVary is passed), a scripted fetch, and captured event listeners.

const SCOPE = 'https://sufra.test/app/';

interface Stored {
  response: Response;
  origin: string | null;
}

class FakeCache {
  entries = new Map<string, Stored>();
  async match(req: Request | string, opts?: { ignoreVary?: boolean }): Promise<Response | undefined> {
    const r = typeof req === 'string' ? new Request(req) : req;
    const hit = this.entries.get(r.url);
    if (!hit) return undefined;
    const varyOrigin = /\borigin\b/i.test(hit.response.headers.get('Vary') ?? '');
    if (varyOrigin && !opts?.ignoreVary && hit.origin !== r.headers.get('Origin')) return undefined;
    return hit.response.clone();
  }
  async put(req: Request | string, response: Response): Promise<void> {
    const r = typeof req === 'string' ? new Request(req) : req;
    this.entries.set(r.url, { response: new Response(await response.clone().arrayBuffer(), response), origin: r.headers.get('Origin') });
  }
  async keys(): Promise<Request[]> {
    return [...this.entries.keys()].map((url) => new Request(url));
  }
  async delete(req: Request | string): Promise<boolean> {
    return this.entries.delete(typeof req === 'string' ? req : req.url);
  }
}

class FakeCaches {
  stores = new Map<string, FakeCache>();
  async open(name: string) {
    let c = this.stores.get(name);
    if (!c) this.stores.set(name, (c = new FakeCache()));
    return c;
  }
  async keys() {
    return [...this.stores.keys()];
  }
  async delete(name: string) {
    return this.stores.delete(name);
  }
  async match(req: Request | string, opts?: { ignoreVary?: boolean }) {
    for (const c of this.stores.values()) {
      const hit = await c.match(req, opts);
      if (hit) return hit;
    }
    return undefined;
  }
}

type Handler = (event: Record<string, unknown>) => void;

function html(body: string): Response {
  return new Response(body, { headers: { 'Content-Type': 'text/html', Vary: 'Origin' } });
}

/** A same-origin network response (Node's Response type is 'default'; a browser's same-origin fetch is 'basic'). */
function basic(body: string, type = 'image/webp'): Response {
  const res = new Response(body, { headers: { 'Content-Type': type } });
  Object.defineProperty(res, 'type', { value: 'basic' });
  return res;
}

function worker(files: string[], fetchImpl: (req: Request) => Promise<Response>, version = 'v2', images: Record<string, string> = {}) {
  const handlers = new Map<string, Handler>();
  const caches = new FakeCaches();
  const fetched: string[] = [];
  const self = {
    registration: { scope: SCOPE },
    location: { origin: new URL(SCOPE).origin },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (type: string, fn: Handler) => handlers.set(type, fn),
  };
  const fetchSpy = (req: Request | string) => {
    const r = typeof req === 'string' ? new Request(req) : req;
    fetched.push(r.url);
    return fetchImpl(r);
  };
  const quick = (fn: () => void) => globalThis.setTimeout(fn, 20);
  const src = serviceWorkerSource(version, files, undefined, images);
  new Function('self', 'caches', 'fetch', 'setTimeout', src)(self, caches, fetchSpy, quick);

  /** Dispatches an event; resolves with its response, after its waitUntil work unless `background` is set. */
  const run = async (type: string, extra: Record<string, unknown> = {}, background = false) => {
    const waits: Promise<unknown>[] = [];
    let responded: Promise<Response> | undefined;
    handlers.get(type)?.({ ...extra, waitUntil: (p: Promise<unknown>) => waits.push(p), respondWith: (p: Promise<Response>) => (responded = p) });
    const response = responded ? await responded : undefined;
    if (!background) await Promise.all(waits);
    return response;
  };
  const request = (path: string, init: RequestInit & { navigate?: boolean } = {}) => {
    const req = new Request(new URL(path, SCOPE).href, init);
    if (init.navigate) Object.defineProperty(req, 'mode', { value: 'navigate' });
    return req;
  };
  return { caches, fetched, run, request, src };
}

describe('serviceWorkerSource', () => {
  it('is valid JavaScript that embeds the version and the precache list', () => {
    const src = serviceWorkerSource('v1', ['assets/app-123.js', 'manifest.webmanifest'], 'Offline!');
    expect(() => new Function(src)).not.toThrow();
    expect(src).toContain(`const VERSION = "v1";`);
    expect(src).toContain('"index.html","assets/app-123.js","manifest.webmanifest"');
    expect(src).toContain('"Offline!"');
  });

  it('serves precached files to crossorigin requests when the host sends Vary: Origin (first offline visit)', async () => {
    const w = worker(['assets/app-1.js'], async (req) => (req.url.endsWith('.js') ? new Response('js', { headers: { Vary: 'Origin' } }) : html('<html>')));
    await w.run('install');
    // The page's <script type=module crossorigin> sends an Origin header; the precache request did not.
    const res = await w.run('fetch', { request: w.request('assets/app-1.js', { headers: { Origin: 'https://sufra.test' } }) });
    expect(await res?.text()).toBe('js');
    expect(w.fetched.filter((u) => u.endsWith('.js'))).toHaveLength(1);
  });

  it('serves the cached app shell when a navigation stalls, and when offline', async () => {
    let online = true;
    const w = worker([], (req) => {
      if (!online) return Promise.reject(new TypeError('offline'));
      return req.url === SCOPE ? new Promise<Response>(() => {}) : Promise.resolve(html('<shell>'));
    });
    await w.run('install');
    const stalled = await w.run('fetch', { request: w.request('', { navigate: true }) }, true);
    expect(await stalled?.text()).toBe('<shell>');
    online = false;
    const offline = await w.run('fetch', { request: w.request('', { navigate: true }) });
    expect(await offline?.text()).toBe('<shell>');
  });

  it('refreshes the cached shell only from the app’s own page, not from any in-scope navigation', async () => {
    const w = worker(['icons/icon.png'], async (req) =>
      req.url.endsWith('.png') ? new Response('png', { headers: { 'Content-Type': 'image/png' } }) : html(req.url.endsWith('?v=2') ? '<new>' : '<old>'),
    );
    await w.run('install');
    await w.run('fetch', { request: w.request('icons/icon.png', { navigate: true }) });
    const shell = await (await w.caches.open('sufra-v2')).match(`${SCOPE}index.html`);
    expect(await shell?.text()).toBe('<old>');
  });

  it('copies unchanged hashed assets from the previous version’s cache instead of downloading them', async () => {
    const w = worker(['assets/app-1.js', 'assets/data-9.js'], async (req) => new Response(`fresh ${new URL(req.url).pathname}`), 'v3');
    const old = await w.caches.open('sufra-v2');
    await old.put(`${SCOPE}assets/data-9.js`, new Response('kept'));
    await w.run('install');
    expect(w.fetched.map((u) => new URL(u).pathname).sort()).toEqual(['/app/assets/app-1.js', '/app/index.html']);
    const now = await w.caches.open('sufra-v3');
    expect(await (await now.match(`${SCOPE}assets/data-9.js`))?.text()).toBe('kept');
    await w.run('activate');
    expect(await w.caches.keys()).toEqual(['sufra-v3']);
  });
});

describe('recipe photos in the service worker', () => {
  const PHOTO = `${SCOPE}images/dolma.webp`;

  it('serves photos cache first from the photo cache, and fails (for the plate fallback) offline when not cached', async () => {
    let online = true;
    const w = worker([], async (req) => {
      if (!online) throw new TypeError('offline');
      return req.url.endsWith('.webp') ? basic(`photo ${new URL(req.url).pathname}`) : html('<shell>');
    }, 'v2', { 'images/dolma.webp': 'h1' });
    await w.run('install');
    expect(w.fetched.some((u) => u.includes('/images/'))).toBe(false);
    const first = await w.run('fetch', { request: w.request('images/dolma.webp') });
    expect(await first?.text()).toBe('photo /app/images/dolma.webp');
    const stored = await (await w.caches.open(IMAGE_CACHE)).keys();
    expect(stored.map((r) => r.url)).toEqual([`${PHOTO}?v=h1`]);
    online = false;
    const again = await w.run('fetch', { request: w.request('images/dolma.webp') });
    expect(await again?.text()).toBe('photo /app/images/dolma.webp');
    const missing = await w.run('fetch', { request: w.request('images/other.webp') });
    expect(missing?.type).toBe('error');
  });

  it('keeps the photo cache across updates, dropping only photos that changed or were removed', async () => {
    const w = worker([], async () => html('<shell>'), 'v3', { 'images/a.webp': 'new', 'images/b.webp': 'same' });
    const photos = await w.caches.open(IMAGE_CACHE);
    await photos.put(`${SCOPE}images/a.webp?v=old`, basic('a'));
    await photos.put(`${SCOPE}images/b.webp?v=same`, basic('b'));
    await photos.put(`${SCOPE}images/gone.webp?v=x`, basic('c'));
    await w.caches.open('sufra-v2');
    await w.run('install');
    await w.run('activate');
    expect((await w.caches.keys()).sort()).toEqual([IMAGE_CACHE, 'sufra-v3']);
    expect((await photos.keys()).map((r) => r.url)).toEqual([`${SCOPE}images/b.webp?v=same`]);
  });

  it(`holds at most ${MAX_IMAGES} photos, dropping the oldest`, async () => {
    const w = worker([], async (req) => (req.url.endsWith('.webp') ? basic('p') : html('<shell>')));
    const photos = await w.caches.open(IMAGE_CACHE);
    for (let i = 0; i < MAX_IMAGES; i++) await photos.put(`${SCOPE}images/p${i}.webp`, basic('p'));
    await w.run('fetch', { request: w.request('images/new.webp') });
    const keys = (await photos.keys()).map((r) => r.url);
    expect(keys).toHaveLength(MAX_IMAGES);
    expect(keys).not.toContain(`${SCOPE}images/p0.webp`);
    expect(keys.at(-1)).toBe(`${SCOPE}images/new.webp`);
  });

  it('stores the photos the page asks for ahead of time, skipping cached ones and anything that is not a photo', async () => {
    const w = worker([], async (req) => (req.url.endsWith('.webp') ? basic('p') : html('<shell>')), 'v2', { 'images/a.webp': 'ha' });
    const photos = await w.caches.open(IMAGE_CACHE);
    await photos.put(`${SCOPE}images/b-thumb.webp`, basic('b'));
    const urls = [`${SCOPE}images/a.webp`, `${SCOPE}images/b-thumb.webp`, `${SCOPE}images/a.webp`, `${SCOPE}index.html`, 'https://elsewhere.test/images/x.webp'];
    await w.run('message', { data: { type: PREFETCH_MESSAGE, urls } });
    expect(w.fetched).toEqual([`${SCOPE}images/a.webp`]);
    expect((await photos.keys()).map((r) => r.url).sort()).toEqual([`${SCOPE}images/a.webp?v=ha`, `${SCOPE}images/b-thumb.webp`]);
  });

  it('uses the same prefetch message as the page', () => {
    expect(PAGE_PREFETCH_MESSAGE).toBe(PREFETCH_MESSAGE);
  });
});

describe('fnv1a', () => {
  it('is stable and sensitive to content', () => {
    expect(fnv1a('abc')).toBe(fnv1a('abc'));
    expect(fnv1a('abc')).not.toBe(fnv1a('abd'));
    expect(fnv1aBytes(new Uint8Array([97, 98, 99]))).toBe(fnv1a('abc'));
  });
});
