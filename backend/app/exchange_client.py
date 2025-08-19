from __future__ import annotations
import asyncio
import random
import time
from typing import Any, Dict, Optional

import httpx
from prometheus_client import Counter, Gauge

from .settings import settings

# Prometheus metrics
EXCHANGE_REQUESTS = Counter(
    "exchange_requests_total",
    "Total exchange API requests",
    ["operation", "status"],
)
CIRCUIT_OPEN = Gauge(
    "exchange_circuit_breaker_open",
    "Circuit breaker open state (1=open, 0=closed)",
)


class CircuitBreaker:
    def __init__(self, fail_threshold: int = 5, open_cooldown_sec: int = 30):
        self.fail_threshold = fail_threshold
        self.open_cooldown_sec = open_cooldown_sec
        self._state = "closed"  # closed | open | half_open
        self._fail_count = 0
        self._opened_at: Optional[float] = None
        CIRCUIT_OPEN.set(0)

    def allow_request(self) -> bool:
        if self._state == "closed":
            return True
        if self._state == "open":
            if self._opened_at and (time.time() - self._opened_at) >= self.open_cooldown_sec:
                # allow a probe in half-open
                self._state = "half_open"
                return True
            return False
        if self._state == "half_open":
            # allow a single inflight probe - naive implementation assumes caller serializes
            return True
        return True

    def on_success(self):
        self._fail_count = 0
        self._state = "closed"
        self._opened_at = None
        CIRCUIT_OPEN.set(0)

    def on_failure(self):
        self._fail_count += 1
        if self._state == "half_open":
            # on probe failure -> open
            self._state = "open"
            self._opened_at = time.time()
            CIRCUIT_OPEN.set(1)
            return
        if self._fail_count >= self.fail_threshold:
            self._state = "open"
            self._opened_at = time.time()
            CIRCUIT_OPEN.set(1)

    @property
    def state(self) -> str:
        return self._state


class ExchangeClient:
    def __init__(self, base_url: str, api_key: Optional[str], api_secret: Optional[str]):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.api_secret = api_secret
        # A single async client - lifetime is app lifetime
        self._client = httpx.AsyncClient(timeout=10.0)
        self._cb = CircuitBreaker()
        # Retry/backoff params
        self._max_retries = 4
        self._backoff_base = 0.2
        self._backoff_factor = 2.0
        self._backoff_max = 5.0

    async def _sleep_backoff(self, attempt: int):
        delay = min(self._backoff_base * (self._backoff_factor ** attempt), self._backoff_max)
        # jitter +- 50ms
        delay += random.uniform(0, 0.05)
        await asyncio.sleep(delay)

    def _headers(self) -> Dict[str, str]:
        hdrs: Dict[str, str] = {"User-Agent": "arb-console/0.1"}
        if self.api_key:
            hdrs["X-API-KEY"] = self.api_key
        if self.api_secret:
            hdrs["X-API-SECRET"] = self.api_secret
        return hdrs

    async def _request(self, op: str, method: str, path: str, *, json: Any | None = None, params: Dict[str, Any] | None = None) -> Dict[str, Any]:
        if not self._cb.allow_request():
            EXCHANGE_REQUESTS.labels(op, "circuit_open").inc()
            raise RuntimeError("circuit breaker open")
        url = f"{self.base_url}{path}"
        last_exc: Optional[Exception] = None
        for attempt in range(self._max_retries + 1):
            try:
                resp = await self._client.request(method, url, headers=self._headers(), json=json, params=params)
                if resp.status_code >= 500:
                    raise httpx.HTTPError(f"server error {resp.status_code}")
                data = resp.json()
                self._cb.on_success()
                EXCHANGE_REQUESTS.labels(op, "ok").inc()
                return data
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.HTTPError) as e:
                last_exc = e
                self._cb.on_failure()
                if attempt < self._max_retries:
                    EXCHANGE_REQUESTS.labels(op, "retry").inc()
                    await self._sleep_backoff(attempt)
                    continue
                EXCHANGE_REQUESTS.labels(op, "failed").inc()
        # exhausted
        raise RuntimeError(f"exchange request failed for {op}: {last_exc}")

    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        return await self._request("get_ticker", "GET", "/ticker", params={"symbol": symbol})

    async def place_order(self, symbol: str, side: str, qty: float, price: Optional[float] = None, type_: str = "market") -> Dict[str, Any]:
        payload = {
            "symbol": symbol,
            "side": side,
            "qty": qty,
            "type": type_,
        }
        if price is not None:
            payload["price"] = price
        return await self._request("place_order", "POST", "/orders", json=payload)


_client_singleton: Optional[ExchangeClient] = None


def get_exchange_client() -> ExchangeClient:
    global _client_singleton
    if _client_singleton is None:
        _client_singleton = ExchangeClient(
            base_url=settings.EXCHANGE_BASE_URL,
            api_key=settings.EXCHANGE_API_KEY,
            api_secret=settings.EXCHANGE_API_SECRET,
        )
    return _client_singleton
