import { Page, Route } from '@playwright/test';

// Minimal defaults to keep UI rendering and tests stable with low latency
const defaultStrategies = [
  { id: 'strat-1', name: 'Strategy 1', description: 'Default', category: 'arbitrage' },
  { id: 'strat-2', name: 'Strategy 2', description: 'Default', category: 'arbitrage' },
];

let running = false;

export async function mockApiRoutes(page: Page) {
  // reset state per test invocation
  running = false;
  // 1) Register broad route FIRST so specific mocks added after take precedence
  await page.route('**/*', async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;

    // Sensible defaults
    if (path.endsWith('/strategies')) {
      return route.fulfill({ json: defaultStrategies });
    }
    if (path.endsWith('/bot/status')) {
      return route.fulfill({
        json: {
          isRunning: running,
          currentStrategy: running ? 'strat-1' : undefined,
          pnl: 0,
          pnlPercentage: 0,
          tradesCount: 0,
          winRate: 0,
          assets: {},
          lastUpdated: new Date().toISOString(),
          version: 'test',
          exchange: 'TEST',
          quoteCurrency: 'USD',
        },
      });
    }
    if (path.includes('/activity/trades')) {
      return route.fulfill({ json: [] });
    }
    if (path.endsWith('/logs') || path.includes('/logs?')) {
      return route.fulfill({ json: [] });
    }

    // For anything else, allow other more specific handlers to run
    return route.fallback();
  });

  // 2) Specific mocks AFTER catch-all
  await page.route('**/bot/config', async (route: Route) => {
    const body = route.request().postData();
    console.log('[mock:/api/bot/config] body:', body);
    await route.fulfill({ json: { success: true, message: 'ok' } });
  });

  await page.route('**/bot/start', async (route: Route) => {
    const body = route.request().postData();
    console.log('[mock:/api/bot/start] body:', body);
    running = true;
    await route.fulfill({ json: { success: true, message: 'started' } });
  });

  await page.route('**/bot/stop', async (route: Route) => {
    const body = route.request().postData();
    console.log('[mock:/api/bot/stop] body:', body);
    running = false;
    await route.fulfill({ json: { success: true, message: 'stopped' } });
  });
}
