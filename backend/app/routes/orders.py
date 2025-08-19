from __future__ import annotations
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import require_auth
from .. import exchange_client
from .risk import enforce_order_risk
from .bot import STATE  # reuse kill switch state

router = APIRouter(prefix="/api/orders", tags=["orders"])  


@router.post("/place")
async def place_order(payload: Dict[str, Any], auth=Depends(require_auth)):
    # Kill switch enforcement
    if bool(STATE.get("killSwitch")):
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="kill switch enabled")

    # Extract inputs
    symbol: str = str(payload.get("symbol", "")).strip()
    side: str = str(payload.get("side", "")).lower().strip()
    qty: float = float(payload.get("qty", 0))
    price: Optional[float] = payload.get("price")
    order_type: str = str(payload.get("type", "market"))

    # Risk inputs (should be provided by pre-trade checks)
    notional_usd: float = float(payload.get("notionalUsd", 0))
    slippage_bps: float = float(payload.get("slippageBps", 0))
    orderbook_liquidity_usd: float = float(payload.get("orderbookLiquidityUsd", 0))

    if not symbol or side not in {"buy", "sell"} or qty <= 0:
        raise HTTPException(status_code=400, detail="invalid order parameters")

    # Risk enforcement
    ok, reason = enforce_order_risk(notional_usd, slippage_bps, orderbook_liquidity_usd)
    if not ok:
        raise HTTPException(status_code=400, detail=f"risk check failed: {reason}")

    # Place via exchange client
    client = exchange_client.get_exchange_client()
    try:
        result = await client.place_order(
            symbol=symbol,
            side=side,
            qty=qty,
            price=float(price) if price is not None else None,
            type_=order_type,
        )
        return {"success": True, "order": result}
    except RuntimeError as e:
        # Circuit open / retries exhausted
        raise HTTPException(status_code=503, detail=str(e))
