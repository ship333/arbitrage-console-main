# FastAPI Backend (Demo Parity)

Implements the API needed by the React + Vite dashboard with in-memory state and mock data.

## Endpoints (all under `/api`)

- Bot: `/bot/status`, `/bot/start`, `/bot/stop`, `/bot/config`, `/bot/logs`
- Strategies: `/strategies` (list/create), `/strategies/{id}` (get/update/delete)
- Activity: `/activity/trades`, `/activity/trades/stream` (SSE)
- Metrics: `/metrics`
- Logs: `/logs`, `/logs/export`
- WebSocket: `/api/ws?topic=market`
- Health: `/health`

## Dev setup (Windows PowerShell)

```powershell
# From backend/ directory
python -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\python -m pip install -r requirements.txt

# Configure env
Copy-Item .env.example .env -Force

# Run API (http://localhost:8080)
.\.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

## Frontend E2E against this backend

Playwright config passes Vite env to the preview server. Default points to `http://localhost:8080/api` and disables WS by default.

- WS disabled (HTTP fallback):
```powershell
# From project root (arbitrage-console-main/)
$env:VITE_API_URL = 'http://localhost:8080/api'
$env:VITE_DISABLE_WS = '1'
$env:PW_REAL_API = '1'
$env:VITE_REQUIRE_AUTH = '0'
npx playwright test
```

- WS enabled:
```powershell
$env:VITE_API_URL = 'http://localhost:8080/api'
$env:VITE_DISABLE_WS = '0'
$env:PW_REAL_API = '1'
$env:VITE_REQUIRE_AUTH = '0'
npx playwright test
```

## Live streaming via hyperliquid_bot

The WebSocket endpoint `/api/ws` streams two message types:
- `{"type":"liveStatus", ...}` from `ws_status.json`
- `{"type":"quotes", "rows":[...], "count":N}` from NDJSON lines tagged with `{ type: 'quote', ... }`

These files are produced by the Hyperliquid bot Node live collector. To enable it:

1) Prepare environment
- Copy env and set path to your Hyperliquid project
```powershell
# From backend/ directory
Copy-Item .env.example .env -Force
# Edit .env and set
#   HLIQ_BOT_PATH=C:\Users\16782\CascadeProjects\hyperliquid_bot
#   HLIQ_NODE_COLLECTOR=1
# Optional overrides
#   HLIQ_NODE_NDJSON_DIR=data
#   HLIQ_NODE_COLLECTOR_CMD=npm run -s live:collect
```

- Install Node deps once in the Hyperliquid project
```powershell
# From hyperliquid_bot/
npm install
```

2) Start the FastAPI backend (spawns Node collector)
```powershell
# From backend/
.\.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```
You should see `node|` logs indicating the collector is running. By default it operates in `poll` mode and writes NDJSON under `<HLIQ_BOT_PATH>\data`.

3) Run the Hyperliquid frontend (optional, for local UI)
The Vite dev server proxies `/api` (including WS) to `http://localhost:8080`.
```powershell
# From hyperliquid_bot/frontend/
npm install
npm run dev
# Open http://localhost:3000 and the dashboard will connect to ws://localhost:3000/api/ws?topic=all
```

Notes
- All variables from backend `.env` are inherited by the Node collector process.
- If you enable backend auth (`REQUIRE_AUTH=1`), pass a token to the frontend WS via `VITE_WS_TOKEN` so it appends `?token=...` to `/api/ws`.
- To drive block-triggered ticks, set `LIVE_TRIGGER_MODE=blocks` and configure `ALCHEMY_WS_URL` in the Hyperliquid project env.

## Notes
- CORS allows http://localhost:5173 and http://localhost:4173 (Vite dev/preview).
- Auth: accepts Bearer token header or cookies; no validation in demo.
- Data is in-memory; server restart resets state.
