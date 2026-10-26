/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = '/shikizaibasyokannri/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '積載資器材',
        short_name: '資器材',
        lang: 'ja',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#0a0e13',
        theme_color: '#0a0e13',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,glb,jpg,png,webp,wasm,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'] },
});
