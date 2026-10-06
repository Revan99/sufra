#!/usr/bin/env node
// Checks every package version in pnpm-lock.yaml against the npm registry and fails
// if any was published less than MIN_DAYS ago (supply-chain guard, mirrors
// minimumReleaseAge in pnpm-workspace.yaml).
import { readFileSync } from 'node:fs';

const MIN_DAYS = Number(process.env.MIN_DAYS ?? 7);
const lock = readFileSync(new URL('../pnpm-lock.yaml', import.meta.url), 'utf8');

const section = lock.split(/^packages:\s*$/m)[1]?.split(/^snapshots:\s*$/m)[0] ?? '';
const entries = new Map();
for (const m of section.matchAll(/^ {2}'?(@?[^@\s']+)@([^(':\s]+)/gm)) {
  entries.set(`${m[1]}@${m[2]}`, { name: m[1], version: m[2] });
}

const byName = new Map();
for (const { name, version } of entries.values()) {
  if (!byName.has(name)) byName.set(name, []);
  byName.get(name).push(version);
}

const cutoff = Date.now() - MIN_DAYS * 86_400_000;
const failures = [];
let checked = 0;

await Promise.all(
  [...byName].map(async ([name, versions]) => {
    const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2F')}`);
    if (!res.ok) throw new Error(`${name}: registry responded ${res.status}`);
    const { time } = await res.json();
    for (const v of versions) {
      checked++;
      const published = Date.parse(time?.[v]);
      if (Number.isNaN(published)) failures.push(`${name}@${v}: no publish time`);
      else if (published > cutoff) failures.push(`${name}@${v}: published ${time[v]}`);
    }
  }),
);

if (failures.length) {
  console.error(`✗ ${failures.length}/${checked} versions are younger than ${MIN_DAYS} days:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ all ${checked} locked versions are at least ${MIN_DAYS} days old`);
