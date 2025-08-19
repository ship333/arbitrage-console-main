from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Header
from ..settings import settings
from .. import db

router = APIRouter(prefix="/api/trading", tags=["risk"]) 

# In-memory risk limits; in production, persist in DB or config service
RISK_LIMITS: Dict[str, Any] = {
    "maxNotionalPerTradeUsd": settings.MAX_NOTIONAL_PER_TRADE_USD,
    "maxOpenPositions": settings.MAX_OPEN_POSITIONS,
    "maxDailyPnlDrawdownUsd": settings.MAX_DAILY_PNL_DRAWDOWN_USD,
    "maxSlippageBps": settings.MAX_SLIPPAGE_BPS,
    "minOrderbookLiquidityUsd": settings.MIN_ORDERBOOK_LIQUIDITY_USD,
}


@router.get("/risk/limits")
async def get_risk_limits():
    return RISK_LIMITS


@router.post("/risk/limits")
async def update_risk_limits(payload: Dict[str, Any], authorization: Optional[str] = Header(default=None)):
    allowed = set(RISK_LIMITS.keys())
    for k, v in payload.items():
        if k not in allowed:
            raise HTTPException(status_code=400, detail=f"unknown limit: {k}")
        if isinstance(RISK_LIMITS[k], (int, float)):
            try:
                v = float(v)
            except Exception:
                raise HTTPException(status_code=400, detail=f"invalid numeric value for {k}")
            if v < 0:
                raise HTTPException(status_code=400, detail=f"{k} must be non-negative")
        RISK_LIMITS[k] = v
    # Fire-and-forget audit log (no exception on failure)
    await db.audit_log(
        actor=db.mask_token(authorization),
        actor_type=("token" if authorization else None),
        action="risk_limits_update",
        resource="risk_limits",
        details={"updated": payload},
    )
    return {"success": True, "message": "risk limits updated", "limits": RISK_LIMITS}


# Example enforcement helper (to be used in order placement path)

def enforce_order_risk(notional_usd: float, slippage_bps: float, orderbook_liquidity_usd: float) -> tuple[bool, str]:
    if notional_usd > float(RISK_LIMITS["maxNotionalPerTradeUsd"]):
        return False, "exceeds max notional per trade"
    if slippage_bps > float(RISK_LIMITS["maxSlippageBps"]):
        return False, "exceeds max slippage"
    if orderbook_liquidity_usd < float(RISK_LIMITS["minOrderbookLiquidityUsd"]):
        return False, "insufficient orderbook liquidity"
    return True, "ok"
