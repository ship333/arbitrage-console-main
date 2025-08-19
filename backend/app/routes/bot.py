from fastapi import APIRouter, Depends, Header
from typing import Optional, Dict, Any, List
from datetime import datetime
from ..schemas import BotStatus, SimpleResult, LogEntry
from .. import db
from prometheus_client import Gauge
from ..ratelimit import rate_limit_control
from .. import hyperliquid_live

router = APIRouter(prefix="/api/bot", tags=["bot"])

# In-memory state for demo
STATE: Dict[str, Any] = {
    "isRunning": False,
    "currentStrategy": None,
    "strategyParams": {},
    "config": {},
    "startTime": None,
    "killSwitch": False,
}

LOGS: List[LogEntry] = []

# Prometheus gauges for operational state
KILL_SWITCH_GAUGE = Gauge("kill_switch_enabled", "1 when kill switch is enabled, else 0")
BOT_PNL_USD_GAUGE = Gauge("bot_pnl_usd", "Latest reported PnL in USD (demo value)")
# initialize
KILL_SWITCH_GAUGE.set(1 if STATE.get("killSwitch") else 0)
BOT_PNL_USD_GAUGE.set(0)


def get_auth(authorization: Optional[str] = Header(default=None)):
    # Accept Bearer and cookies (no validation for demo)
    return authorization


@router.get("/status", response_model=BotStatus)
def get_status(auth=Depends(get_auth)):
    # demo PnL remains 0 for now; export to metrics as well
    pnl_val = 0
    BOT_PNL_USD_GAUGE.set(pnl_val)
    return BotStatus(
        isRunning=bool(STATE["isRunning"]) or hyperliquid_live.is_running(),
        currentStrategy=STATE.get("currentStrategy"),
        strategyParams=STATE.get("strategyParams", {}),
        startTime=STATE.get("startTime"),
        tradingEnabled=STATE.get("config", {}).get("tradingEnabled", True),
        pnl=pnl_val,
        pnlPercentage=0,
        tradesCount=0,
        winRate=0,
        assets={},
        lastUpdated=datetime.utcnow().isoformat() + "Z",
        version="test",
        exchange="TEST",
        quoteCurrency="USD",
    )


@router.get("/config")
def get_config(auth=Depends(get_auth)):
    return STATE.get("config", {})


@router.post("/config", response_model=SimpleResult)
def set_config(cfg: Dict[str, Any], auth=Depends(get_auth), rate=Depends(rate_limit_control)):
    STATE["config"] = cfg
    return SimpleResult(success=True, message="config saved")


@router.post("/start", response_model=SimpleResult)
async def start_bot(payload: Dict[str, Any], auth=Depends(get_auth), rate=Depends(rate_limit_control)):
    # Enforce kill switch
    if STATE.get("killSwitch"):
        return SimpleResult(success=False, message="kill switch enabled; cannot start")
    # Attempt to start live controller (no-op if already running)
    started = False
    try:
        started = hyperliquid_live.start()
    except RuntimeError as e:
        # Missing configuration, report but still set in-memory state to not running
        STATE["isRunning"] = False
        return SimpleResult(success=False, message=f"live start failed: {e}")
    STATE["isRunning"] = True if started else STATE.get("isRunning", True)
    STATE["currentStrategy"] = payload.get("strategy")
    STATE["strategyParams"] = payload.get("params", {})
    STATE["startTime"] = datetime.utcnow().isoformat() + "Z"
    LOGS.append(LogEntry(id=str(len(LOGS)+1), level="info", message="bot started", timestamp=datetime.utcnow().isoformat()+"Z"))
    return SimpleResult(success=True, message=("bot started" if started else "bot already running"))


@router.post("/stop", response_model=SimpleResult)
async def stop_bot(auth=Depends(get_auth), rate=Depends(rate_limit_control)):
    try:
        await hyperliquid_live.stop()
    finally:
        STATE["isRunning"] = False
        LOGS.append(LogEntry(id=str(len(LOGS)+1), level="info", message="bot stopped", timestamp=datetime.utcnow().isoformat()+"Z"))
    return SimpleResult(success=True, message="bot stopped")


@router.post("/pause", response_model=SimpleResult)
def pause_bot(auth=Depends(get_auth), rate=Depends(rate_limit_control)):
    # No-op demo implementation
    return SimpleResult(success=True, message="bot paused")


@router.post("/emergency-stop", response_model=SimpleResult)
async def emergency_stop(auth=Depends(get_auth), rate=Depends(rate_limit_control)):
    try:
        await hyperliquid_live.stop()
    finally:
        STATE["isRunning"] = False
        LOGS.append(LogEntry(id=str(len(LOGS)+1), level="warn", message="EMERGENCY STOP invoked; live controller halted", timestamp=datetime.utcnow().isoformat()+"Z"))
    return SimpleResult(success=True, message="emergency stop executed")


@router.get("/kill-switch")
def get_kill_switch(auth=Depends(get_auth)):
    return {"enabled": bool(STATE.get("killSwitch", False))}


@router.post("/kill-switch", response_model=SimpleResult)
async def set_kill_switch(
    payload: Dict[str, Any],
    auth=Depends(get_auth),
    rate=Depends(rate_limit_control),
    authorization: Optional[str] = Header(default=None),
):
    enabled = bool(payload.get("enabled", False))
    STATE["killSwitch"] = enabled
    KILL_SWITCH_GAUGE.set(1 if enabled else 0)
    if enabled:
        # Stop live controller and mark state
        try:
            await hyperliquid_live.stop()
        except Exception:
            pass
        STATE["isRunning"] = False
        LOGS.append(LogEntry(id=str(len(LOGS)+1), level="warn", message="kill switch enabled; bot stopped", timestamp=datetime.utcnow().isoformat()+"Z"))
    # Audit (best-effort)
    await db.audit_log(
        actor=db.mask_token(authorization),
        actor_type=("token" if authorization else None),
        action="kill_switch_toggle",
        resource="kill_switch",
        details={"enabled": enabled},
    )
    return SimpleResult(success=True, message=f"kill switch {'enabled' if enabled else 'disabled'}")


@router.get("/logs", response_model=List[LogEntry])
def get_logs(limit: int = 100, level: Optional[str] = None, auth=Depends(get_auth)):
    items = LOGS[-limit:]
    if level:
        items = [l for l in items if l.level == level]
    return items
