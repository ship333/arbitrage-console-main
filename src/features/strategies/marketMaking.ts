import { Strategy } from './index';

export const marketMakingStrategy: Strategy = {
  id: 'market-making-v1',
  name: 'Automated Market Making',
  description: 'Provides liquidity to DEX pools with dynamic pricing based on market conditions',
  category: 'market-making',
  parameters: {
    spread: {
      type: 'number',
      default: 0.3,
      min: 0.05,
      max: 5,
      step: 0.05,
      label: 'Target Spread (%)',
      description: 'Desired spread between bid and ask prices'
    },
    positionSize: {
      type: 'number',
      default: 500,
      min: 100,
      max: 5000,
      step: 100,
      label: 'Position Size (USD)',
      description: 'Value of each side of the position'
    },
    rebalanceThreshold: {
      type: 'number',
      default: 10,
      min: 1,
      max: 50,
      step: 1,
      label: 'Rebalance Threshold (%)',
      description: 'Price change percentage to trigger rebalancing'
    },
    maxSlippage: {
      type: 'number',
      default: 0.5,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: 'Max Slippage (%)',
      description: 'Maximum allowed slippage when rebalancing'
    },
    priceSource: {
      type: 'select',
      options: [
        { value: 'chainlink', label: 'Chainlink Oracle' },
        { value: 'twap', label: 'Time-Weighted Average Price' },
        { value: 'external', label: 'External API' }
      ],
      default: 'chainlink',
      label: 'Price Source',
      description: 'Source for determining fair market price'
    },
    minOrderSize: {
      type: 'number',
      default: 10,
      min: 1,
      max: 1000,
      step: 1,
      label: 'Minimum Order Size (USD)',
      description: 'Minimum order size to place on the order book'
    },
    maxOrdersPerSide: {
      type: 'number',
      default: 5,
      min: 1,
      max: 20,
      step: 1,
      label: 'Max Orders Per Side',
      description: 'Maximum number of orders to place on each side of the book'
    },
    skewThreshold: {
      type: 'number',
      default: 0.1,
      min: 0.01,
      max: 0.5,
      step: 0.01,
      label: 'Skew Threshold',
      description: 'Maximum allowed inventory skew (0-1)'
    }
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true,
  version: '1.0.0',
  tags: ['market-making', 'liquidity', 'low-latency']
};

export interface MarketMakingParams {
  spread: number;
  positionSize: number;
  rebalanceThreshold: number;
  maxSlippage: number;
  priceSource: 'chainlink' | 'twap' | 'external';
}

export const calculatePrices = (
  midPrice: number, 
  spread: number,
  positionSize: number,
  tokenDecimals: number = 18
) => {
  const halfSpread = spread / 200; // Convert percentage to decimal and split for bid/ask
  const bidPrice = midPrice * (1 - halfSpread);
  const askPrice = midPrice * (1 + halfSpread);
  
  // Calculate token amounts based on position size
  const baseAmount = (positionSize / midPrice) * (10 ** tokenDecimals);
  
  return {
    bidPrice,
    askPrice,
    baseAmount: Math.floor(baseAmount),
    quoteAmount: Math.floor(positionSize * (10 ** 6)) // Assuming 6 decimals for stablecoins
  };
};
