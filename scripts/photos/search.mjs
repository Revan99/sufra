#!/usr/bin/env node
// Finds licensed photo candidates for one recipe and saves small previews to look at.
//
//   node scripts/photos/search.mjs <recipe-id> [--q "search words"]... [--openverse] [--more]
//
// Without --q it searches the recipe's name and native name. Every --q adds a query.
// --openverse also searches Openverse (Flickr and others; throttled and budgeted across agents).
// --more appends to the existing candidates instead of starting over.
// Output: .photo-work/<id>/candidates.json and previews c01.jpg, c02.jpg ... (at most 500 px).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MIN_SOURCE_W,
  WORK,
  allowedLicense,
  fetchWithRetry,
  firstHref,
  licenseUrlFor,
  loadRecipe,
  openverseSlot,
  parseArgs,
  readJson,
  stripHtml,
  writeJson,
} from './common.mjs';

const MAX_CANDIDATES = 18;
const { pos, opts } = parseArgs(process.argv.slice(2));
const id = pos[0];
if (!id) {
  console.error('usage: search.mjs <recipe-id> [--q "words"]... [--openverse] [--more]');
  process.exit(2);
}
const recipe = await loadRecipe(id);
const queries = [].concat(opts.q ?? []).filter((q) => typeof q === 'string');
if (!queries.length) queries.push(recipe.name, ...(recipe.nativeName ? [recipe.nativeName] : []));

const dir = join(WORK, id);
if (!opts.more && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const state = readJson(join(dir, 'candidates.json'), { id, queries: [], candidates: [] });
// Same file reached by two queries or two URL spellings: compare decoded file names.
const fileKey = (url) => decodeURIComponent(String(url).split('?')[0].split('/').pop() ?? '').toLowerCase();
const seen = new Set(state.candidates.map((c) => fileKey(c.imageUrl)));

async function commons(q) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=12' +
    `&gsrsearch=${encodeURIComponent(`${q} filetype:bitmap`)}` +
    '&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=500';
  const data = await fetchWithRetry(url, { json: true });
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const out = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || !/image\/(jpeg|png|webp)/.test(ii.mime) || ii.width < MIN_SOURCE_W) continue;
    const m = ii.extmetadata ?? {};
    const license = allowedLicense(m.LicenseShortName?.value);
    if (!license) continue;
    out.push({
      source: 'Wikimedia Commons',
      fileTitle: p.title,
      title: p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
      description: stripHtml(m.ImageDescription?.value).slice(0, 200),
      imageUrl: ii.url,
      previewUrl: ii.thumburl,
      width: ii.width,
      height: ii.height,
      license,
      licenseUrl: m.LicenseUrl?.value || licenseUrlFor(license),
      author: stripHtml(m.Artist?.value) || 'Unknown author',
      authorUrl: firstHref(m.Artist?.value),
      sourceUrl: ii.descriptionurl,
      query: q,
    });
  }
  return out;
}

async function openverse(q) {
  if (!(await openverseSlot())) {
    console.log(`  (Openverse daily budget used up; skipped "${q}")`);
    return [];
  }
  const url =
    'https://api.openverse.org/v1/images/?page_size=12&mature=false&license_type=commercial,modification' +
    `&q=${encodeURIComponent(q)}`;
  const data = await fetchWithRetry(url, { json: true });
  const out = [];
  for (const r of data.results ?? []) {
    // Commons files are already covered by the Commons search, with better metadata.
    if (r.source === 'wikimedia' || r.provider === 'wikimedia') continue;
    const license = allowedLicense(r.license, r.license_version);
    if (!license || !r.url) continue;
    if (r.width && r.width < MIN_SOURCE_W) continue;
    out.push({
      source: r.source === 'flickr' ? 'Flickr' : r.source,
      title: r.title || 'Untitled',
      description: (r.tags ?? []).map((t) => t.name).slice(0, 12).join(', '),
      imageUrl: r.url,
      previewUrl: r.url,
      width: r.width ?? null,
      height: r.height ?? null,
      license,
      licenseUrl: r.license_url || licenseUrlFor(license),
      author: r.creator || 'Unknown author',
      authorUrl: r.creator_url || undefined,
      sourceUrl: r.foreign_landing_url,
      query: q,
    });
  }
  return out;
}

const found = [];
for (const q of queries) {
  try {
    found.push(...(await commons(q)));
  } catch (e) {
    console.log(`  Commons search failed for "${q}": ${e.message}`);
  }
  if (opts.openverse) {
    try {
      found.push(...(await openverse(q)));
    } catch (e) {
      console.log(`  Openverse search failed for "${q}": ${e.message}`);
    }
  }
}

let n = state.candidates.length;
for (const c of found) {
  if (seen.has(fileKey(c.imageUrl)) || state.candidates.length >= MAX_CANDIDATES) continue;
  seen.add(fileKey(c.imageUrl));
  const key = `c${String(++n).padStart(2, '0')}`;
  const preview = join(dir, `${key}.jpg`);
  try {
    const buf = await fetchWithRetry(c.previewUrl);
    writeFileSync(preview, buf);
    // Shrink big previews (Openverse gives ~1024 px) so looking at them stays cheap.
    execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', '500', preview, '--out', preview], { stdio: 'ignore' });
  } catch (e) {
    console.log(`  preview failed for ${c.imageUrl}: ${e.message}`);
    n--;
    continue;
  }
  state.candidates.push({ key, preview, ...c });
}
state.queries.push(...queries);
writeJson(join(dir, 'candidates.json'), state);

console.log(`${id} ("${recipe.name}"${recipe.nativeName ? ` / ${recipe.nativeName}` : ''}): ${state.candidates.length} candidates`);
for (const c of state.candidates) {
  const size = c.width ? `${c.width}x${c.height}` : '?x?';
  console.log(`  ${c.key} [${c.source}] ${size} ${c.license} "${c.title.slice(0, 70)}" by ${c.author.slice(0, 40)}`);
}
console.log(`previews: ${dir}/cNN.jpg`);
