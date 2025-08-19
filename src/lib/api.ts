import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { RealtimeCounters, getApiBaseUrl } from '@/lib/env';

// Base API configuration via helpers
const API_BASE_URL = getApiBaseUrl();

// Create axios instance with base config
const createApiClient = (baseURL: string) => {
  const instance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  // Request interceptor for auth tokens
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling and idempotent retries
  type RetryConfig = AxiosRequestConfig & { _retryCount?: number };
  const RETRY_STATUSES = new Set([429, 502, 503, 504]);
  const MAX_RETRIES = 5;
  const BASE_DELAY_MS = 300;
  const MAX_DELAY_MS = 5000;

  const isIdempotent = (method?: string) => {
    const m = (method || 'GET').toUpperCase();
    return m === 'GET' || m === 'HEAD' || m === 'OPTIONS';
  };

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const cfg = (error.config || {}) as RetryConfig;
      const status = error.response?.status;
      if (
        isIdempotent(cfg.method) &&
        status && RETRY_STATUSES.has(status) &&
        (cfg._retryCount || 0) < MAX_RETRIES
      ) {
        const attempt = (cfg._retryCount || 0) + 1;
        cfg._retryCount = attempt;
        const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempt - 1));
        const jitter = Math.floor(Math.random() * Math.min(250, exp));
        await sleep(exp + jitter);
        return instance.request(cfg);
      }

      if (status === 401) {
        console.error('Unauthorized access - please login again');
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Create API clients
const apiClient = createApiClient(API_BASE_URL);

// Types
export interface BotStatus {
  // Core status
  isRunning: boolean;
  currentStrategy?: string;
  strategyParams?: Record<string, any>;
  startTime?: string;
  // Controls
  tradingEnabled?: boolean;
  
  // Performance metrics
  pnl: number;
  pnlPercentage: number;
  tradesCount: number;
  winRate: number;
  assets: Record<string, number>;
  
  // Risk management
  maxPositionSize?: number;
  dailyLossLimit?: number;
  maxOpenTrades?: number;
  
  // Trading parameters
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: boolean;
  
  // Additional metadata
  lastUpdated: string;
  version: string;
  exchange: string;
  quoteCurrency: string;
}

export interface StrategyParameter {
  type: 'number' | 'string' | 'boolean' | 'select';
  default: any;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  label: string;
  description?: string;
  required?: boolean;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  category: 'arbitrage' | 'market-making' | 'momentum' | 'mean-reversion' | 'other';
  parameters: Record<string, StrategyParameter>;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  version: string;
  tags?: string[];
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  startTime: string;
  endTime: string;
  status: 'completed' | 'failed' | 'running' | 'queued';
  parameters: Record<string, unknown>;
  metrics: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnl: number;
    totalPnlPercent: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    sharpeRatio: number;
    sortinoRatio: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
    averageTrade: number;
    profitPerDay: number;
    profitPerMonth: number;
    profitPerYear: number;
    avgTradeDuration: number;
    maxTradeDuration: number;
    minTradeDuration: number;
  };
  trades: Trade[];
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface StrategyMetrics {
  strategyId: string;
  timeframe: string;
  timestamp: string;
  metrics: {
    currentEquity: number;
    maxEquity: number;
    minEquity: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    sharpeRatio: number;
    sortinoRatio: number;
    profitFactor: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    averageWin: number;
    averageLoss: number;
    averageTrade: number;
    largestWin: number;
    largestLoss: number;
    profitPerDay: number;
    profitPerWeek: number;
    profitPerMonth: number;
    profitPerYear: number;
  };
  equityCurve: Array<{ timestamp: string; equity: number }>;
  drawdownCurve: Array<{ timestamp: string; drawdown: number }>;
}

export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'trace';
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
  metadata?: Record<string, any>;
}

export interface Trade {
  id: string;
  strategy: string;
  pair: string;
  side: 'buy' | 'sell' | 'long' | 'short';
  amount: number;
  price: number;
  value: number;
  fee: number;
  feeCurrency: string;
  timestamp: string;
  status: 'open' | 'closed' | 'canceled' | 'liquidated';
  exitPrice?: number;
  pnl?: number;
  pnlPercentage?: number;
  leverage?: number;
  margin?: number;
  liquidationPrice?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Bot Control API
export const botApi = {
  getStatus: () => apiClient.get<BotStatus>('/bot/status'),
  start: (strategy: string, params: Record<string, any> = {}) => 
    apiClient.post<{ success: boolean; message: string }>('/bot/start', { strategy, params }),
  stop: () => apiClient.post<{ success: boolean; message: string }>('/bot/stop'),
  updateConfig: (config: Record<string, any>) => 
    apiClient.post<{ success: boolean; message: string }>('/bot/config', config),
  getConfig: () => apiClient.get<Record<string, any>>('/bot/config'),
  getLogs: (limit: number = 100, level?: string) => 
    apiClient.get<LogEntry[]>('/bot/logs', { params: { limit, level } }),
  // Kill switch
  getKillSwitch: () => apiClient.get<{ enabled: boolean }>('/bot/kill-switch'),
  setKillSwitch: (enabled: boolean) =>
    apiClient.post<{ success: boolean; message: string }>('/bot/kill-switch', { enabled }),
};

// Market data endpoints
export const marketApi = {
  getPrices: (pairs: string[], interval: string = '1h', limit: number = 100) =>
    apiClient.get<{ [pair: string]: any[] }>('/market/prices', { params: { pairs: pairs.join(','), interval, limit } }),
  getOrderBook: (pair: string, depth: number = 20) =>
    apiClient.get<any>(`/market/orderbook/${pair}`, { params: { depth } }),
  getTrades: (pair: string, limit: number = 100) =>
    apiClient.get<Trade[]>(`/market/trades/${pair}`, { params: { limit } }),
  getTickers: () => apiClient.get<{ [pair: string]: any }>('/market/tickers'),
  getHistoricalData: (pair: string, interval: string, startTime: number, endTime: number) =>
    apiClient.get<any[]>('/market/historical', { params: { pair, interval, startTime, endTime } })
};

// Strategy endpoints
export const strategyApi = {
  list: () => apiClient.get<Strategy[]>('/strategies'),
  get: (id: string) => apiClient.get<Strategy>(`/strategies/${id}`),
  create: (strategy: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<Strategy>('/strategies', strategy),
  update: (id: string, updates: Partial<Strategy>) =>
    apiClient.put<Strategy>(`/strategies/${id}`, updates),
  delete: (id: string) => apiClient.delete<{ success: boolean }>(`/strategies/${id}`),
  backtest: (strategyId: string, params: Record<string, unknown>, startTime: string, endTime: string) =>
    apiClient.post<BacktestResult>(`/strategies/${strategyId}/backtest`, { params, startTime, endTime }),
  getActiveStrategies: () => apiClient.get<Strategy[]>('/strategies/active'),
  getStrategyMetrics: (strategyId: string, timeframe = '24h') =>
    apiClient.get<StrategyMetrics>(`/strategies/${strategyId}/metrics`, { params: { timeframe } })
};

// Alias for backward compatibility
export const strategiesApi = strategyApi;

// Risk limits type
export interface RiskLimits {
  maxNotionalPerTradeUsd: number;
  maxOpenPositions: number;
  maxDailyPnlDrawdownUsd: number;
  maxSlippageBps: number;
  minOrderbookLiquidityUsd: number;
}

// Trading endpoints
export const tradingApi = {
  // Account
  getBalance: () => apiClient.get<any>('/trading/balance'),
  getPositions: () => apiClient.get<any[]>('/trading/positions'),
  getPosition: (symbol: string) => apiClient.get<any>(`/trading/positions/${symbol}`),
  
  // Orders
  getOpenOrders: (pair?: string) => 
    apiClient.get<any[]>(`/trading/orders${pair ? `?pair=${pair}` : ''}`),
  getOrder: (id: string) => apiClient.get<any>(`/trading/orders/${id}`),
  createOrder: (order: any) =>
    apiClient.post<any>('/trading/orders', order),
  cancelOrder: (id: string) => apiClient.delete<{ success: boolean }>(`/trading/orders/${id}`),
  cancelAllOrders: (pair?: string) =>
    apiClient.delete<{ success: boolean }>('/trading/orders', { params: { pair } }),
  
  // Trades
  getTrades: (params?: { pair?: string; limit?: number; startTime?: number; endTime?: number }) =>
    apiClient.get<Trade[]>('/trading/trades', { params }),
  getTrade: (id: string) => apiClient.get<Trade>(`/trading/trades/${id}`),
  
  // Risk management
  getRiskLimits: () => apiClient.get<RiskLimits>('/trading/risk/limits'),
  updateRiskLimits: (limits: RiskLimits) =>
    apiClient.post<RiskLimits>('/trading/risk/limits', limits),
  
  // Paper trading
  paperTrading: {
    getState: () => apiClient.get<any>('/paper-trading/state'),
    reset: () => apiClient.post<{ success: boolean }>('/paper-trading/reset'),
    updateBalance: (balance: any) =>
      apiClient.post<any>('/paper-trading/balance', balance)
  }
};

// Activity API
export const activityApi = {
  // Get recent trades
  getTrades: async (limit = 50): Promise<Trade[]> => {
    const { data } = await apiClient.get<Trade[]>('/activity/trades', { params: { limit } });
    return data;
  },

  // Subscribe to real-time trade updates
  subscribeToTrades: (callback: (trade: Trade) => void) => {
    const eventSource = new EventSource(`${API_BASE_URL}/activity/trades/stream`);
    eventSource.onmessage = (event) => {
      const trade = JSON.parse(event.data) as Trade;
      callback(trade);
    };
    eventSource.onerror = () => {
      // Browser EventSource auto-reconnects; track diagnostics only
      RealtimeCounters.sse.reconnects += 1;
    };
    return () => eventSource.close();
  },
};

// Logs API
export const logsApi = {
  // Get logs with optional filtering
  getLogs: async (params?: {
    level?: 'info' | 'warn' | 'error';
    startTime?: string;
    endTime?: string;
    limit?: number;
  }): Promise<LogEntry[]> => {
    const { data } = await apiClient.get<LogEntry[]>('/logs', { params });
    return data;
  },

  // Export logs as CSV
  exportLogs: async (params?: {
    level?: 'info' | 'warn' | 'error';
    startTime?: string;
    endTime?: string;
  }): Promise<Blob> => {
    const response = await apiClient.get('/logs/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

// Misc/general API endpoints used by various hooks
export const miscApi = {
  // System health
  getHealth: async () => {
    const { data } = await apiClient.get<any>('/health');
    return data;
  },

  // Aggregated stats
  getStats: async () => {
    const { data } = await apiClient.get<any>('/stats');
    return data;
  },

  // Signals
  getActiveSignals: async (): Promise<any[]> => {
    const { data } = await apiClient.get<any[]>('/signals/active');
    return data;
  },
  evaluateBatch: (payload?: any) => apiClient.post<any>('/signals/evaluate-batch', payload ?? {}),

  // Opportunities
  getRecentOpportunities: async (limit = 50): Promise<any[]> => {
    const { data } = await apiClient.get<any[]>('/opportunities', { params: { limit } });
    return data;
  },

  // Backtest status
  getBacktestStatus: async () => {
    const { data } = await apiClient.get<any>('/backtest/status');
    return data;
  },

  // Bot helpers (aliases)
  getBotStatus: async (): Promise<BotStatus & { state: 'running' | 'paused' | 'stopped' }> => {
    const { data } = await botApi.getStatus();
    // Derive a UI-friendly state string from backend fields
    const state: 'running' | 'paused' | 'stopped' = data.isRunning ? 'running' : 'stopped';
    return { ...data, state } as any;
  },
  startBot: (args?: { strategy?: string; params?: Record<string, any> }) =>
    botApi.start(args?.strategy ?? 'default', args?.params ?? {}),
  pauseBot: () => apiClient.post<{ success: boolean }>('/bot/pause'),
  stopBot: () => botApi.stop(),
  emergencyStop: () => apiClient.post<{ success: boolean }>('/bot/emergency-stop'),

  // Frontend convenience endpoints (align with existing hooks)
  // Live metrics for dashboard
  getMetrics: async () => {
    const { data } = await apiClient.get<any>('/metrics');
    return data;
  },
};

// Arbitrage-specific convenience API to match current UI hooks
export interface PairStrategyMetrics {
  pair: string;
  venues: Array<{
    name: string;
    edgeBps: number;
    expectedValue: number;
    size: number;
    fillProbability: number;
    lastSeen: string;
  }>;
  pnl24h: number;
  pnl7d: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface PairBacktestResult {
  id: string;
  pair: string;
  startTime: string;
  endTime: string;
  metrics: {
    expectedValue: number;
    realizedValue: number;
    slippage: number;
    winRate: number;
    totalTrades: number;
    profitFactor: number;
  };
  timeseries: Array<{
    timestamp: string;
    ev: number;
    realized: number;
    slippage: number;
  }>;
}

export const arbApi = {
  // Strategy metrics by pair
  getPairStrategyMetrics: async (pair: string): Promise<PairStrategyMetrics> => {
    const { data } = await apiClient.get<PairStrategyMetrics>(`/strategies/pair/${encodeURIComponent(pair)}`);
    return data;
  },

  // Backtests by pair
  getBacktestsForPair: async (pair: string): Promise<PairBacktestResult[]> => {
    const { data } = await apiClient.get<PairBacktestResult[]>(`/backtests/${encodeURIComponent(pair)}`);
    return data;
  },

  // Backtest trades by pair
  getBacktestTradesForPair: async (pair: string, limit: number = 10): Promise<Trade[]> => {
    const { data } = await apiClient.get<Trade[]>(`/backtests/${encodeURIComponent(pair)}/trades`, { params: { limit } });
    return data;
  },

  // Export URL helper for CSV
  getBacktestCsvUrl: (backtestId: string) => `${API_BASE_URL}/backtests/${encodeURIComponent(backtestId)}/export`,
};

// Calibration API
export const calibrationApi = {
  // Update calibration parameters
  update: (pair: string, params: { k: number; alpha: number }) =>
    apiClient.post<{ success: boolean }>(
      '/calibration/update',
      { pair, ...params }
    ),

  // Fetch calibration status
  getStatus: () => apiClient.get<any>('/calibration/status'),
};

// Add request interceptor for auth if needed
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for general logging (retry handled in instance)
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401) {
      console.error('Unauthorized access - please login again');
    } else if (status === 403) {
      console.error('Forbidden - you do not have permission');
    } else if (status === 404) {
      console.error('Resource not found');
    } else if (status === 500) {
      console.error('Server error - please try again later');
    } else if (error.request) {
      console.error('No response received from server');
    } else {
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

// Note: Keep-alive Agents and NODE_OPTIONS=--dns-result-order=ipv4first are applicable
// to Node.js runtimes. This project runs in the browser; axios uses Fetch/XHR,
// so we cannot control HTTP agents here. If you introduce a Node server-side
// client, configure undici Agents and NODE_OPTIONS there.

// Unified API object for convenient imports
export const api = {
  bot: botApi,
  strategies: strategiesApi,
  activity: activityApi,
  logs: logsApi,
  calibration: calibrationApi,
  ...miscApi,
  arb: arbApi,
};

export default api;
