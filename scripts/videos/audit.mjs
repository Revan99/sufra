#!/usr/bin/env node
// Checks every video in src/data/videos.ts against YouTube: still playable, and from a trusted channel (verified,
// or 100k+ subscribers). Writes scripts/videos/audit.json and prints the ones to replace.
//   node scripts/videos/audit.mjs [--only id,id | --retry] [--workers 4] [--pause 400]
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTrusted, sleep, videoInfo } from './youtube.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const src = await readFile(join(here, '../../src/data/videos.ts'), 'utf8');
const entries = [...src.matchAll(/^\s*"([a-z0-9-]+)": (\{.*\}),?$/gm)].map((m) => [m[1], JSON.parse(m[2])]);
const outFile = join(here, 'audit.json');
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
// --only id,id re-checks those; --retry re-checks the ones the last run couldn't load.
let only = arg('--only') ? new Set(arg('--only').split(',')) : null;
if (process.argv.includes('--retry')) {
  const last = JSON.parse(await readFile(outFile, 'utf8').catch(() => '{}'));
  only = new Set(Object.entries(last).filter(([, r]) => r.error).map(([id]) => id));
}
const workers = Number(arg('--workers') ?? 4);
const pause = Number(arg('--pause') ?? 400);
const todo = only ? entries.filter(([id]) => only.has(id)) : entries;

const results = {};
let i = 0;
async function worker() {
  while (i < todo.length) {
    const [recipeId, v] = todo[i++];
    let info = null;
    for (let attempt = 0; attempt < 3 && !info; attempt++) {
      info = await videoInfo(v.youtubeId).catch(() => null);
      if (!info) await sleep(2000);
    }
    results[recipeId] = info ? { ...info, trusted: isTrusted(info) } : { youtubeId: v.youtubeId, error: true, trusted: false };
    await sleep(pause);
  }
}
await Promise.all(Array.from({ length: workers }, worker));
const prev = only ? JSON.parse(await readFile(outFile, 'utf8').catch(() => '{}')) : {};
await writeFile(outFile, JSON.stringify({ ...prev, ...results }, null, 1));
const bad = Object.entries(results).filter(([, r]) => !r.trusted);
console.log(`${todo.length} checked, ${todo.length - bad.length} trusted, ${bad.length} to replace`);
for (const [id, r] of bad) console.log(`  ${id}: ${r.error ? 'could not load' : !r.playable ? 'not playable' : `${r.channel} (${r.subscribers ?? '?'} subs, not verified)`}`);
