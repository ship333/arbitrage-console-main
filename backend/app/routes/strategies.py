from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any
from datetime import datetime
from ..schemas import Strategy, StrategyParameter

router = APIRouter(prefix="/api/strategies", tags=["strategies"])

# In-memory strategy store
STRATS: Dict[str, Strategy] = {}

# Seed one
if not STRATS:
    now = datetime.utcnow().isoformat() + "Z"
    STRATS["strat-1"] = Strategy(
        id="strat-1",
        name="Baseline Arbitrage",
        description="Simple cross-venue arbitrage",
        category="arbitrage",
        parameters={
            "maxPositionSize": StrategyParameter(type="number", default=2500, min=0, label="Max Position Size"),
        },
        createdAt=now, updatedAt=now, isActive=True, version="1.0.0", tags=["default"]
    )

@router.get("", response_model=List[Strategy])
def list_strategies():
    return list(STRATS.values())

@router.get("/{sid}", response_model=Strategy)
def get_strategy(sid: str):
    if sid not in STRATS:
        raise HTTPException(status_code=404, detail="not found")
    return STRATS[sid]

@router.post("", response_model=Strategy)
def create_strategy(payload: Dict[str, Any]):
    now = datetime.utcnow().isoformat() + "Z"
    sid = payload.get("id") or f"strat-{len(STRATS)+1}"
    strat = Strategy(
        id=sid,
        name=payload.get("name", sid),
        description=payload.get("description", ""),
        category=payload.get("category", "other"),
        parameters={k: StrategyParameter(**v) for k, v in payload.get("parameters", {}).items()},
        createdAt=now, updatedAt=now, isActive=True, version=payload.get("version", "1.0.0"),
        tags=payload.get("tags"),
    )
    STRATS[sid] = strat
    return strat

@router.put("/{sid}", response_model=Strategy)
def update_strategy(sid: str, payload: Dict[str, Any]):
    if sid not in STRATS:
        raise HTTPException(status_code=404, detail="not found")
    existing = STRATS[sid]
    data = existing.model_dump()
    data.update(payload)
    data["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    if "parameters" in payload:
        data["parameters"] = {k: StrategyParameter(**v) for k, v in payload["parameters"].items()}
    STRATS[sid] = Strategy(**data)
    return STRATS[sid]

@router.delete("/{sid}")
def delete_strategy(sid: str):
    if sid not in STRATS:
        raise HTTPException(status_code=404, detail="not found")
    del STRATS[sid]
    return {"success": True}
