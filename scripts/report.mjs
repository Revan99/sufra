#!/usr/bin/env node
// Prints per-serving nutrition, derived flags and validation issues for the recipe library.
// Usage: pnpm report [filter]   (filter matches a recipe file name like "lunch-kurdish-iraqi",
//                                an ingredient file like "produce", or a recipe id prefix)
// Node strips the TypeScript types natively, so this reads the real source files.
import { INGREDIENT_SOURCES } from '../src/data/ingredients/index.ts';
import { RECIPE_SOURCES } from '../src/data/recipes/index.ts';
import { CATALOG, INGREDIENTS, ingredientIndex } from '../src/data/index.ts';
import { validateIngredients, validateRecipe } from '../src/data/validate.ts';
import { coverage } from '../src/data/coverage.ts';

const filter = process.argv[2];
const r1 = (x) => Math.round(x * 10) / 10;
let errors = 0;
let warnings = 0;

const printIssues = (list) => {
  for (const i of list) {
    if (i.level === 'error') errors++;
    else warnings++;
    console.log(`    ${i.level === 'error' ? '✗' : '!'} ${i.message}`);
  }
};

const ingIssues = validateIngredients(INGREDIENTS);
for (const [file, list] of Object.entries(INGREDIENT_SOURCES)) {
  if (filter && !file.includes(filter)) continue;
  const ids = new Set(list.map((i) => i.id));
  const mine = ingIssues.filter((i) => ids.has(i.subject));
  if (!list.length && !filter) continue;
  console.log(`\n## ingredients/${file}.ts: ${list.length} ingredients, ${mine.length} issues`);
  for (const id of new Set(mine.map((i) => i.subject))) {
    console.log(`  ${id}`);
    printIssues(mine.filter((i) => i.subject === id));
  }
}

const byId = new Map(CATALOG.map((r) => [r.id, r]));
for (const [file, list] of Object.entries(RECIPE_SOURCES)) {
  const inFile = !filter || file.includes(filter);
  const recipes = list.filter((r) => inFile || r.id.startsWith(filter));
  if (!recipes.length) continue;
  console.log(`\n## recipes/${file}.ts: ${recipes.length} recipes`);
  console.log('  id | slots | kcal  prot  carb  fib  fat  sat%  Na mg  freeSug | flags');
  for (const r of recipes) {
    const c = byId.get(r.id);
    let line = `  ${r.id} | ${r.slots.join(',')}`;
    if (c) {
      const n = c.perServing;
      const sat = n.kcal ? Math.round((n.satFat * 900) / n.kcal) : 0;
      const f = c.flags;
      const flags = [f.vegan ? 'VG' : f.vegetarian ? 'V' : '', f.glutenFree ? 'GF' : '', f.dairyFree ? 'DF' : '', f.nutFree ? 'NF' : '', f.eggFree ? 'EF' : '']
        .filter(Boolean)
        .join(' ');
      line += ` | ${Math.round(n.kcal)}  ${r1(n.protein)}  ${r1(n.carbs)}  ${r1(n.fiber)}  ${r1(n.fat)}  ${sat}%  ${Math.round(n.sodium)}  ${r1(c.freeSugarPerServing)} | ${flags} | ${c.totalMinutes} min`;
    }
    console.log(line);
    printIssues(validateRecipe(r, ingredientIndex));
  }
}

if (!filter) {
  const ids = Object.values(RECIPE_SOURCES).flat().map((r) => r.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) {
    errors += dupes.length;
    console.log(`\n✗ duplicate recipe ids: ${[...new Set(dupes)].join(', ')}`);
  }
  console.log('\n## coverage (count / min)');
  for (const row of coverage(CATALOG)) {
    const short = row.count < row.min;
    if (short) errors++;
    const mark = short ? '✗' : ' ';
    console.log(`  ${mark} ${row.label.padEnd(16)} ${row.slot.padEnd(9)} ${String(row.count).padStart(3)} / ${row.min}`);
  }
}

console.log(`\n${INGREDIENTS.length} ingredients, ${CATALOG.length} recipes, ${errors} errors, ${warnings} warnings`);
process.exitCode = errors ? 1 : 0;
