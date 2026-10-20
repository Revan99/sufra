#!/usr/bin/env node --experimental-strip-types
// Lists every recipe that breaks a health rule, grouped by its chunk file: node scripts/health-audit.mjs [chunk...]
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECIPES, INGREDIENTS, ingredientIndex } from '../src/data/index.ts';
import { validateLibrary } from '../src/data/validate.ts';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/data/recipes');
const chunkOf = new Map();
for (const f of await readdir(dir)) {
  if (!f.endsWith('.ts') || f === 'index.ts') continue;
  const src = await readFile(join(dir, f), 'utf8');
  for (const m of src.matchAll(/^\s{2,4}id: '([a-z0-9-]+)'/gm)) chunkOf.set(m[1], f.replace(/\.ts$/, ''));
}
const only = new Set(process.argv.slice(2));
const byChunk = new Map();
for (const i of validateLibrary(RECIPES, INGREDIENTS, ingredientIndex)) {
  if (i.level !== 'error') continue;
  const chunk = chunkOf.get(i.subject) ?? '(ingredients)';
  if (only.size && !only.has(chunk)) continue;
  if (!byChunk.has(chunk)) byChunk.set(chunk, new Map());
  const recipes = byChunk.get(chunk);
  if (!recipes.has(i.subject)) recipes.set(i.subject, []);
  recipes.get(i.subject).push(i.message);
}
let total = 0;
for (const [chunk, recipes] of [...byChunk].sort()) {
  console.log(`\n${chunk} (${recipes.size})`);
  for (const [id, msgs] of recipes) {
    total++;
    console.log(`  ${id}: ${msgs.join('; ')}`);
  }
}
console.log(`\n${total} recipes to fix`);
