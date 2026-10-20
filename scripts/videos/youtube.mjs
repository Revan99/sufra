// Reads public YouTube pages (no API key): search results and a video's page, for picking and checking recipe
// videos. Only the page's embedded ytInitialData is parsed. Be gentle: callers space requests out.
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function initialData(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const html = await res.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  return { data: m ? JSON.parse(m[1]) : null, html };
}

function find(o, key, out = []) {
  if (!o || typeof o !== 'object') return out;
  if (o[key]) out.push(o[key]);
  for (const k in o) if (k !== key) find(o[k], key, out);
  return out;
}

const text = (t) => t?.simpleText ?? t?.runs?.map((r) => r.text).join('') ?? '';
const verified = (badges) => JSON.stringify(badges ?? []).includes('VERIFIED');

/** "1.2M subscribers" → 1200000. */
export function parseCount(s) {
  const m = /([\d.,]+)\s*([KMB])?/i.exec(s ?? '');
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Math.round(n * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]?.toUpperCase()] ?? 1));
}

/** Top search results: id, title, channel, verified badge, length, views. */
export async function search(query) {
  const { data } = await initialData(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
  return find(data, 'videoRenderer').map((v) => ({
    youtubeId: v.videoId,
    title: text(v.title),
    channel: text(v.ownerText),
    verified: verified(v.ownerBadges),
    length: text(v.lengthText),
    views: parseCount(text(v.viewCountText)),
  }));
}

const channels = new Map();

/** A channel's standing from its page header: YouTube's verified check and subscriber count (cached per run). */
export async function channelInfo(channelUrl) {
  if (channels.has(channelUrl)) return channels.get(channelUrl);
  let header = JSON.stringify((await initialData(channelUrl)).data?.header ?? {});
  // YouTube sometimes serves a page whose header lacks the counts: try once more before judging the channel.
  if (!/ subscribers/.test(header)) {
    await sleep(1500);
    header = JSON.stringify((await initialData(channelUrl)).data?.header ?? {});
  }
  const info = {
    verified: /CHECK_CIRCLE_FILLED|BADGE_STYLE_TYPE_VERIFIED/.test(header),
    subscribers: parseCount((header.match(/([\d.,]+[KMB]?) subscribers/) ?? [])[1]),
  };
  channels.set(channelUrl, info);
  return info;
}

/**
 * A video's channel and standing: verified check, subscribers, and whether it is still up. Uses YouTube's oEmbed
 * endpoint (a missing, private or removed video fails it) and the channel's page, so a run reads each channel once.
 */
export async function videoInfo(youtubeId) {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeId}`)}`, { headers: HEADERS });
  if (res.status === 404 || res.status === 401 || res.status === 400) return { youtubeId, playable: false, channel: '', title: '', verified: false, subscribers: null };
  if (!res.ok) throw new Error(`oembed ${res.status}`);
  const o = await res.json();
  const ch = await channelInfo(o.author_url);
  return { youtubeId, channel: o.author_name, channelUrl: o.author_url, title: o.title, playable: true, ...ch };
}

/**
 * Trusted: a cooking channel YouTube has verified, or one with at least 100,000 subscribers. Whether it is a
 * cooking channel at all (not a language-learning or vlog channel) is a judgment made when picking.
 */
export const MIN_SUBSCRIBERS = 100_000;
export const isTrusted = (info) => info.playable && (info.verified || (info.subscribers ?? 0) >= MIN_SUBSCRIBERS);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
