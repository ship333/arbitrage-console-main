/// <reference types="@playwright/test" />
/// <reference types="node" />
import { test, expect } from '@playwright/test';

// Optional skip if backend websockets are not available
const SKIP_WS = process.env.SKIP_WS_TESTS === '1' || process.env.SKIP_WS_TESTS === 'true';

const metricsPayload = {
  lastUpdated: Date.now(),
  latency: { p50: 25, p95: 80, p99: 150 },
  spreads: { 'BTC-USD': { mid: 65000 } },
  liquidity: { 'BTC-USD': 1_500_000 },
  opportunities: [
    { pair: 'BTC-USD', venue: 'BINANCE', edgeBps: 12.34, size: 25000 },
    { pair: 'ETH-USD', venue: 'COINBASE', edgeBps: 5.67, size: 10000 },
  ],
};

test.describe('Market feed - dashboard status and recent activity', () => {
  test.skip(SKIP_WS, 'Skipping due to SKIP_WS_TESTS flag');

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/metrics', (route) => route.fulfill({ json: metricsPayload }));
    // Backstop other calls the dashboard might make
    await page.route('**/api/strategies', (route) => route.fulfill({ json: [] }));
  });

  test('renders system status and recent activity from metrics', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { level: 1, name: /trading dashboard/i })).toBeVisible();

    // System Status area should show Connected once metrics loads
    await expect(page.getByText('System Status')).toBeVisible();
    await expect(page.getByText('Data Feed')).toBeVisible();
    await expect(page.getByText('Connected')).toBeVisible();

    // Recent Activity should list our mocked opportunities
    await expect(page.getByText('Recent Activity')).toBeVisible();
    await expect(page.getByText('BTC-USD')).toBeVisible();
    await expect(page.getByText('BINANCE')).toBeVisible();
    await expect(page.getByText(/12\.34 bps/)).toBeVisible();
  });
});
