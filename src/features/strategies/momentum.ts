import { Strategy } from './index';

export const momentumStrategy: Strategy = {
  id: 'momentum-v1',
  name: 'Momentum Trading',
  description: 'Follows trends by buying assets that are increasing in price and selling those that are decreasing',
  category: 'momentum',
  parameters: {
    rsiPeriod: {
      type: 'number',
      default: 14,
      min: 5,
      max: 50,
      step: 1,
      label: 'RSI Period',
      description: 'Number of periods to calculate RSI'
    },
    rsiOverbought: {
      type: 'number',
      default: 70,
      min: 50,
      max: 90,
      step: 1,
      label: 'RSI Overbought',
      description: 'RSI level considered overbought'
    },
    rsiOversold: {
      type: 'number',
      default: 30,
      min: 10,
      max: 50,
      step: 1,
      label: 'RSI Oversold',
      description: 'RSI level considered oversold'
    },
    momentumPeriod: {
      type: 'number',
      default: 10,
      min: 5,
      max: 50,
      step: 1,
      label: 'Momentum Period',
      description: 'Number of periods to calculate momentum'
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
    trailingStop: {
      type: 'boolean',
      default: true,
      label: 'Use Trailing Stop',
      description: 'Enable trailing stop to protect profits'
    },
    trailingDistance: {
      type: 'number',
      default: 2,
      min: 0.5,
      max: 10,
      step: 0.5,
      label: 'Trailing Stop Distance (%)',
      description: 'Distance from the peak price to place the trailing stop'
    },
    maxPositions: {
      type: 'number',
      default: 5,
      min: 1,
      max: 20,
      step: 1,
      label: 'Max Open Positions',
      description: 'Maximum number of concurrent open positions'
    },
    volatilityThreshold: {
      type: 'number',
      default: 1.5,
      min: 0.5,
      max: 5,
      step: 0.1,
      label: 'Volatility Threshold',
      description: 'Minimum volatility (ATR/price) to consider a trade'
    },
    minTrendStrength: {
      type: 'number',
      default: 0.5,
      min: 0.1,
      max: 1,
      step: 0.1,
      label: 'Minimum Trend Strength',
      description: 'Minimum ADX value to confirm a trend (0-1)'
    }
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true,
  version: '1.0.0',
  tags: ['momentum', 'trend-following', 'swing-trading']
};

export interface MomentumParams {
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  momentumPeriod: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  trailingStop: boolean;
  trailingDistance: number;
  maxPositions: number;
  volatilityThreshold: number;
  minTrendStrength: number;
}

export const calculateMomentum = (prices: number[]): number => {
  if (prices.length < 2) return 0;
  const priceChange = prices[prices.length - 1] - prices[0];
  return (priceChange / prices[0]) * 100; // Return as percentage
};

export const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gains and losses
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period || 1; // Avoid division by zero
  
  // Calculate RS and RSI
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

export const generateMomentumSignal = (
  prices: number[],
  params: MomentumParams
): { signal: 'buy' | 'sell' | 'hold'; strength: number } => {
  if (prices.length < params.momentumPeriod + 1) {
    return { signal: 'hold', strength: 0 };
  }

  const recentPrices = prices.slice(-params.momentumPeriod - 1);
  const priceChange = (recentPrices[recentPrices.length - 1] / recentPrices[0] - 1) * 100;
  const rsi = calculateRSI(prices, params.rsiPeriod);
  const momentum = calculateMomentum(prices);
  const volatility = calculateVolatility(prices, params.momentumPeriod);
  
  // Calculate trend strength (simplified ADX)
  const upMoves: number[] = [];
  const downMoves: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    upMoves.push(diff > 0 ? diff : 0);
    downMoves.push(diff < 0 ? -diff : 0);
  }
  
  const avgUp = upMoves.reduce((a, b) => a + b, 0) / upMoves.length;
  const avgDown = downMoves.reduce((a, b) => a + b, 0) / downMoves.length;
  const trendStrength = Math.abs(avgUp - avgDown) / (avgUp + avgDown) || 0;
  
  // Check volatility threshold
  const volatilityRatio = (volatility / prices[prices.length - 1]) * 100;
  if (volatilityRatio < params.volatilityThreshold) {
    return { signal: 'hold', strength: 0 };
  }
  
  // Check trend strength threshold
  if (trendStrength < params.minTrendStrength) {
    return { signal: 'hold', strength: 0 };
  }

  // Check for oversold conditions with positive momentum
  if (rsi < params.rsiOversold && priceChange > 0) {
    return {
      signal: 'buy',
      strength: (params.rsiOversold - rsi) / params.rsiOversold
    };
  }

  // Check for overbought conditions with negative momentum
  if (rsi > params.rsiOverbought && priceChange < 0) {
    return {
      signal: 'sell',
      strength: (rsi - params.rsiOverbought) / (100 - params.rsiOverbought)
    };
  }

  return { signal: 'hold', strength: 0 };
};

const calculateVolatility = (prices: number[], period: number): number => {
  if (prices.length < period) return 0;
  
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
};
