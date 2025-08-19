/// <reference types="@playwright/test" />
/// <reference types="node" />
import { test, expect } from './fixtures';
import type { Page, Route } from '@playwright/test';
import { mockApiRoutes } from './helpers/apiMock';

// Simple in-memory mock state so we can flip bot status after start/stop
let isRunning = false;
const useRealApi = process.env.PW_REAL_API === '1';

const mockStatus = () => ({
  isRunning,
  currentStrategy: isRunning ? 'strat-1' : undefined,
  pnl: 0,
  pnlPercentage: 0,
  tradesCount: 0,
  winRate: 0,
  assets: {},
  lastUpdated: new Date().toISOString(),
  version: 'test',
  exchange: 'TEST',
  quoteCurrency: 'USD',
});

const strategies = [
  { id: 'strat-1', name: 'Strategy 1', description: 'Test', category: 'arbitrage' },
  { id: 'strat-2', name: 'Strategy 2', description: 'Test', category: 'arbitrage' },
];

// Route helpers
async function mockCommonRoutes(page: Page) {
  // Use central mock helper; it handles strategies, status, and specific POSTs
  await mockApiRoutes(page);
}

test.describe('Bot Control Panel', () => {
  test.beforeEach(async ({ page }) => {
    isRunning = false;
    // Log browser console and network to test output for debugging
    page.on('console', (msg) => console.log(`[browser:${msg.type()}]`, msg.text()));
    page.on('requestfailed', (req) => console.log(`[requestfailed] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`));
    page.on('response', async (res) => {
      const url = res.url();
      const status = res.status();
      if (
        url.includes('/api/') ||
        url.includes('/bot/') ||
        url.includes('/strategies') ||
        url.includes('/activity/') ||
        url.includes('/logs')
      ) {
        console.log(`[response] ${status} ${url}`);
        if (status >= 400) {
          try { console.log('[response-body]', await res.text()); } catch {}
        }
      }
    });
    if (!useRealApi) {
      await mockCommonRoutes(page);
    }
  });

  // Negative-path: start failure shows error and keeps status stopped
  test('shows error toast when starting the bot fails', async ({ page }) => {
    await page.goto('/');

    // Ensure initial stopped state
    await expect(page.getByTestId('status-text')).toHaveText(/stopped/i);

    // Force start API to fail
    await page.route(/\/api\/bot\/start$/, async (route) => {
      await route.fulfill({ status: 500, body: JSON.stringify({ success: false, message: 'start failed' }), headers: { 'Content-Type': 'application/json' } });
    });

    // Select a strategy and attempt start
    await page.getByTestId('strategy-select').click();
    await page.getByTestId('strategy-item-strat-1').click();

    const startBtn = (await page.getByTestId('bot-start').count()) > 0
      ? page.getByTestId('bot-start')
      : page.getByRole('button', { name: /start bot/i });
    await startBtn.click();

    // Expect error toast and status unchanged
    await expect(page.getByTestId('toast-error')).toBeVisible();
    await expect(page.getByTestId('status-text')).toHaveText(/stopped/i);
  });

  // Negative-path: stop network error shows error and keeps status running
  test('handles network error when stopping the bot', async ({ page }) => {
    await page.goto('/');

    // Bring bot to running state via normal start
    await page.getByTestId('strategy-select').click();
    await page.getByTestId('strategy-item-strat-1').click();
    const startWait = page.waitForResponse((r) => r.url().includes('/bot/start') && r.request().method() === 'POST');
    const startBtn = (await page.getByTestId('bot-start').count()) > 0
      ? page.getByTestId('bot-start')
      : page.getByRole('button', { name: /start bot/i });
    await startBtn.click();
    await startWait;
    await expect(page.getByTestId('status-text')).toHaveText(/running/i);

    // Abort stop request to simulate network error
    await page.route(/\/api\/bot\/stop$/, async (route) => {
      await route.abort('failed');
    });

    const stopBtn = (await page.getByTestId('bot-stop').count()) > 0
      ? page.getByTestId('bot-stop')
      : page.getByRole('button', { name: /stop bot/i });
    await stopBtn.click();

    // Expect error toast and status remains running
    await expect(page.getByTestId('toast-error')).toBeVisible();
    await expect(page.getByTestId('status-text')).toHaveText(/running/i);
  });

  test('start and stop the bot updates UI and calls APIs', async ({ page }) => {
    await page.goto('/');

    // Ensure page rendered via stable test id
    await expect(page.getByTestId('strategy-select')).toBeVisible();
    // Initial status should be stopped
    await expect(page.getByTestId('status-text')).toHaveText(/stopped/i);

    // Select a strategy
    await page.getByTestId('strategy-select').click();
    await page.getByTestId('strategy-item-strat-1').click();

    // Start the bot
    const waitStart = page.waitForResponse((r) => r.url().includes('/bot/start') && r.request().method() === 'POST');
    // Prefer test id, but fall back to role if missing
    const startBtnTestId = page.getByTestId('bot-start');
    const startBtn = (await startBtnTestId.count()) > 0
      ? startBtnTestId
      : page.getByRole('button', { name: /start bot/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    const startResp = await waitStart;
    expect(startResp.ok()).toBeTruthy();

    // Toast should appear (stable selector)
    await expect(page.getByTestId('toast-success')).toBeVisible();

    // Status should reflect running
    await expect(page.getByTestId('status-text')).toHaveText(/running/i);

    // Stop the bot
    const waitStop = page.waitForResponse((r) => r.url().includes('/bot/stop') && r.request().method() === 'POST');
    // Prefer test id, but fall back to role if missing
    const stopBtnTestId = page.getByTestId('bot-stop');
    const stopBtn = (await stopBtnTestId.count()) > 0
      ? stopBtnTestId
      : page.getByRole('button', { name: /stop bot/i });
    await expect(stopBtn).toBeVisible();
    await stopBtn.click();
    const stopResp = await waitStop;
    expect(stopResp.ok()).toBeTruthy();

    // Toast should appear (stable selector)
    await expect(page.getByTestId('toast-success')).toBeVisible();
    await expect(page.getByTestId('status-text')).toHaveText(/stopped/i);
  });

  test('update configuration posts to API', async ({ page }) => {
    await page.goto('/');

    // Change max position size and save
    const maxInput = page.locator('#maxPositionSize');
    await expect(maxInput).toBeVisible();
    await maxInput.fill('2500');
    const waitConfig = page.waitForResponse((res) => res.url().includes('/bot/config') && res.request().method() === 'POST');
    await page.getByTestId('bot-save-config').click();
    const resp = await waitConfig;
    expect(resp.ok()).toBeTruthy();

    // Toast confirms (stable selector)
    await expect(page.getByTestId('toast-success')).toBeVisible();
  });
});
