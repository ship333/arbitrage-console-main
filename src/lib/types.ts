// Strategy management types
export interface StrategyPreset {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  tags: string[];
  parameters: {
    // Risk and profitability
    EDGE_DECAY_BPS_PER_SEC: number;
    BASE_FILL_PROB: number;
    FILL_THETA: number;
    
    // Slippage modeling
    SLIP_ALPHA: number;
    SLIP_K: number;
    
    // Fee structure
    FLASH_FEE_BPS: number;
    REFERRAL_BPS: number;
    FLASH_FIXED_USD: number;
    EXECUTOR_FEE_USD: number;
    
    // Risk management
    RISK_AVERSION_LAMBDA: number;
    GAS_USD_MEAN: number;
    GAS_USD_STD: number;
    ADVERSE_USD_MEAN: number;
    ADVERSE_USD_STD: number;
    MEV_PENALTY_USD: number;
    MAX_NOTIONAL_USD: number;
  };
  createdAt: number;
  updatedAt: number;
}

// Backtest data types
export interface BacktestRow {
  timestamp: number;
  strategy: string;
  edge_bps: number;
  notional: number;
  ev_usd: number;
  p_success: number;
  pnl_usd: number;
  drawdown: number;
  hit_rate: number;
  gas_usd?: number;
  slippage_bps?: number;
}

export interface BacktestSummary {
  strategy: string;
  totalPnL: number;
  maxDrawdown: number;
  winRate: number;
  sharpeRatio: number;
  totalTrades: number;
  avgPnL: number;
  volatility: number;
  startDate: number;
  endDate: number;
}

// Parameter sweep types
export interface SweepParameter {
  name: string;
  min: number;
  max: number;
  step: number;
}

export interface SweepResult {
  parameters: Record<string, number>;
  net_usd_est: number;
  ev_per_sec: number;
  size_opt_usd: number;
  p_success: number;
}

// Evaluation form types
export interface EvalFormData {
  pair: string;
  edgeBps: number;
  notional: number;
  flashFeeBps: number;
  gasUsd: number;
  slippageBps: number;
}

// Client-side log types
export interface ClientLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  source: string;
}

// Activity page types
export interface ArbitrageOpportunity {
  id?: string;
  type: string;
  path: string;
  source: string;
  netProfitUsd: number;
  estimatedProfitUsd: number;
  confidence: number;
  timestamp: number;
}

export interface Signal {
  id: string;
  type: string;
  shouldExecute: boolean;
  evaluationSummary: {
    net_usd_est?: number;
    p_success?: number;
    [key: string]: any;
  };
  timestamp: number;
}