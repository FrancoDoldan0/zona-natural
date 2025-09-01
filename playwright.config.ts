import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    browserName: 'chromium',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Si querés levantar el dev server automático, descomentá:
  // webServer: {
  //   command: 'npm run dev -- -p 3000',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: true,
  //   timeout: 120000,
  // },
});