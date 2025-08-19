from __future__ import annotations
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.settings import settings
from app.ratelimit import _reset_rate_limits_for_tests

client = TestClient(app)


@pytest.fixture(autouse=True)
def _setup():
    # ensure dev stage and reset limiter
    settings.STAGE = "dev"
    _reset_rate_limits_for_tests()
    yield
    _reset_rate_limits_for_tests()


def test_rate_limit_blocks_after_threshold():
    settings.RATE_LIMIT_CONTROL_PER_MIN = 2
    # First two should pass
    r1 = client.post("/api/bot/pause")
    r2 = client.post("/api/bot/pause")
    assert r1.status_code == 200
    assert r2.status_code == 200
    # Third exceeds
    r3 = client.post("/api/bot/pause")
    assert r3.status_code == 429
