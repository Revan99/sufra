#!/usr/bin/env node
// Draws the Sufra app icon (a cream plate with an olive leaf and a saffron apricot on terracotta) and writes:
//   public/icon.svg                 favicon and source drawing (rounded square)
//   public/icons/icon-192.png       manifest icon, purpose "any"
//   public/icons/icon-512.png       manifest icon, purpose "any"
//   public/icons/icon-maskable-512.png  manifest icon, purpose "maskable" (full bleed, mark inside the safe zone)
//   public/icons/apple-touch-icon.png   180 x 180, full bleed (iOS rounds it)
// Rasterizes with Playwright's Chromium, reused from another local project (nothing is installed):
//   node scripts/make-icons.mjs [path/to/playwright]
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLAYWRIGHT = process.argv[2] ?? '/Users/revansarbast/Documents/personal/projects/portfolio/node_modules/playwright/index.mjs';

const TERRACOTTA = '#A6461F';
const TERRACOTTA_DEEP = '#8E3A17';
const CREAM = '#FBF3E6';
const RING = '#E6D3BB';
const OLIVE = '#5F7A2A';
const SAFFRON = '#D9A441';

/** The mark on a 512 box. `scale` shrinks it around the centre; `rounded` gives transparent corners. */
function iconSvg({ rounded, scale = 1 }) {
  const bg = rounded
    ? `<rect width="512" height="512" rx="112" fill="url(#g)"/>`
    : `<rect width="512" height="512" fill="url(#g)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${TERRACOTTA}"/>
      <stop offset="1" stop-color="${TERRACOTTA_DEEP}"/>
    </linearGradient>
  </defs>
  ${bg}
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <circle cx="256" cy="262" r="168" fill="#000" opacity="0.14"/>
    <circle cx="256" cy="256" r="168" fill="${CREAM}"/>
    <circle cx="256" cy="256" r="124" fill="none" stroke="${RING}" stroke-width="10"/>
    <path d="M180 332c0-84 56-144 152-152 4.8 96-52.8 152-152 152Z" fill="${OLIVE}"/>
    <path d="M180 332c33.6-43.2 67.2-72 107.2-94.4" fill="none" stroke="${CREAM}" stroke-width="12.8" stroke-linecap="round"/>
    <circle cx="324" cy="312" r="25.6" fill="${SAFFRON}"/>
  </g>
</svg>
`;
}

const OUTPUTS = [
  { file: 'icons/icon-192.png', size: 192, svg: iconSvg({ rounded: true }) },
  { file: 'icons/icon-512.png', size: 512, svg: iconSvg({ rounded: true }) },
  // Maskable: the safe zone is a circle of radius 40% of the size, so the plate (r 168 of 256) is scaled to fit.
  { file: 'icons/icon-maskable-512.png', size: 512, svg: iconSvg({ rounded: false, scale: 0.9 }) },
  { file: 'icons/apple-touch-icon.png', size: 180, svg: iconSvg({ rounded: false }) },
];

/**
 * Launches Chromium. When the borrowed Playwright expects a browser build that isn't in the cache, falls back to
 * any cached headless shell or Chromium build, then to an installed Google Chrome.
 */
async function launch(chromium) {
  try {
    return await chromium.launch();
  } catch (first) {
    const cache = join(homedir(), 'Library', 'Caches', 'ms-playwright');
    const candidates = [];
    for (const dir of (await readdir(cache).catch(() => [])).sort().reverse()) {
      if (dir.startsWith('chromium_headless_shell-')) candidates.push(join(cache, dir, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'));
      if (dir.startsWith('chromium-')) candidates.push(join(cache, dir, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'));
    }
    for (const executablePath of candidates) {
      try {
        return await chromium.launch({ executablePath });
      } catch {
        // try the next one
      }
    }
    try {
      return await chromium.launch({ channel: 'chrome' });
    } catch {
      throw first;
    }
  }
}

async function main() {
  await mkdir(join(root, 'public', 'icons'), { recursive: true });
  await writeFile(join(root, 'public', 'icon.svg'), iconSvg({ rounded: true }));

  let chromium;
  try {
    ({ chromium } = await import(pathToFileURL(PLAYWRIGHT).href));
  } catch (err) {
    console.error(`Playwright not found at ${PLAYWRIGHT}. Pass its index.mjs path as the first argument.`);
    throw err;
  }
  const browser = await launch(chromium);
  try {
    for (const out of OUTPUTS) {
      const page = await browser.newPage({ viewport: { width: out.size, height: out.size }, deviceScaleFactor: 1 });
      const svg = out.svg.replace('width="512" height="512"', `width="${out.size}" height="${out.size}"`);
      await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
      await page.screenshot({ path: join(root, 'public', out.file), omitBackground: true, clip: { x: 0, y: 0, width: out.size, height: out.size } });
      await page.close();
      console.log(`wrote public/${out.file} (${out.size}x${out.size})`);
    }
  } finally {
    await browser.close();
  }
  console.log('wrote public/icon.svg');
}

await main();
