import { arbitrageStrategy } from './arbitrage';
import { marketMakingStrategy } from './marketMaking';
import { meanReversionStrategy } from './meanReversion';
import { momentumStrategy } from './momentum';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  category: 'arbitrage' | 'market-making' | 'momentum' | 'mean-reversion' | 'other';
  parameters: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  version: string;
  tags?: string[];
}

export const STRATEGIES: Record<string, Strategy> = {
  [arbitrageStrategy.id]: arbitrageStrategy,
  [marketMakingStrategy.id]: marketMakingStrategy,
  [meanReversionStrategy.id]: meanReversionStrategy,
  [momentumStrategy.id]: momentumStrategy,
};

export * from './arbitrage';
export * from './marketMaking';
export * from './meanReversion';
export * from './momentum';

export const getStrategyById = (id: string): Strategy | undefined => {
  return STRATEGIES[id];
};

export const getAllStrategies = (): Strategy[] => {
  return Object.values(STRATEGIES);
};

export const getActiveStrategies = (): Strategy[] => {
  return getAllStrategies().filter(strategy => strategy.isActive);
};
