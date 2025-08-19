import { useQuery } from '@tanstack/react-query';
import { APPROVED_PAIRS } from '@/config/assets';
import api from '@/lib/api';

export interface BacktestResult {
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

export function useBacktests() {
  return useQuery<Record<string, BacktestResult[]>>({
    queryKey: ['backtests'],
    queryFn: async () => {
      const pairs = [...APPROVED_PAIRS];
      const results = await Promise.all(
        pairs.map(pair => 
          fetchBacktestData(pair).catch(error => {
            console.error(`Error fetching backtest for ${pair}:`, error);
            return [];
          })
        )
      );
      
      return pairs.reduce((acc, pair, index) => ({
        ...acc,
        [pair]: results[index] || []
      }), {});
    },
    staleTime: 60000, // 1 minute
  });
}

async function fetchBacktestData(pair: string): Promise<BacktestResult[]> {
  const data = await api.arb.getBacktestsForPair(pair);
  return data as unknown as BacktestResult[];
}

export function downloadBacktestCsv(backtestId: string) {
  const url = api.arb.getBacktestCsvUrl(backtestId);
  window.open(url, '_blank');
}
