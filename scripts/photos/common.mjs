// Shared helpers for the photo pipeline (search.mjs, select.mjs, none.mjs, manifest.mjs).
// Photos come only from Wikimedia Commons and Openverse (mostly Flickr), under licences that allow
// commercial use and modification: CC0, public domain, CC BY, CC BY-SA. Never NC, ND or GFDL-only.
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const WORK = join(ROOT, '.photo-work');
export const META_DIR = join(ROOT, 'photos');
export const IMAGE_DIR = join(ROOT, 'public', 'images');
export const USER_AGENT = 'SufraPhotoFetcher/0.1 (personal recipe app; low-volume)';
export const LARGE_W = 960;
export const THUMB_W = 400;
export const MIN_SOURCE_W = 800;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(url, { tries = 4, json = false } = {}) {
  let wait = 1500;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: json ? 'application/json' : '*/*' } });
    if (res.ok) return json ? res.json() : Buffer.from(await res.arrayBuffer());
    if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} for ${url}`);
    const retryAfter = Number(res.headers.get('retry-after'));
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : wait);
    wait *= 2;
  }
  throw new Error(`gave up after ${tries} tries: ${url}`);
}

// ---- licences ----

/** Normalizes a Commons LicenseShortName or an Openverse licence code to a display name, or null if not allowed. */
export function allowedLicense(raw, version) {
  const s = String(raw ?? '').trim();
  // Openverse licence codes (the search already asks for commercial use + modification).
  const code = s.toLowerCase();
  if (code === 'cc0') return 'CC0 1.0';
  if (code === 'pdm') return 'Public domain';
  if (code === 'by') return `CC BY ${version ?? ''}`.trim();
  if (code === 'by-sa') return `CC BY-SA ${version ?? ''}`.trim();
  // Commons LicenseShortName.
  if (/\bNC\b|-NC\b|\bND\b|-ND\b|non-?commercial|no ?deriv/i.test(s)) return null;
  if (/^CC0\b/i.test(s)) return 'CC0 1.0';
  if (/^(public domain|PD\b|PD-)/i.test(s)) return 'Public domain';
  const m = s.match(/^CC[- ]BY(-SA)?[- ](\d(?:\.\d)?)\b/i);
  if (m) return `CC BY${m[1] ? '-SA' : ''} ${m[2]}`;
  return null; // GFDL-only, "fair use", unknown: not allowed
}

export function licenseUrlFor(license) {
  if (license === 'CC0 1.0') return 'https://creativecommons.org/publicdomain/zero/1.0/';
  if (license === 'Public domain') return 'https://creativecommons.org/publicdomain/mark/1.0/';
  const m = license.match(/^CC BY(-SA)? (\d(?:\.\d)?)$/);
  if (!m) return undefined;
  return `https://creativecommons.org/licenses/by${m[1] ? '-sa' : ''}/${m[2].includes('.') ? m[2] : `${m[2]}.0`}/`;
}

export function stripHtml(html) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function firstHref(html) {
  const m = String(html ?? '').match(/href="([^"]+)"/);
  if (!m) return undefined;
  let url = m[1].replace(/&amp;/g, '&');
  if (url.startsWith('//')) url = `https:${url}`;
  // A link to a user page that doesn't exist yet is an edit link; point at the page itself.
  const red = url.match(/[?&]title=([^&]+)&action=edit&redlink=1/);
  if (red) url = `https://commons.wikimedia.org/wiki/${red[1]}`;
  return url;
}

// ---- Openverse throttle, shared across concurrent agents through a lock directory ----

const OV_STATE = join(WORK, 'openverse-usage.json');
const OV_LOCK = join(WORK, 'openverse.lock');
const OV_PER_MIN = 15;
const OV_PER_DAY = 180;

async function withLock(fn) {
  mkdirSync(WORK, { recursive: true });
  for (let i = 0; i < 600; i++) {
    try {
      mkdirSync(OV_LOCK);
      try {
        return await fn();
      } finally {
        rmSync(OV_LOCK, { recursive: true, force: true });
      }
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        if (Date.now() - statSync(OV_LOCK).mtimeMs > 60_000) rmSync(OV_LOCK, { recursive: true, force: true });
      } catch {}
      await sleep(250);
    }
  }
  throw new Error('could not take the Openverse lock');
}

/** Waits for a request slot. Returns false when today's budget is used up (then skip Openverse). */
export async function openverseSlot() {
  for (;;) {
    const verdict = await withLock(() => {
      let calls = [];
      try {
        calls = JSON.parse(readFileSync(OV_STATE, 'utf8'));
      } catch {}
      const now = Date.now();
      calls = calls.filter((t) => now - t < 86_400_000);
      if (calls.length >= OV_PER_DAY) return 'exhausted';
      if (calls.filter((t) => now - t < 60_000).length >= OV_PER_MIN) return 'wait';
      calls.push(now);
      writeFileSync(OV_STATE, JSON.stringify(calls));
      return 'go';
    });
    if (verdict === 'go') return true;
    if (verdict === 'exhausted') return false;
    await sleep(4000);
  }
}

// ---- recipes and metadata ----

export async function loadRecipe(id) {
  const { RECIPES } = await import(join(ROOT, 'src/data/recipes/index.ts'));
  const r = RECIPES.find((x) => x.id === id);
  if (!r) throw new Error(`unknown recipe id "${id}"`);
  return r;
}

export function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function parseArgs(argv) {
  const pos = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      const val = next === undefined || next.startsWith('--') ? true : (i++, next);
      if (opts[key] === undefined) opts[key] = val;
      else opts[key] = [].concat(opts[key], val);
    } else pos.push(a);
  }
  return { pos, opts };
}
