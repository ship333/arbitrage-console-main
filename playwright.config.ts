/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

// Allow overriding the preview port per run to prevent stale server reuse
const PORT = Number(process.env.PW_PORT ?? 4173);
const BASE_URL = process.env.PW_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'line' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // You can enable more browsers if needed
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    env: {
      // Point frontend to backend; override per run
      VITE_API_URL: process.env.VITE_API_URL ?? 'http://localhost:8080/api',
      // Optional explicit WS URL; usually derived from API URL
      VITE_WS_URL: process.env.VITE_WS_URL ?? '',
      // Allow toggling WS in tests
      VITE_DISABLE_WS: process.env.VITE_DISABLE_WS ?? '1',
    },
    url: `http://localhost:${PORT}`,
    // Always start a fresh preview so env changes (e.g., WS on/off) take effect
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
