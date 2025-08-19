# API Contracts

This document summarizes the REST API contracts expected by the frontend as defined in `src/lib/api.ts`.

Base URL: `getApiBaseUrl()`

- Production example: `https://api.yourdomain.com/api`
- Local dev (Vite proxy): `/api`

Auth:

- Optional Bearer token header if `localStorage.authToken` is present: `Authorization: Bearer <token>`
- Cookies are sent (`withCredentials: true`) to support cookie-based auth if used.

## Bot Control

### GET /bot/status → 200

```json
{
  "isRunning": boolean,
  "currentStrategy"?: string,
  "strategyParams"?: object,
  "startTime"?: string,
  "tradingEnabled"?: boolean,
  "pnl": number,
  "pnlPercentage": number,
  "tradesCount": number,
  "winRate": number,
  "assets": { [symbol: string]: number },
  "maxPositionSize"?: number,
  "dailyLossLimit"?: number,
  "maxOpenTrades"?: number,
  "stopLoss"?: number,
  "takeProfit"?: number,
  "trailingStop"?: boolean,
  "lastUpdated": string,
  "version": string,
  "exchange": string,
  "quoteCurrency": string
}
```

### POST /bot/start { strategy: string, params: object } → 200/4xx/5xx

```json
{ "success": boolean, "message": string }
```

### POST /bot/stop → 200/4xx/5xx

```json
{ "success": boolean, "message": string }
```

### GET /bot/config → 200
- Arbitrary config object (echoed back by UI). Should include risk/trading config used in Bot Control.

### POST /bot/config (any JSON) → 200/4xx/5xx

```json
{ "success": boolean, "message": string }
```

### GET /bot/logs?limit=100&level=info → 200

```json
[
  {
    "id": string,
    "level": "info" | "warn" | "error" | "debug" | "trace",
    "message": string,
    "timestamp": string,
    "context"?: object,
    "stack"?: string,
    "metadata"?: object
  }
]
```

## Strategies

### GET /strategies → 200

```json
[
  {
    "id": string,
    "name": string,
    "description": string,
    "category": "arbitrage" | "market-making" | "momentum" | "mean-reversion" | "other",
    "parameters": { [param: string]: {
      "type": "number" | "string" | "boolean" | "select",
      "default": any,
      "min"?: number,
      "max"?: number,
      "step"?: number,
      "options"?: Array<{ value: string; label: string }>,
      "label": string,
      "description"?: string,
      "required"?: boolean
    }},
    "createdAt": string,
    "updatedAt": string,
    "isActive": boolean,
    "version": string,
    "tags"?: string[]
  }
]
```

### GET /strategies/:id → 200
- Same shape as a single Strategy

### POST /strategies (Strategy minus id/timestamps) → 201
- Returns created Strategy

### PUT /strategies/:id (partial) → 200
- Returns updated Strategy

### DELETE /strategies/:id → 200

```json
{ "success": boolean }
```

### POST /strategies/:id/backtest { params, startTime, endTime } → 200
- Returns `BacktestResult` (see `src/lib/api.ts` for full metrics/trades fields)

### GET /strategies/:id/metrics?timeframe=24h → 200
- Returns `StrategyMetrics`

## Market

- `GET /market/prices?pairs=A,B&interval=1h&limit=100`
- `GET /market/orderbook/:pair?depth=20`
- `GET /market/trades/:pair?limit=100`
- `GET /market/tickers`
- `GET /market/historical?pair=XYZ&interval=1h&startTime=...&endTime=...`

## Trading

- Account: `GET /trading/balance`, `GET /trading/positions`, `GET /trading/positions/:symbol`
- Orders: `GET /trading/orders`, `GET /trading/orders/:id`, `POST /trading/orders`, `DELETE /trading/orders/:id`, `DELETE /trading/orders?pair=...`
- Trades: `GET /trading/trades` (filters optional), `GET /trading/trades/:id`
- Risk: `GET /trading/risk/limits`, `POST /trading/risk/limits`
- Paper trading: `GET/POST /paper-trading/*`

## Activity

### GET /activity/trades?limit=50 → 200

- Returns `Trade[]`

### SSE /activity/trades/stream → text/event-stream

- Server should stream `Trade` JSON lines as SSE messages. Browser will auto-reconnect.

## Metrics

### GET /metrics → 200

- Returns an object compatible with `useLiveFeed` expectations: `latency`, `spreads`, `liquidity`, `opportunities`, `lastUpdated`.

## WebSocket

- Base URL derived from `getWsBaseUrl()`; frontend calls `getWsUrl('/api/ws?topic=market')`.
- Protocol: JSON messages. Client sends `{ type: 'subscribe', pairs: string[], metrics: string[] }` on open.
- Server should publish updates JSON matching `useLiveFeed` merge contract.
