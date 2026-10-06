import { describe, expect, it } from 'vitest';
import { VIDEOS } from './videos.ts';
import { RECIPES } from './index.ts';

const ids = new Set(RECIPES.map((r) => r.id));

describe('reference videos', () => {
  it('belong to existing recipes and are complete', () => {
    const problems: string[] = [];
    for (const [id, v] of Object.entries(VIDEOS)) {
      if (!ids.has(id)) problems.push(`${id}: no such recipe`);
      if (!/^[\w-]{11}$/.test(v.youtubeId)) problems.push(`${id}: bad YouTube id "${v.youtubeId}"`);
      if (!v.title.trim() || !v.channel.trim()) problems.push(`${id}: missing title or channel`);
    }
    expect(problems).toEqual([]);
  });

  it('never reuse one video for two recipes', () => {
    const seen = new Map<string, string>();
    const dup: string[] = [];
    for (const [id, v] of Object.entries(VIDEOS)) {
      const other = seen.get(v.youtubeId);
      if (other) dup.push(`${other} and ${id}`);
      seen.set(v.youtubeId, id);
    }
    expect(dup).toEqual([]);
  });
});
