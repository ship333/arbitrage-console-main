from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional, Dict

from .settings import settings

try:
    # psycopg3 async pool
    from psycopg_pool import AsyncConnectionPool  # type: ignore
    import psycopg  # type: ignore
except Exception:  # pragma: no cover
    AsyncConnectionPool = None  # type: ignore
    psycopg = None  # type: ignore

_logger = logging.getLogger("uvicorn.error")

_pool: Optional[AsyncConnectionPool] = None


def is_enabled() -> bool:
    return bool(settings.DATABASE_URL) and AsyncConnectionPool is not None


async def init_pool() -> None:
    global _pool
    if not settings.DATABASE_URL:
        _logger.info("DATABASE_URL not set; DB features disabled")
        return
    if AsyncConnectionPool is None:
        _logger.warning("psycopg_pool not available; DB features disabled")
        return
    if _pool is None:
        _logger.info("Initializing DB pool to %s", settings.DATABASE_URL)
        # Min pool size small to reduce overhead in dev
        _pool = AsyncConnectionPool(settings.DATABASE_URL, min_size=1, max_size=5, timeout=10)
        # Test a connection
        try:
            async with _pool.connection() as conn:  # type: ignore
                async with conn.cursor() as cur:  # type: ignore
                    await cur.execute("SELECT 1")
            _logger.info("DB pool initialized")
        except Exception as e:
            _logger.warning("Failed to initialize DB pool: %s", str(e))
            await close_pool()


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        try:
            await _pool.close()  # type: ignore
        finally:
            _pool = None


async def audit_log(
    *,
    actor: Optional[str],
    actor_type: Optional[str],
    action: str,
    resource: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """Insert an audit_log row. No-ops if DB is not configured.

    This function is safe to call from anywhere; if the connection pool isn't available
    it will log a debug message and return without raising.
    """
    if _pool is None:
        # Optionally lazy-init to allow calling without explicit startup ordering
        if is_enabled():
            try:
                await init_pool()
            except Exception as e:  # pragma: no cover
                _logger.debug("audit_log: init_pool failed: %s", e)
                return
        else:
            return

    sql = (
        "INSERT INTO audit_log (actor, actor_type, action, resource, resource_id, details, ip, user_agent) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
    )
    try:
        async with _pool.connection() as conn:  # type: ignore
            async with conn.cursor() as cur:  # type: ignore
                await cur.execute(
                    sql,
                    (
                        actor,
                        actor_type,
                        action,
                        resource,
                        resource_id,
                        details or {},
                        ip,
                        user_agent,
                    ),
                )
    except Exception as e:
        # Don't raise from control paths; just log
        _logger.debug("audit_log insert failed: %s", e)


def mask_token(tok: Optional[str]) -> Optional[str]:
    if not tok:
        return None
    t = tok.strip()
    if not t:
        return None
    # Strip 'Bearer ' if present
    parts = t.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        t = parts[1]
    if len(t) <= 8:
        return f"token:{t}"
    return f"token:{t[:4]}…{t[-4:]}"
