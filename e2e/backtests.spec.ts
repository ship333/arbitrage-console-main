/// <reference types="@playwright/test" />
/// <reference types="node" />
import { test, expect } from './fixtures';

const pairs = ['HYPE-kHYPE', 'uETH-HYPE', 'uBTC-HYPE'];

function makeBacktest(pair: string) {
  const now = Date.now();
  return [{
    id: `${pair}-bt-1`,
    pair,
    startTime: new Date(now - 7 * 24 * 3600 * 1000).toISOString(),
    endTime: new Date(now).toISOString(),
    metrics: {
      expectedValue: 123.45,
      realizedValue: 110.11,
      slippage: 0.42,
      winRate: 0.61,
      totalTrades: 42,
      profitFactor: 1.8,
    },
    timeseries: Array.from({ length: 20 }, (_, i) => ({
      timestamp: new Date(now - (20 - i) * 3600 * 1000).toISOString(),
      ev: 100 + i * 2,
      realized: 95 + i * 1.8,
      slippage: 0.4,
    })),
  }];
}

test.describe('Backtests page rendering', () => {
  test.beforeEach(async ({ page }) => {
    const useRealApi = process.env.PW_REAL_API === '1';
    if (!useRealApi) {
      for (const pair of pairs) {
        await page.route(`**/api/backtests/${encodeURIComponent(pair)}`, (route) =>
          route.fulfill({ json: makeBacktest(pair) })
        );
      }
    }
  });

  test('loads metrics and chart for approved pairs', async ({ page }) => {
    await page.goto('/backtests');
    await expect(page.getByRole('heading', { level: 1, name: /backtests/i })).toBeVisible();

    // Verify at least one metrics block renders (scope to first match to satisfy strict mode)
    await expect(page.getByText(/expected value/i).first()).toBeVisible();
    await expect(page.getByText(/realized value/i).first()).toBeVisible();
    await expect(page.getByText(/win rate/i).first()).toBeVisible();

    // Ensure at least one chart is rendered (Recharts renders SVG)
    const svgs = page.locator('svg');
    await expect(svgs.first()).toBeVisible();
  });
});
