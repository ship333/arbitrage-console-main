import { Strategy } from './index';

export const meanReversionStrategy: Strategy = {
  id: 'mean-reversion-v1',
  name: 'Mean Reversion',
  description: 'Capitalizes on price deviations from historical averages',
  category: 'mean-reversion',
  parameters: {
    lookbackPeriod: {
      type: 'number',
      default: 24,
      min: 1,
      max: 168, // 1 week in hours
      step: 1,
      label: 'Lookback Period (hours)',
      description: 'Time window to calculate the mean price'
    },
    entryZScore: {
      type: 'number',
      default: 2,
      min: 0.5,
      max: 5,
      step: 0.1,
      label: 'Entry Z-Score',
      description: 'Z-score threshold to enter a trade'
    },
    exitZScore: {
      type: 'number',
      default: 0.5,
      min: 0.1,
      max: 2,
      step: 0.1,
      label: 'Exit Z-Score',
      description: 'Z-score threshold to exit a trade'
    },
    positionSize: {
      type: 'number',
      default: 1000,
      min: 100,
      max: 10000,
      step: 100,
      label: 'Position Size (USD)',
      description: 'Maximum value to trade per opportunity'
    },
    stopLoss: {
      type: 'number',
      default: 5,
      min: 0.5,
      max: 20,
      step: 0.5,
      label: 'Stop Loss (%)',
      description: 'Maximum loss per trade as a percentage of position size'
    },
    takeProfit: {
      type: 'number',
      default: 10,
      min: 1,
      max: 50,
      step: 0.5,
      label: 'Take Profit (%)',
      description: 'Target profit per trade as a percentage of position size'
    },
    maxDrawdown: {
      type: 'number',
      default: 15,
      min: 1,
      max: 50,
      step: 1,
      label: 'Max Drawdown (%)',
      description: 'Maximum allowed drawdown before reducing position size'
    },
    volatilityPeriod: {
      type: 'number',
      default: 24,
      min: 1,
      max: 168,
      step: 1,
      label: 'Volatility Period (hours)',
      description: 'Time window to calculate historical volatility'
    }
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true,
  version: '1.0.0',
  tags: ['mean-reversion', 'statistical-arbitrage', 'swing-trading']
};

export interface MeanReversionParams {
  lookbackPeriod: number;
  entryZScore: number;
  exitZScore: number;
  positionSize: number;
  stopLoss: number;
}

export const calculateZScore = (currentPrice: number, prices: number[]): number => {
  if (prices.length === 0) return 0;
  
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const stdDev = Math.sqrt(
    prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
  );
  
  if (stdDev === 0) return 0;
  return (currentPrice - mean) / stdDev;
};

export const shouldEnterTrade = (
  currentPrice: number, 
  priceHistory: number[], 
  entryZScore: number
): boolean => {
  const zScore = calculateZScore(currentPrice, priceHistory);
  return Math.abs(zScore) >= entryZScore;
};

export const shouldExitTrade = (
  entryPrice: number,
  currentPrice: number,
  priceHistory: number[],
  exitZScore: number,
  stopLossPct: number
): { shouldExit: boolean; reason: 'target' | 'stop_loss' | 'none' } => {
  const zScore = calculateZScore(currentPrice, priceHistory);
  const priceChangePct = ((currentPrice - entryPrice) / entryPrice) * 100;
  
  if (Math.abs(priceChangePct) >= stopLossPct) {
    return { shouldExit: true, reason: 'stop_loss' };
  }
  
  if (Math.abs(zScore) <= exitZScore) {
    return { shouldExit: true, reason: 'target' };
  }
  
  return { shouldExit: false, reason: 'none' };
};
