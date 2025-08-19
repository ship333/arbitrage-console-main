import { test as base, expect } from '@playwright/test';

// Shared test that performs a pre-test healthcheck to avoid racing the preview server
export const test = base.extend({});

// Poll the baseURL until it responds OK
test.beforeAll(async ({ request, baseURL }) => {
  const url = baseURL || 'http://localhost:4173';
  const deadline = Date.now() + 60_000; // 60s
  let lastErr: unknown = undefined;
  while (Date.now() < deadline) {
    try {
      const resp = await request.get(url);
      if (resp.ok()) return;
      lastErr = `HTTP ${resp.status()} ${resp.statusText()}`;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Healthcheck failed for ${url}: ${String(lastErr)}`);
});

// Basic DOM readiness check for the app root
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#root', { state: 'attached', timeout: 30_000 });
});

export { expect };
