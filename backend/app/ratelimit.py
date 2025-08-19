from __future__ import annotations
from fastapi import Request, HTTPException, status
from typing import Dict, Tuple
import time
from .settings import settings

# naive in-memory sliding window per identity
_window_counters: Dict[str, Tuple[float, int]] = {}


def _identity_from_request(request: Request) -> str:
    # Prefer auth token when auth is enabled
    auth = request.headers.get("authorization")
    if settings.REQUIRE_AUTH and auth:
        return auth
    # Else use forwarded-for or client host
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return f"ip:{fwd.split(',')[0].strip()}"
    client = request.client.host if request.client else "unknown"
    return f"ip:{client}"


async def rate_limit_control(request: Request):
    limit = int(getattr(settings, "RATE_LIMIT_CONTROL_PER_MIN", 0) or 0)
    if limit <= 0:
        return
    ident = _identity_from_request(request)
    now = time.time()
    window_start, count = _window_counters.get(ident, (now, 0))
    # reset window every 60s
    if now - window_start >= 60:
        window_start, count = now, 0
    count += 1
    _window_counters[ident] = (window_start, count)
    if count > limit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="rate limit exceeded")


def _reset_rate_limits_for_tests():
    """Testing helper to reset counters between tests."""
    _window_counters.clear()
