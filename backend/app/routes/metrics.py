from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/api", tags=["metrics"])

@router.get("/metrics")
def get_metrics():
    return {
        "latency": {"p50": 25, "p95": 60, "p99": 110},
        "spreads": {"BTC-USD": 4.2, "ETH-USD": 3.1},
        "liquidity": {"BTC-USD": 1_500_000, "ETH-USD": 800_000},
        "opportunities": [
            {"pair": "BTC-USD", "edgeBps": 12.3, "size": 0.8, "venue": "X"},
            {"pair": "ETH-USD", "edgeBps": 8.4, "size": 12, "venue": "Y"},
        ],
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
    }
