import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'e2e/test-results',
  use: {
    baseURL: 'http://localhost:4173/shikizaibasyokannri/',
    ...devices['iPhone 13'],
    browserName: 'chromium',
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/shikizaibasyokannri/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
