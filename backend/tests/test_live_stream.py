from __future__ import annotations
import json
import os
import tempfile
import time
from datetime import datetime
from typing import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.settings import settings


@pytest.fixture()
def temp_data_dir() -> Iterator[str]:
    d = tempfile.mkdtemp(prefix="hliqlive_")
    data_dir = os.path.join(d, "data")
    os.makedirs(data_dir, exist_ok=True)
    yield d
    try:
        # best-effort cleanup
        for root, dirs, files in os.walk(d, topdown=False):
            for name in files:
                try:
                    os.remove(os.path.join(root, name))
                except Exception:
                    pass
            for name in dirs:
                try:
                    os.rmdir(os.path.join(root, name))
                except Exception:
                    pass
        os.rmdir(d)
    except Exception:
        pass


@pytest.fixture(autouse=True)
def _base_settings_patch():
    # Ensure tests run in dev mode with auth disabled
    settings.STAGE = "dev"
    settings.REQUIRE_AUTH = False
    # Faster WS loop if desired
    settings.WS_BROADCAST_INTERVAL = 1
    settings.WS_PING_INTERVAL_MS = 2000
    settings.WS_PONG_TIMEOUT_MS = 2000
    yield


def _write_status(root: str, status: dict):
    data_dir = os.path.join(root, settings.HLIQ_NODE_NDJSON_DIR or "data")
    os.makedirs(data_dir, exist_ok=True)
    sp = os.path.join(data_dir, "ws_status.json")
    with open(sp, "w", encoding="utf-8") as f:
        json.dump(status, f)


def _write_ndjson_today(root: str, rows: list[dict]):
    d = datetime.utcnow()
    fname = f"live_{d.year:04d}{d.month:02d}{d.day:02d}.ndjson"
    data_dir = os.path.join(root, settings.HLIQ_NODE_NDJSON_DIR or "data")
    os.makedirs(data_dir, exist_ok=True)
    fp = os.path.join(data_dir, fname)
    with open(fp, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    return fp


def test_live_status_no_file_returns_null():
    with TestClient(app) as c:
        r = c.get("/api/live/status")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") is None


def test_live_status_with_file(temp_data_dir: str, monkeypatch):
    # Point backend to our temp hyperliquid project root
    settings.HLIQ_BOT_PATH = temp_data_dir
    settings.HLIQ_NODE_NDJSON_DIR = "data"
    # Write a status file
    payload = {"running": True, "pairs": ["UBTC/WHYPE"]}
    _write_status(temp_data_dir, payload)

    with TestClient(app) as c:
        r = c.get("/api/live/status")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == payload
        assert data.get("file") == "ws_status.json"


def test_live_quotes_and_top_spread(temp_data_dir: str, monkeypatch):
    settings.HLIQ_BOT_PATH = temp_data_dir
    settings.HLIQ_NODE_NDJSON_DIR = "data"
    # Simplify fees/haircut for deterministic spread
    settings.LIVE_HAIRCUT_BPS = 0.0
    settings.FEE_BPS_HYPERSWAP = 0.0
    settings.FEE_BPS_PRJX = 0.0
    settings.FEE_BPS_HYBRA = 0.0

    now_ms = int(time.time() * 1000)
    rows = [
        {"type": "quote", "venue": "HYPERSWAP", "mid": 100.0, "ts": now_ms},
        {"type": "quote", "venue": "PRJX", "mid": 105.0, "ts": now_ms},
    ]
    fp = _write_ndjson_today(temp_data_dir, rows)

    with TestClient(app) as c:
        r = c.get("/api/live/quotes?limit=10")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data.get("items"), list)
        # live REST endpoint doesn't filter by type, just venue/mid presence, so expect 2
        assert len(data["items"]) >= 2
        assert data.get("file") and data["file"].startswith("live_")

        r2 = c.get("/api/live/top-spread?lookback_ms=5000")
        assert r2.status_code == 200
        top = r2.json().get("top")
        assert top is not None
        assert top["buyVenue"] == "HYPERSWAP"
        assert top["sellVenue"] == "PRJX"
        assert float(top["spreadBps"]) > 0


def test_ws_stream_status_and_quotes(temp_data_dir: str):
    settings.HLIQ_BOT_PATH = temp_data_dir
    settings.HLIQ_NODE_NDJSON_DIR = "data"
    # Prepare files consumed by WS loop
    _write_status(temp_data_dir, {"running": True})
    now_ms = int(time.time() * 1000)
    _write_ndjson_today(temp_data_dir, [
        {"type": "quote", "venue": "HYPERSWAP", "mid": 100.0, "ts": now_ms}
    ])

    with TestClient(app) as c:
        with c.websocket_connect("/api/ws?topic=all") as ws:
            got_status = False
            got_quotes = False
            # Read a few frames and respond to pings
            for _ in range(10):
                msg = ws.receive_text()
                data = json.loads(msg)
                typ = data.get("type")
                if typ == "liveStatus":
                    got_status = True
                    assert isinstance(data.get("status"), (dict, type(None)))
                elif typ == "quotes":
                    got_quotes = True
                    assert data.get("count", 0) >= 1
                elif typ == "ping":
                    ws.send_text(json.dumps({"type": "pong", "ts": datetime.utcnow().isoformat()+"Z"}))
                if got_status and got_quotes:
                    break
            assert got_status, "did not receive liveStatus frame"
            assert got_quotes, "did not receive quotes batch"
