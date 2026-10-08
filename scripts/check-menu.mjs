#!/usr/bin/env node
// Checks docs/menu.json (the dish plan recipes are written from) against the balance rules.
// Usage: node scripts/check-menu.mjs   → prints counts and every problem; exit 1 if any.
import { readFileSync } from 'node:fs';

const CHUNKS = [
  'breakfast-middle-eastern',
  'lunch-kurdish-iraqi',
  'lunch-mediterranean',
  'dinner-kurdish-iraqi',
  'dinner-mediterranean',
  'snacks-middle-eastern',
  'desserts',
  'breakfast-international',
  'lunch-international',
  'dinner-international',
  'snacks-international',
];
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
const CUISINES = ['kurdish', 'iraqi', 'levantine', 'turkish', 'persian', 'gulf', 'egyptian', 'north-african', 'mediterranean', 'south-asian', 'east-asian', 'southeast-asian', 'latin-american', 'western'];
const DIETS = ['vegan', 'vegetarian', 'pescatarian', 'meat'];
const FIELDS = { id: 'string', name: 'string', nativeName: 'string', cuisine: 'string', slots: 'array', concept: 'string', mainProtein: 'string', diet: 'string', glutenFree: 'boolean', dairyFree: 'boolean', nutFree: 'boolean', eggFree: 'boolean', quick: 'boolean', keyIngredients: 'array' };

let menu;
try {
  menu = JSON.parse(readFileSync(new URL('../docs/menu.json', import.meta.url), 'utf8'));
} catch (e) {
  console.error(`✗ cannot read docs/menu.json: ${e.message}`);
  process.exit(1);
}

const problems = [];
const chunks = Array.isArray(menu?.chunks) ? menu.chunks : [];
if (!chunks.length) problems.push('menu.chunks must be a non-empty array');
const dishes = chunks.flatMap((c) => (Array.isArray(c.dishes) ? c.dishes : []));

for (const d of dishes) {
  for (const [k, t] of Object.entries(FIELDS)) {
    const ok = t === 'array' ? Array.isArray(d[k]) : typeof d[k] === t;
    if (!ok) problems.push(`${d.id ?? '?'}: field ${k} must be ${t}`);
  }
  if (typeof d.id === 'string' && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.id)) problems.push(`${d.id}: id must be kebab-case`);
  if (!CUISINES.includes(d.cuisine)) problems.push(`${d.id}: unknown cuisine "${d.cuisine}"`);
  if (!DIETS.includes(d.diet)) problems.push(`${d.id}: unknown diet "${d.diet}"`);
  if (Array.isArray(d.slots) && (!d.slots.length || d.slots.some((s) => !SLOTS.includes(s)))) problems.push(`${d.id}: bad slots`);
  if (Array.isArray(d.keyIngredients) && d.keyIngredients.length < 2) problems.push(`${d.id}: list its key ingredients`);
}

const ids = dishes.map((d) => d.id);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dup.length) problems.push(`duplicate ids: ${[...new Set(dup)].join(', ')}`);
const names = dishes.map((d) => String(d.name).toLowerCase());
const dupNames = names.filter((n, i) => names.indexOf(n) !== i);
if (dupNames.length) problems.push(`duplicate names: ${[...new Set(dupNames)].join(', ')}`);

const isVeg = (d) => d.diet === 'vegan' || d.diet === 'vegetarian';
console.log('chunk                      dishes veg vegan GF DF NF EF quick');
for (const name of CHUNKS) {
  const c = chunks.find((x) => x.chunk === name);
  if (!c) {
    problems.push(`missing chunk ${name}`);
    continue;
  }
  const ds = c.dishes ?? [];
  const n = {
    dishes: ds.length,
    veg: ds.filter(isVeg).length,
    vegan: ds.filter((d) => d.diet === 'vegan').length,
    GF: ds.filter((d) => d.glutenFree).length,
    DF: ds.filter((d) => d.dairyFree).length,
    NF: ds.filter((d) => d.nutFree).length,
    EF: ds.filter((d) => d.eggFree).length,
    quick: ds.filter((d) => d.quick).length,
  };
  console.log(`${name.padEnd(26)} ${Object.values(n).map((v) => String(v).padStart(3)).join('  ')}`);
}
for (const c of chunks) if (!CHUNKS.includes(c.chunk)) problems.push(`unknown chunk "${c.chunk}"`);

// Same minimums as src/data/coverage.ts.
const RULES = [
  ['any diet', () => true, { breakfast: 20, lunch: 20, dinner: 20, snack: 18 }],
  ['vegetarian', isVeg, { breakfast: 12, lunch: 10, dinner: 10, snack: 12 }],
  ['vegan', (d) => d.diet === 'vegan', { breakfast: 7, lunch: 7, dinner: 7, snack: 7 }],
  ['gluten-free', (d) => d.glutenFree, { breakfast: 7, lunch: 7, dinner: 7, snack: 7 }],
  ['dairy-free', (d) => d.dairyFree, { breakfast: 7, lunch: 7, dinner: 7, snack: 7 }],
  ['nut-free', (d) => d.nutFree, { breakfast: 10, lunch: 10, dinner: 10, snack: 10 }],
  ['egg-free', (d) => d.eggFree, { breakfast: 10, lunch: 10, dinner: 10, snack: 10 }],
  ['quick', (d) => d.quick, { breakfast: 10, lunch: 7, dinner: 7, snack: 10 }],
];
console.log('\ncoverage (count / min)      breakfast  lunch  dinner  snack');
for (const [label, fn, min] of RULES) {
  const cells = SLOTS.map((s) => {
    const n = dishes.filter((d) => Array.isArray(d.slots) && d.slots.includes(s) && fn(d)).length;
    if (n < min[s]) problems.push(`coverage ${label}/${s}: ${n} (need >= ${min[s]})`);
    return `${n}/${min[s]}`.padStart(8);
  });
  console.log(`${label.padEnd(26)} ${cells.join(' ')}`);
}

const kurdIraqi = dishes.filter((d) => d.cuisine === 'kurdish' || d.cuisine === 'iraqi').length;
console.log(`\nKurdish/Iraqi dishes: ${kurdIraqi} (need >= 24), total dishes: ${dishes.length}`);
if (kurdIraqi < 24) problems.push(`Kurdish/Iraqi dishes: ${kurdIraqi} (need >= 24)`);

if (problems.length) {
  console.log(`\n✗ ${problems.length} problems:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('\n✓ menu OK');
