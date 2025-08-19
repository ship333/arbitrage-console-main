from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.settings import settings
from app.routes import bot as bot_routes

client = TestClient(app)


@pytest.fixture(autouse=True)
def _ensure_no_db_and_reset_state():
    # Ensure DB is disabled so audit_log should no-op
    settings.DATABASE_URL = None
    # Reset kill switch and running state between tests
    bot_routes.STATE["killSwitch"] = False
    bot_routes.STATE["isRunning"] = False
    yield


def test_kill_switch_toggle_succeeds_without_db():
    # Toggle ON
    r_on = client.post("/api/bot/kill-switch", json={"enabled": True})
    assert r_on.status_code == 200
    assert r_on.json().get("success") is True
    # Confirm state changed
    r_state = client.get("/api/bot/kill-switch")
    assert r_state.status_code == 200
    assert r_state.json().get("enabled") is True

    # Toggle OFF to clean up
    r_off = client.post("/api/bot/kill-switch", json={"enabled": False})
    assert r_off.status_code == 200
    assert r_off.json().get("success") is True


def test_risk_limits_update_succeeds_without_db():
    # Fetch current limits
    r0 = client.get("/api/trading/risk/limits")
    assert r0.status_code == 200
    limits0 = r0.json()

    # Update one numeric value
    new_bps = float(limits0["maxSlippageBps"]) - 1 if float(limits0["maxSlippageBps"]) > 1 else 1.0
    payload = {"maxSlippageBps": new_bps}

    r_upd = client.post("/api/trading/risk/limits", json=payload)
    assert r_upd.status_code == 200
    assert r_upd.json().get("success") is True

    # Verify change via GET
    r1 = client.get("/api/trading/risk/limits")
    assert r1.status_code == 200
    limits1 = r1.json()
    assert float(limits1["maxSlippageBps"]) == pytest.approx(new_bps)
