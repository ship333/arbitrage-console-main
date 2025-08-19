# Deployment Guide

This document outlines how to configure environments and deploy the Trading Dashboard.

## Environments

Set Vite env variables via your hosting provider or a `.env` file.

- `VITE_API_URL` (required in staging/prod)
  - Example: `https://api.yourdomain.com/api`
- `VITE_WS_URL` (optional)
  - Example: `wss://api.yourdomain.com`
  - If omitted, frontend derives from `VITE_API_URL` or page origin.
- `VITE_DISABLE_WS` (optional)
  - `1` disables WebSocket features (tests/staging hardening).
  - `0` enables WebSocket (recommended in prod).
- `VITE_REQUIRE_AUTH` (optional)
  - `1` enables minimal auth gating; users must provide a token on `/login`.
  - `0` disables gating.

Advanced (optional):
- `VITE_WS_PING_MS`, `VITE_WS_PONG_TIMEOUT_MS`, `VITE_WS_BACKOFF_BASE_MS`, `VITE_WS_BACKOFF_MAX_MS`, `VITE_DEBUG_WS`, `VITE_WS_BADGE_DISCONNECT_SECS`

## Backend Requirements

Backend must implement the REST/WS contracts in `docs/api-contracts.md` and support CORS/TLS and optional Bearer token auth.

- CORS: allow the frontend origin. If using cookies, configure `credentials` and `SameSite` appropriately.
- TLS: required for production.
- Health checks: expose `/api/health` for CI/CD smoke.

## Staging

1. Deploy backend to staging (e.g., `staging-api.yourdomain.com`).
2. Deploy frontend with env:
   - `VITE_API_URL=https://staging-api.yourdomain.com/api`
   - `VITE_WS_URL=wss://staging-api.yourdomain.com` (optional)
   - `VITE_DISABLE_WS=1` initially, then switch to `0` after WS validation
   - `VITE_REQUIRE_AUTH=1`
3. Smoke tests:
   - Visit `/login`, paste token; verify Bot Control: Start/Stop and Config save.
   - Check logs and activity load. Toggle WS: set `VITE_DISABLE_WS=0` and verify live updates.

## Production

1. Confirm API parity with `docs/api-contracts.md`.
2. Enable WS:
   - `VITE_DISABLE_WS=0`
   - Set `VITE_WS_URL` if API and WS are served on non-standard host/port.
3. Set `VITE_REQUIRE_AUTH=1` (recommended) and use a valid token provisioning flow.
4. Deploy frontend. Verify:
   - Start/Stop flow works.
   - Config saves and persists.
   - Live feed updates via WS; dashboard latency/spreads/liquidity/opportunities reflect latest data.

## CI/CD

- Build: `npm run build`
- E2E (mocked): `npx playwright test`
- Optional smoke against staging (real API): set `PW_REAL_API=1` and point the app to staging API.

## Local development and testing

### Start backend locally (FastAPI)

From `backend/`:

```bash
python -m venv .venv
. .venv/bin/activate              # Windows PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r requirements.txt   # if present
python -m uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload --log-level debug
```

Health check: `curl http://127.0.0.1:8080/api/health`

### Run E2E against live backend (HTTP only)

```bash
VITE_API_URL=http://127.0.0.1:8080/api \
VITE_DISABLE_WS=1 \
PW_REAL_API=1 \
npx playwright test -c playwright.config.ts --reporter=line
```

Windows PowerShell equivalent:

```powershell
$env:VITE_API_URL='http://127.0.0.1:8080/api'
$env:VITE_DISABLE_WS='1'
$env:PW_REAL_API='1'
npx playwright test -c playwright.config.ts --reporter=line
```

### Run E2E with WebSocket enabled

- One-liner (added script):

```bash
npm run e2e:ws-on
```

- Or explicit env (Linux/macOS):

```bash
VITE_API_URL=http://127.0.0.1:8080/api \
VITE_WS_URL=ws://127.0.0.1:8080 \
VITE_DISABLE_WS=0 \
PW_REAL_API=1 \
npx playwright test -c playwright.config.ts --reporter=line
```

Windows PowerShell equivalent:

```powershell
$env:VITE_API_URL='http://127.0.0.1:8080/api'
$env:VITE_WS_URL='ws://127.0.0.1:8080'
$env:VITE_DISABLE_WS='0'
$env:PW_REAL_API='1'
npx playwright test -c playwright.config.ts --reporter=line
```

Note: The Playwright config disables preview server reuse to ensure env updates (WS on/off) apply per run. You can override preview port with `PW_PORT` if needed.

## CI example (GitHub Actions)

This job builds the app, starts the FastAPI backend, then runs E2E twice: first with WS disabled, then with WS enabled.

```yaml
name: E2E

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install frontend deps
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start backend (FastAPI)
        working-directory: backend
        run: |
          python -m venv .venv
          . .venv/bin/activate
          python -m pip install -U pip
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
          nohup python -m uvicorn app.main:app --host 127.0.0.1 --port 8080 --log-level info &

      - name: Wait for backend health
        run: |
          for i in {1..60}; do
            curl -fsS http://127.0.0.1:8080/api/health && exit 0
            sleep 1
          done
          echo "Backend failed to become healthy" >&2
          exit 1

      - name: Build frontend
        run: npm run build

      - name: E2E (WS off)
        env:
          PW_REAL_API: '1'
          VITE_API_URL: 'http://127.0.0.1:8080/api'
          VITE_DISABLE_WS: '1'
        run: npx playwright test -c playwright.config.ts --reporter=line

      - name: E2E (WS on)
        env:
          PW_REAL_API: '1'
          VITE_API_URL: 'http://127.0.0.1:8080/api'
          VITE_WS_URL: 'ws://127.0.0.1:8080'
          VITE_DISABLE_WS: '0'
        run: npx playwright test -c playwright.config.ts --reporter=line
```

## Bundle optimization (vendor chunking and lazy loading)

We split large vendor libraries into separate chunks and lazy-load heavy routes/components to improve initial load and cacheability.

- __Vendor chunks__: configured in `vite.config.ts` via `build.rollupOptions.output.manualChunks`.
  - Chunks include: `vendor-react`, `vendor-recharts`, `vendor-axios`, `vendor-icons`, `vendor-query`.
  - This keeps the main app bundle smaller and allows long-term caching of rarely changing vendor code.
- __Lazy-loaded heavy UI__: charts and backtest views import Recharts only when needed.
  - `src/components/charts/BacktestsLineChart.tsx` encapsulates Recharts.
  - `src/components/tabs/BacktestsTab.tsx` lazy-loads `BacktestsLineChart` with `React.lazy` and `Suspense`.
  - `src/pages/BacktestsPage.tsx` and `src/pages/Activity.tsx` lazy-load their heavy tabs/visualizations.
- __Contributor tips__:
  - Avoid top-level imports of large libs (e.g., `recharts`) in pages; wrap them in dedicated components and lazy-load.
  - If adding new heavy dependencies, consider creating a dedicated vendor chunk via `manualChunks`.
  - Validate bundle after changes with `npm run build` and inspect generated chunks.

## Caching

- Static assets can be cached aggressively with cache-busting file names.
- Avoid caching the HTML aggressively to allow config changes to propagate.
