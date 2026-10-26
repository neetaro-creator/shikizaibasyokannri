import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { beforeAll, expect, it } from 'vitest';

beforeAll(() => {
  execSync('npm run build-db && npx vite build', { stdio: 'ignore' });
}, 120_000);

it('build emits service worker and manifest', () => {
  expect(existsSync('dist/sw.js')).toBe(true);
  const m = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf-8'));
  expect(m.start_url).toBe('/shikizaibasyokannri/');
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512']);
});

it('service worker precaches app data', () => {
  expect(readFileSync('dist/sw.js', 'utf-8')).toMatch(/index\.html/);
});
