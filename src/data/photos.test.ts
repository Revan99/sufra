import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PHOTOS } from './photos.ts';
import { RECIPES } from './index.ts';

const LICENSE = /^(CC0 1\.0|Public domain|CC BY(-SA)? \d(\.\d)?)$/;
const files = new Set(readdirSync('public/images', { recursive: true }).filter((f) => f.endsWith('.webp')));
const ids = new Set(RECIPES.map((r) => r.id));

describe('recipe photos', () => {
  it('belong to existing recipes and have both image files', () => {
    const problems: string[] = [];
    for (const [id, p] of Object.entries(PHOTOS)) {
      if (!ids.has(id)) problems.push(`${id}: no such recipe`);
      if (p.src !== `images/${id}.webp` || !files.has(`${id}.webp`)) problems.push(`${id}: large image missing`);
      if (p.thumb !== `images/${id}-thumb.webp` || !files.has(`${id}-thumb.webp`)) problems.push(`${id}: thumbnail missing`);
    }
    expect(problems).toEqual([]);
  });

  it('carry an allowed licence and a complete credit', () => {
    const problems: string[] = [];
    for (const [id, p] of Object.entries(PHOTOS)) {
      const c = p.credit;
      if (!LICENSE.test(c.license)) problems.push(`${id}: licence "${c.license}" is not allowed`);
      if (!c.author.trim() || !c.title.trim() || !c.changes.trim()) problems.push(`${id}: incomplete credit`);
      if (!/^https:\/\//.test(c.sourceUrl)) problems.push(`${id}: sourceUrl must be https`);
      if (p.alt.trim().length < 15) problems.push(`${id}: alt text too short`);
      if (p.focus.some((v) => !(v >= 0 && v <= 100))) problems.push(`${id}: focus out of range`);
      if (!(p.width > 0 && p.height > 0)) problems.push(`${id}: bad size`);
    }
    expect(problems).toEqual([]);
  });

  it('leave no orphan image files', () => {
    const used = new Set(Object.keys(PHOTOS).flatMap((id) => [`${id}.webp`, `${id}-thumb.webp`]));
    expect([...files].filter((f) => !used.has(f))).toEqual([]);
  });
});
