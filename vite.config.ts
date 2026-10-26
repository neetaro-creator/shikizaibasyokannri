/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/shikizaibasyokannri/',
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'] },
});
