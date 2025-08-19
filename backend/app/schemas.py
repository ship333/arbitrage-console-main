from typing import Dict, List, Optional, Literal, Any
from pydantic import BaseModel, Field

class StrategyParameter(BaseModel):
    type: Literal["number", "string", "boolean", "select"]
    default: Any
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None
    options: Optional[List[Dict[str, str]]] = None
    label: str
    description: Optional[str] = None
    required: Optional[bool] = None

class Strategy(BaseModel):
    id: str
    name: str
    description: str
    category: Literal["arbitrage", "market-making", "momentum", "mean-reversion", "other"]
    parameters: Dict[str, StrategyParameter]
    createdAt: str
    updatedAt: str
    isActive: bool
    version: str
    tags: Optional[List[str]] = None

class Trade(BaseModel):
    id: str
    strategy: str
    pair: str
    side: Literal["buy", "sell", "long", "short"]
    amount: float
    price: float
    value: float
    fee: float
    feeCurrency: str
    timestamp: str
    status: Literal["open", "closed", "canceled", "liquidated"]
    tags: Optional[List[str]] = None

class BotStatus(BaseModel):
    isRunning: bool
    currentStrategy: Optional[str] = None
    strategyParams: Optional[Dict[str, Any]] = None
    startTime: Optional[str] = None
    tradingEnabled: Optional[bool] = None
    pnl: float = 0.0
    pnlPercentage: float = 0.0
    tradesCount: int = 0
    winRate: float = 0.0
    assets: Dict[str, float] = Field(default_factory=dict)
    maxPositionSize: Optional[float] = None
    dailyLossLimit: Optional[float] = None
    maxOpenTrades: Optional[int] = None
    stopLoss: Optional[float] = None
    takeProfit: Optional[float] = None
    trailingStop: Optional[bool] = None
    lastUpdated: str
    version: str
    exchange: str
    quoteCurrency: str

class SimpleResult(BaseModel):
    success: bool
    message: str

class LogEntry(BaseModel):
    id: str
    level: Literal["info", "warn", "error", "debug", "trace"]
    message: str
    timestamp: str
    context: Optional[Dict[str, Any]] = None
    stack: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
