from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import time
import uuid
import os
import json
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from .settings import settings
from .routes import bot as bot_routes
from .routes import strategies as strategies_routes
from .routes import activity as activity_routes
from .routes import metrics as metrics_routes
from .routes import logs as logs_routes
from .routes import backtests as backtests_routes
from .routes import live as live_routes
from .routes import risk as risk_routes
from .routes import orders as orders_routes
from . import ws as ws_module
from . import db
from .auth import require_auth
from . import hyperliquid_live

# Prometheus metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5),
    labelnames=["method", "path"],
)

# Dedicated request logger (avoid uvicorn's AccessFormatter expectations)
REQUEST_LOGGER = logging.getLogger("app.request")
REQUEST_LOGGER.propagate = False
if not REQUEST_LOGGER.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("%(message)s"))
    REQUEST_LOGGER.addHandler(_h)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if not settings.DEBUG:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
            response.headers.setdefault("X-Content-Type-Options", "nosniff")
            response.headers.setdefault("X-Frame-Options", "DENY")
            response.headers.setdefault("Referrer-Policy", "no-referrer")
            response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
            response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")
        return response


class RequestMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        req_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        # attach request id
        request.state.request_id = req_id
        try:
            response: Response = await call_next(request)
        except Exception as e:
            duration = time.time() - start
            REQUEST_LATENCY.labels(request.method, request.url.path).observe(duration)
            REQUEST_COUNT.labels(request.method, request.url.path, "500").inc()
            logger = logging.getLogger("uvicorn.error")
            logger.error("%s", {
                "event": "request_error",
                "request_id": req_id,
                "method": request.method,
                "path": request.url.path,
                "duration_ms": int(duration * 1000),
                "error": str(e),
            })
            raise
        duration = time.time() - start
        # metrics
        REQUEST_LATENCY.labels(request.method, request.url.path).observe(duration)
        REQUEST_COUNT.labels(request.method, request.url.path, str(response.status_code)).inc()
        # response headers and access log
        response.headers.setdefault("X-Request-Id", req_id)
        REQUEST_LOGGER.info(json.dumps({
            "event": "request",
            "request_id": req_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": int(duration * 1000),
        }))
        return response

app = FastAPI(title="Trading Dashboard API", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Security middlewares in production
if not settings.DEBUG:
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(HTTPSRedirectMiddleware)
    if settings.ALLOWED_HOSTS:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

# Request metrics and logging
app.add_middleware(RequestMetricsMiddleware)

# Routers (all are already under /api prefixes inside modules)
# Apply auth dependency to REST routers; WS and health are handled separately
app.include_router(bot_routes.router, dependencies=[Depends(require_auth)])
app.include_router(strategies_routes.router, dependencies=[Depends(require_auth)])
app.include_router(activity_routes.router, dependencies=[Depends(require_auth)])
app.include_router(metrics_routes.router, dependencies=[Depends(require_auth)])
app.include_router(logs_routes.router, dependencies=[Depends(require_auth)])
app.include_router(backtests_routes.router, dependencies=[Depends(require_auth)])
app.include_router(live_routes.router, dependencies=[Depends(require_auth)])
app.include_router(risk_routes.router, dependencies=[Depends(require_auth)])
app.include_router(orders_routes.router, dependencies=[Depends(require_auth)])
app.include_router(ws_module.router)

# ---------------------------------------------------------------------------
# Legacy compatibility: expose all routers under /api/v1/* to match older
# frontend builds that still reference the v1 prefix (e.g. /api/v1/bot/*).
# This section can be removed once all consumers migrate to /api/* paths.
# ---------------------------------------------------------------------------
for _r in [
    bot_routes,
    strategies_routes,
    activity_routes,
    metrics_routes,
    logs_routes,
    backtests_routes,
    live_routes,
    risk_routes,
    orders_routes,
]:
    app.include_router(_r.router, prefix="/api/v1", dependencies=[Depends(require_auth)])

# Startup: show parsed CORS origins; load auth tokens from file; validate config
@app.on_event("startup")
async def _log_settings():
    logger = logging.getLogger("uvicorn.error")
    logger.info("Parsed CORS_ORIGINS: %s", settings.CORS_ORIGINS)
    # Load tokens from file if provided
    if settings.AUTH_TOKENS_FILE:
        try:
            if os.path.isfile(settings.AUTH_TOKENS_FILE):
                with open(settings.AUTH_TOKENS_FILE, "r", encoding="utf-8") as f:
                    toks = [ln.strip() for ln in f.readlines() if ln.strip()]
                if toks:
                    settings.AUTH_TOKENS = toks
                    logger.info("Loaded %d auth tokens from file", len(toks))
        except Exception as e:
            logger.warning("Failed to load AUTH_TOKENS_FILE: %s", str(e))
    # Validate auth config in non-dev
    if settings.REQUIRE_AUTH and settings.STAGE != "dev" and not settings.AUTH_TOKENS:
        logger.error("REQUIRE_AUTH=1 but no AUTH_TOKENS configured; failing startup")
        raise SystemExit(1)
    # Load exchange secrets from files if provided
    try:
        if settings.EXCHANGE_API_KEY_FILE and os.path.isfile(settings.EXCHANGE_API_KEY_FILE):
            with open(settings.EXCHANGE_API_KEY_FILE, "r", encoding="utf-8") as f:
                settings.EXCHANGE_API_KEY = f.read().strip()
        if settings.EXCHANGE_API_SECRET_FILE and os.path.isfile(settings.EXCHANGE_API_SECRET_FILE):
            with open(settings.EXCHANGE_API_SECRET_FILE, "r", encoding="utf-8") as f:
                settings.EXCHANGE_API_SECRET = f.read().strip()
    except Exception as e:
        logger.warning("Failed to load exchange secrets: %s", str(e))
    # Validate exchange secrets in non-dev
    if settings.STAGE != "dev":
        if not settings.EXCHANGE_API_KEY or not settings.EXCHANGE_API_SECRET:
            logger.error("Missing EXCHANGE_API_KEY/SECRET in stage=%s; failing startup", settings.STAGE)
            raise SystemExit(1)
    # Stage-based risk defaults (basic example)
    if settings.STAGE == "staging":
        # more conservative defaults
        from .routes.risk import RISK_LIMITS
        RISK_LIMITS["maxNotionalPerTradeUsd"] = min(float(RISK_LIMITS["maxNotionalPerTradeUsd"]), 1000.0)
        RISK_LIMITS["maxSlippageBps"] = min(float(RISK_LIMITS["maxSlippageBps"]), 30.0)
    elif settings.STAGE == "prod":
        from .routes.risk import RISK_LIMITS
        RISK_LIMITS["maxNotionalPerTradeUsd"] = min(float(RISK_LIMITS["maxNotionalPerTradeUsd"]), 5000.0)
        RISK_LIMITS["maxSlippageBps"] = min(float(RISK_LIMITS["maxSlippageBps"]), 20.0)
    # Initialize DB pool if configured
    try:
        await db.init_pool()
    except Exception as e:
        logger = logging.getLogger("uvicorn.error")
        logger.warning("DB pool init error: %s", e)

@app.on_event("shutdown")
async def _shutdown():
    try:
        # Stop live controller if running
        try:
            await hyperliquid_live.stop()
        except Exception:
            pass
        await db.close_pool()
    except Exception:
        pass

# Health
@app.get("/api/health")
async def health():
    return {"ok": True}

# Prometheus metrics endpoint
@app.get("/metrics")
async def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
