import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  retries: 0,
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:9002',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm start --hostname 127.0.0.1 --port 9002',
    url: 'http://127.0.0.1:9002/en',
    reuseExistingServer: false,
  },
});
