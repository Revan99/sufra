#!/usr/bin/env node
// Uses one candidate from search.mjs as the recipe's photo: downloads it, makes the WebP sizes,
// records the credit and regenerates src/data/photos.ts.
//
//   node scripts/photos/select.mjs <recipe-id> <cNN> --alt "Describe the photo" [--focus 50,60]
//
// --focus is where the food sits, in percent from the left and top (CSS object-position), so
// square and wide crops keep it in frame. Default 50,50.
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { IMAGE_DIR, LARGE_W, META_DIR, THUMB_W, WORK, fetchWithRetry, parseArgs, readJson, writeJson } from './common.mjs';
import { writeManifest } from './manifest.mjs';

const { pos, opts } = parseArgs(process.argv.slice(2));
const [id, key] = pos;
const alt = typeof opts.alt === 'string' ? opts.alt.trim() : '';
if (!id || !key || !alt) {
  console.error('usage: select.mjs <recipe-id> <cNN> --alt "..." [--focus x,y]');
  process.exit(2);
}
const focus = String(opts.focus ?? '50,50').split(',').map(Number);
if (focus.length !== 2 || focus.some((v) => !(v >= 0 && v <= 100))) {
  console.error('--focus must be two percentages, e.g. 50,60');
  process.exit(2);
}

const state = readJson(join(WORK, id, 'candidates.json'), null);
const c = state?.candidates.find((x) => x.key === key);
if (!c) {
  console.error(`no candidate ${key} for ${id}; run search.mjs first`);
  process.exit(2);
}

// Commons: ask for a server-rendered 1280 px version (already EXIF-rotated) instead of the original.
let fullUrl = c.imageUrl;
if (c.source === 'Wikimedia Commons' && c.fileTitle) {
  const info = await fetchWithRetry(
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=1280' +
      `&titles=${encodeURIComponent(c.fileTitle)}`,
    { json: true },
  );
  const ii = Object.values(info.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (ii?.thumburl) fullUrl = ii.thumburl;
}

const work = join(WORK, id);
const full = join(work, 'full');
writeFileSync(full, await fetchWithRetry(fullUrl));
const dims = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', full], { encoding: 'utf8' });
const w = Number(dims.match(/pixelWidth: (\d+)/)?.[1]);
const h = Number(dims.match(/pixelHeight: (\d+)/)?.[1]);
if (!w || !h) throw new Error(`could not read the size of ${fullUrl}`);

mkdirSync(IMAGE_DIR, { recursive: true });
const largeW = Math.min(LARGE_W, w);
const thumbW = Math.min(THUMB_W, w);
const large = join(IMAGE_DIR, `${id}.webp`);
const thumb = join(IMAGE_DIR, `${id}-thumb.webp`);
execFileSync('cwebp', ['-quiet', '-q', '70', '-m', '6', '-metadata', 'none', '-resize', String(largeW), '0', full, '-o', large]);
execFileSync('cwebp', ['-quiet', '-q', '68', '-m', '6', '-metadata', 'none', '-resize', String(thumbW), '0', full, '-o', thumb]);

const photo = {
  src: `images/${id}.webp`,
  thumb: `images/${id}-thumb.webp`,
  width: largeW,
  height: Math.round((h * largeW) / w),
  alt,
  focus: [focus[0], focus[1]],
  credit: {
    title: c.title,
    author: c.author,
    ...(c.authorUrl ? { authorUrl: c.authorUrl } : {}),
    license: c.license,
    ...(c.licenseUrl ? { licenseUrl: c.licenseUrl } : {}),
    sourceUrl: c.sourceUrl,
    source: c.source,
    changes: 'Resized and converted to WebP',
  },
};
writeJson(join(META_DIR, `${id}.json`), { id, photo, chosen: { key, imageUrl: c.imageUrl, query: c.query }, queries: state.queries });
writeManifest({ quiet: true });

const kb = (p) => Math.round(statSync(p).size / 1024);
console.log(`${id}: ${c.license} "${c.title}" by ${c.author}`);
console.log(`  ${large} (${largeW}x${photo.height}, ${kb(large)} KB)`);
console.log(`  ${thumb} (${kb(thumb)} KB)`);
console.log('Look at the large file once to confirm it is right side up and shows the dish.');
