from __future__ import annotations
import types
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routes import bot as bot_routes
from app.routes import orders as orders_routes
from app import exchange_client as exchange_client_module
from app.settings import settings

@pytest.fixture()
def http_client(_reset_state_and_settings):
    # Create TestClient after monkeypatches applied to ensure patched modules are used
    with TestClient(app) as c:
        yield c


class _FakeExchangeClient:
    async def place_order(self, symbol: str, side: str, qty: float, price=None, type_=None, **kwargs):
        effective_type = type_ if type_ is not None else kwargs.get("type")
        return {"id": "abc123", "symbol": symbol, "side": side, "qty": qty, "type": effective_type, "price": price}


@pytest.fixture(autouse=True)
def _reset_state_and_settings(monkeypatch):
    # Reset kill switch and running state
    bot_routes.STATE["killSwitch"] = False
    bot_routes.STATE["isRunning"] = False
    # Set permissive rate limit for tests
    settings.RATE_LIMIT_CONTROL_PER_MIN = 1000
    # Use dev stage (no secret validation)
    settings.STAGE = "dev"
    # Monkeypatch exchange client at the module-level function used by the route
    monkeypatch.setattr(exchange_client_module, "get_exchange_client", lambda: _FakeExchangeClient(), raising=False)
    # Replace the ExchangeClient class entirely to guarantee any new instance is fake
    monkeypatch.setattr(exchange_client_module, "ExchangeClient", _FakeExchangeClient, raising=False)
    monkeypatch.setattr(orders_routes.exchange_client, "ExchangeClient", _FakeExchangeClient, raising=False)
    # And patch on the exact module object imported by orders route
    monkeypatch.setattr(orders_routes.exchange_client, "get_exchange_client", lambda: _FakeExchangeClient(), raising=False)
    # Also ensure the exchange client singleton returns the fake (belt-and-suspenders)
    monkeypatch.setattr(exchange_client_module, "_client_singleton", _FakeExchangeClient(), raising=False)
    # Quick sanity checks that our patches are in effect
    assert isinstance(exchange_client_module.get_exchange_client(), _FakeExchangeClient)
    assert isinstance(orders_routes.exchange_client.get_exchange_client(), _FakeExchangeClient)
    yield


def test_order_rejected_by_risk(http_client):
    payload = {
        "symbol": "BTC-USD",
        "side": "buy",
        "qty": 0.1,
        "type": "market",
        # risk inputs deliberately failing
        "notionalUsd": settings.MAX_NOTIONAL_PER_TRADE_USD * 10,
        "slippageBps": 0,
        "orderbookLiquidityUsd": 1e9,
    }
    r = http_client.post("/api/orders/place", json=payload)
    assert r.status_code == 400
    assert "risk check failed" in r.text


def test_order_blocked_by_kill_switch(http_client):
    bot_routes.STATE["killSwitch"] = True
    payload = {
        "symbol": "ETH-USD",
        "side": "sell",
        "qty": 1,
        "type": "market",
        "notionalUsd": 100,
        "slippageBps": 1,
        "orderbookLiquidityUsd": 1_000_000,
    }
    r = http_client.post("/api/orders/place", json=payload)
    assert r.status_code == 423


def test_order_success_when_risk_ok_and_kill_switch_off(http_client):
    payload = {
        "symbol": "ETH-USD",
        "side": "buy",
        "qty": 1,
        "type": "limit",
        "price": 2500.0,
        "notionalUsd": 100,
        "slippageBps": 5,
        "orderbookLiquidityUsd": 1_000_000,
    }
    r = http_client.post("/api/orders/place", json=payload)
    if r.status_code != 200:
        print("DEBUG orders/place failure:", r.status_code, r.text)
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert data.get("order", {}).get("symbol") == "ETH-USD"
