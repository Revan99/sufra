import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { IMAGE_DIR, fnv1a, fnv1aBytes, serviceWorkerSource } from './src/ui/pwa/sw-template.ts';
import { en } from './src/i18n/en.ts';

/**
 * Emits sw.js at build time: a versioned precache of every built file (the bundle's chunks and assets, index.html,
 * and everything copied from public/ except the recipe photos in public/images, which are cached as they are
 * used), plus each photo's content hash so an update drops changed photos from the photo cache. The version is a
 * hash of all of their contents, so any change ships a new worker and cache. See src/ui/pwa/sw-template.ts.
 */
function serviceWorker(): Plugin {
  let publicDir = '';
  return {
    name: 'sufra-service-worker',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const files: string[] = [];
        const images: Record<string, string> = {};
        let hash = fnv1a('sufra');
        for (const [fileName, out] of Object.entries(bundle)) {
          if (fileName.endsWith('.map')) continue;
          files.push(fileName);
          const body = out.type === 'chunk' ? out.code : out.source;
          hash = typeof body === 'string' ? fnv1a(`${fileName}\n${body}`, hash) : fnv1aBytes(body, fnv1a(fileName, hash));
        }
        if (publicDir) {
          let entries: string[] = [];
          try {
            entries = readdirSync(publicDir, { recursive: true });
          } catch {
            entries = [];
          }
          for (const rel of entries.map((e) => e.replace(/\\/g, '/')).sort()) {
            const full = `${publicDir}/${rel}`;
            if (rel.split('/').some((p) => p.startsWith('.')) || !statSync(full).isFile()) continue;
            files.push(rel);
            const bytes = readFileSync(full);
            hash = fnv1aBytes(bytes, fnv1a(rel, hash));
            if (rel.startsWith(IMAGE_DIR)) images[rel] = fnv1aBytes(bytes).toString(36);
          }
        }
        const version = hash.toString(36);
        this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorkerSource(version, files, en['app.offline'], images) });
      },
    },
  };
}

export default defineConfig({
  // Relative asset URLs, so the built app works from any sub-path (the manifest's start_url is ".").
  base: './',
  plugins: [react(), serviceWorker()],
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        // Three chunks that change at different rates, so a UI-only release (and the service worker's update,
        // which reuses unchanged hashed files) downloads only the app chunk: React, the recipe library (src/data,
        // plus the nutrition code it pulls in), and the app itself. The data import stays static: Today needs
        // the catalog on first render, and index.html modulepreloads every chunk.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 2 },
            { name: 'recipes', test: /src[\\/]data[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
