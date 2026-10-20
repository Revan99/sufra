#!/usr/bin/env node
// Searches YouTube and prints the results with each channel's trust standing, best candidates first:
//   node scripts/videos/search.mjs "iraqi dolma recipe"
import { isTrusted, search, sleep, videoInfo } from './youtube.mjs';

const query = process.argv.slice(2).join(' ');
if (!query) {
  console.error('usage: search.mjs <query>');
  process.exit(1);
}
const results = (await search(query)).slice(0, 10);
const out = [];
for (const r of results) {
  const info = await videoInfo(r.youtubeId).catch(() => null);
  out.push({ ...r, subscribers: info?.subscribers ?? null, playable: info?.playable ?? false, trusted: info ? isTrusted(info) : false });
  await sleep(300);
}
out.sort((a, b) => Number(b.trusted) - Number(a.trusted) || (b.views ?? 0) - (a.views ?? 0));
for (const r of out) {
  const subs = r.subscribers ? `${Math.round(r.subscribers / 1000)}k subs` : '? subs';
  console.log(`${r.trusted ? 'TRUSTED ' : 'untrusted'} ${r.youtubeId}  ${r.verified ? '✓' : ' '} ${subs.padEnd(10)} ${String(r.views ?? '?').padStart(9)} views  ${r.length.padStart(6)}  ${r.channel} — ${r.title}`);
}
