#!/usr/bin/env node
// Records that no suitable photo exists for a recipe, so it keeps the plate illustration.
//
//   node scripts/photos/none.mjs <recipe-id> --reason "Only NC-licensed photos; Commons has none"
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { IMAGE_DIR, META_DIR, WORK, loadRecipe, parseArgs, readJson, writeJson } from './common.mjs';
import { writeManifest } from './manifest.mjs';

const { pos, opts } = parseArgs(process.argv.slice(2));
const id = pos[0];
const reason = typeof opts.reason === 'string' ? opts.reason.trim() : '';
if (!id || !reason) {
  console.error('usage: none.mjs <recipe-id> --reason "..."');
  process.exit(2);
}
await loadRecipe(id);
const state = readJson(join(WORK, id, 'candidates.json'), { queries: [] });
rmSync(join(IMAGE_DIR, `${id}.webp`), { force: true });
rmSync(join(IMAGE_DIR, `${id}-thumb.webp`), { force: true });
writeJson(join(META_DIR, `${id}.json`), { id, photo: null, reason, queries: state.queries });
writeManifest({ quiet: true });
console.log(`${id}: no photo (${reason})`);
