from fastapi import APIRouter
from typing import List
from datetime import datetime, timedelta
from ..schemas import Trade
from fastapi.responses import StreamingResponse
import json
import asyncio

router = APIRouter(prefix="/api/activity", tags=["activity"])

@router.get("/trades", response_model=List[Trade])
def get_trades(limit: int = 10):
    now = datetime.utcnow()
    items = []
    for i in range(limit):
        t = now - timedelta(minutes=i)
        items.append(Trade(
            id=f"t-{i}", strategy="strat-1", pair="BTC-USD", side="buy",
            amount=0.01 + i*0.001, price=60000 + i*10, value=600 + i*10,
            fee=0.1, feeCurrency="USD", timestamp=t.isoformat() + "Z", status="closed",
            tags=["live"],
        ))
    return items

@router.get("/trades/stream")
def stream_trades():
    async def gen():
        i = 0
        while True:
            payload = {
                "id": f"sse-{i}", "strategy": "strat-1", "pair": "BTC-USD", "side": "buy",
                "amount": 0.01, "price": 60000 + i, "value": 600 + i,
                "fee": 0.1, "feeCurrency": "USD", "timestamp": datetime.utcnow().isoformat() + "Z", "status": "closed",
                "tags": ["live"],
            }
            yield f"data: {json.dumps(payload)}\n\n"
            i += 1
            await asyncio.sleep(2)
    return StreamingResponse(gen(), media_type="text/event-stream")
