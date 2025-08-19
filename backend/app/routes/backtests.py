from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Response
from pydantic import BaseModel
from ..settings import settings
from ..schemas import Trade

router = APIRouter(prefix="/api/backtests", tags=["backtests"])


class BacktestTimeseriesPoint(BaseModel):
    timestamp: str
    ev: float
    realized: float
    slippage: float


class BacktestMetrics(BaseModel):
    expectedValue: float
    realizedValue: float
    slippage: float
    winRate: float
    totalTrades: int
    profitFactor: float


class BacktestResultModel(BaseModel):
    id: str
    pair: str
    startTime: str
    endTime: str
    metrics: BacktestMetrics
    timeseries: List[BacktestTimeseriesPoint]


def _generate_backtest(pair: str) -> BacktestResultModel:
    now = datetime.utcnow()
    start = now - timedelta(days=7)

    points: List[BacktestTimeseriesPoint] = []
    steps = 20
    for i in range(steps):
        ts = start + timedelta(hours=i * (7 * 24 / steps))
        points.append(
            BacktestTimeseriesPoint(
                timestamp=ts.isoformat() + "Z",
                ev=100.0 + i * 2.0,
                realized=95.0 + i * 1.8,
                slippage=0.4,
            )
        )

    metrics = BacktestMetrics(
        expectedValue=123.45,
        realizedValue=110.11,
        slippage=0.42,
        winRate=0.61,
        totalTrades=42,
        profitFactor=1.8,
    )

    return BacktestResultModel(
        id=f"{pair}-bt-1",
        pair=pair,
        startTime=start.isoformat() + "Z",
        endTime=now.isoformat() + "Z",
        metrics=metrics,
        timeseries=points,
    )


@router.get("/{pair}", response_model=List[BacktestResultModel])
def get_backtests_for_pair(pair: str) -> List[BacktestResultModel]:
    # When enabled, proxy to Hyperliquid backtester
    if settings.BACKTEST_USE_HYPERLIQUID:
        from ..hyperliquid_adapter import run_hliq_backtest
        result = run_hliq_backtest(pair)
        return [BacktestResultModel(**result)]
    # Demo/mock fallback
    return [_generate_backtest(pair)]


@router.get("/{backtest_id}/export")
def export_backtest_csv(backtest_id: str):
    # Export CSV for either Hyperliquid result or synthetic/mock
    header = "timestamp,ev,realized,slippage\n"
    rows: List[str] = []
    if settings.BACKTEST_USE_HYPERLIQUID:
        from ..hyperliquid_adapter import run_hliq_backtest
        # Derive pair from id if formatted as "{pair}-hliq"
        pair = backtest_id[:-5] if backtest_id.endswith("-hliq") else backtest_id
        result = run_hliq_backtest(pair)
        for p in result.get("timeseries", []):
            rows.append(f"{p['timestamp']},{p['ev']},{p['realized']},{p['slippage']}")
    else:
        # Synthetic data to match the mock endpoint
        now = datetime.utcnow()
        start = now - timedelta(days=7)
        steps = 20
        for i in range(steps):
            ts = start + timedelta(hours=i * (7 * 24 / steps))
            timestamp = ts.isoformat() + "Z"
            ev = 100.0 + i * 2.0
            realized = 95.0 + i * 1.8
            slippage = 0.4
            rows.append(f"{timestamp},{ev},{realized},{slippage}")

    csv = header + "\n".join(rows) + "\n"
    return Response(
        content=csv,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={backtest_id}.csv"},
    )


# ---------------------------------------------------------------------------
# Backtest trades (mock/demo): return Trade[] to integrate with Recent Trades
# ---------------------------------------------------------------------------
@router.get("/{pair}/trades", response_model=List[Trade])
def get_backtest_trades_for_pair(pair: str, limit: int = 10) -> List[Trade]:
    now = datetime.utcnow()
    items: List[Trade] = []
    for i in range(limit):
        t = now - timedelta(minutes=i * 3)
        side = "buy" if i % 2 == 0 else "sell"
        price = 55000 + i * 5
        amount = 0.005 + i * 0.0005
        items.append(Trade(
            id=f"bt-{pair}-{i}",
            strategy="backtest-strat",
            pair=pair,
            side=side, 
            amount=amount,
            price=price,
            value=amount * price,
            fee=0.05,
            feeCurrency="USD",
            timestamp=t.isoformat() + "Z",
            status="closed",
            tags=["test"],
        ))
    return items
