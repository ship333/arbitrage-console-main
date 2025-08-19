from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List, Optional
import os
from pydantic_settings.sources import EnvSettingsSource

class Settings(BaseSettings):
    # Pydantic v2-style config for env file
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",  # tolerate extra env keys intended for child processes (e.g., Node collector)
    )
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]
    CORS_ALLOW_HEADERS: List[str] = ["Authorization", "Content-Type"]
    CORS_ALLOW_METHODS: List[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    # In production, set explicit hosts (e.g., ["api.example.com"]) to enable TrustedHostMiddleware
    ALLOWED_HOSTS: List[str] = []
    HOST: str = "0.0.0.0"
    PORT: int = 8080
    DEBUG: bool = True
    REQUIRE_AUTH: bool = False
    STAGE: str = "dev"  # dev | staging | prod
    # One or more acceptable bearer tokens (for demo). Prefer JWT validation in production.
    AUTH_TOKENS: List[str] = []
    # Optional file containing one token per line. Loaded at startup if present.
    AUTH_TOKENS_FILE: Optional[str] = None
    # WebSocket settings
    WS_BROADCAST_INTERVAL: int = 2
    WS_PING_INTERVAL_MS: int = 15000
    WS_PONG_TIMEOUT_MS: int = 10000
    WS_BACKOFF_BASE_MS: int = 500
    WS_BACKOFF_MAX_MS: int = 15000
    # Exchange API
    EXCHANGE_BASE_URL: str = "https://example-exchange.invalid"
    EXCHANGE_API_KEY: Optional[str] = None
    EXCHANGE_API_SECRET: Optional[str] = None
    EXCHANGE_API_KEY_FILE: Optional[str] = None
    EXCHANGE_API_SECRET_FILE: Optional[str] = None
    # Risk policy defaults (enforced server-side prior to order placement)
    MAX_NOTIONAL_PER_TRADE_USD: float = 10_000.0
    MAX_OPEN_POSITIONS: int = 5
    MAX_DAILY_PNL_DRAWDOWN_USD: float = 2_000.0
    MAX_SLIPPAGE_BPS: float = 50.0
    MIN_ORDERBOOK_LIQUIDITY_USD: float = 100_000.0
    # Rate limiting for control endpoints (per identity per minute). 0 disables.
    RATE_LIMIT_CONTROL_PER_MIN: int = 10
    # Database connection string (optional). Example:
    # postgresql://arbuser:arbpass@localhost:5432/arbdb
    DATABASE_URL: Optional[str] = None
    # Hyperliquid integration toggles
    BACKTEST_USE_HYPERLIQUID: bool = False
    # Absolute path to the hyperliquid_bot project root to import modules from
    HLIQ_BOT_PATH: Optional[str] = None
    # Data file to feed the backtester when integration is enabled
    BACKTEST_DATA_FILE: Optional[str] = None
    # Optional: run Node live collector from hyperliquid_bot instead of Python main
    HLIQ_NODE_COLLECTOR: bool = False
    # Optional override for command to start Node collector (defaults to npm run -s live:collect)
    HLIQ_NODE_COLLECTOR_CMD: Optional[str] = None
    # Optional NDJSON directory relative to HLIQ_BOT_PATH (defaults to 'data')
    HLIQ_NODE_NDJSON_DIR: Optional[str] = None
    # Common Node collector options (pass-through)
    LIVE_TRIGGER_MODE: Optional[str] = None
    # Live spread defaults
    LIVE_HAIRCUT_BPS: float = 10.0
    FEE_BPS_HYPERSWAP: float = 30.0
    FEE_BPS_PRJX: float = 30.0
    FEE_BPS_HYBRA: float = 30.0

    @field_validator("CORS_ORIGINS", "CORS_ALLOW_HEADERS", "CORS_ALLOW_METHODS", mode="before")
    @classmethod
    def _parse_cors_origins(cls, v):
        """Allow CORS_* fields to be provided as either a JSON array, a comma-separated string, or empty → []."""
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return []
            # Try JSON first
            try:
                import json
                parsed = json.loads(s)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except Exception:
                pass
            # Fallback: comma-separated
            return [item.strip() for item in s.split(",") if item.strip()]
        return v

    # Ensure our custom env source runs for CORS_* fields and tolerates non-JSON values
    @classmethod
    def settings_customise_sources(cls, *args, **kwargs):
        """
        Robust to different pydantic-settings v2 call styles:
        - (init_settings, env_settings, dotenv_settings, file_secret_settings)
        - (settings_cls, init_settings, env_settings, dotenv_settings, file_secret_settings)
        - keyword-based calls with the same names.
        We replace the default env_settings with our _CORSFriendlyEnvSource.
        """
        settings_cls = cls
        init_settings = env_settings = dotenv_settings = file_secret_settings = None

        # Positional patterns
        if args:
            if len(args) == 4:
                init_settings, env_settings, dotenv_settings, file_secret_settings = args
            elif len(args) == 5 and isinstance(args[0], type):
                settings_cls, init_settings, env_settings, dotenv_settings, file_secret_settings = args

        # Keyword fallbacks or mixed
        init_settings = init_settings or kwargs.get("init_settings")
        env_settings = env_settings or kwargs.get("env_settings")
        dotenv_settings = dotenv_settings or kwargs.get("dotenv_settings")
        file_secret_settings = file_secret_settings or kwargs.get("file_secret_settings")

        # Build and return sources, substituting env source with our tolerant one
        parts = []
        if init_settings is not None:
            parts.append(init_settings)
        parts.append(_CORSFriendlyEnvSource(settings_cls))
        if dotenv_settings is not None:
            parts.append(dotenv_settings)
        if file_secret_settings is not None:
            parts.append(file_secret_settings)
        return tuple(parts)

    # Backward compatibility for environments using the older customise_sources API
    @classmethod
    def customise_sources(
        cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        return (
            init_settings,
            _CORSFriendlyEnvSource(cls),
            dotenv_settings,
            file_secret_settings,
        )

# Custom env source that tolerates non-JSON and empty strings for CORS_* fields
class _CORSFriendlyEnvSource(EnvSettingsSource):
    def decode_complex_value(self, field_name, field, value):  # type: ignore[override]
        try:
            target_fields = {"CORS_ORIGINS", "CORS_ALLOW_HEADERS", "CORS_ALLOW_METHODS"}
            if field_name in target_fields and isinstance(value, str):
                s = value.strip()
                if not s:
                    return []
                # Try JSON first
                try:
                    import json
                    parsed = json.loads(s)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except Exception:
                    # Fallback to comma-separated
                    return [item.strip() for item in s.split(",") if item.strip()]
        except Exception:
            # If anything goes wrong, defer to default behavior
            pass
        return super().decode_complex_value(field_name, field, value)

settings = Settings()
