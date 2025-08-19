import { useQuery } from '@tanstack/react-query';
import { APPROVED_PAIRS } from '@/config/assets';
import api from '@/lib/api';

export interface StrategyMetrics {
  pair: string;
  venues: Array<{
    name: string; // 'HL Orderbook' | 'HyperSwap' | 'Hybra' | 'PRJX'
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

export function useStrategies() {
  return useQuery<StrategyMetrics[], Error>({
    queryKey: ['strategies'],
    queryFn: async () => {
      // Fetch approved strategy pairs in parallel
      const results = await Promise.all(
        APPROVED_PAIRS.map((pair) => fetchStrategyData(pair))
      );
      return results;
    },
    refetchInterval: 10000, // 10 seconds
    staleTime: 5000, // 5 seconds
  });
}

async function fetchStrategyData(pair: string): Promise<StrategyMetrics> {
  const data = await api.arb.getPairStrategyMetrics(pair);
  return data;
}
