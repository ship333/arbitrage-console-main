import { useCallback } from 'react';
import { useTrading as useTradingContext } from './TradingContext';
import { Trade } from '@/lib/api';

export const useTrading = () => {
  const context = useTradingContext();
  
  const startTrading = useCallback((strategyId: string) => {
    context.startTrading(strategyId);
  }, [context]);
  
  const stopTrading = useCallback(() => {
    context.stopTrading();
  }, [context]);
  
  const executeTrade = useCallback((pair: string, side: 'buy' | 'sell', amount: number) => {
    context.executeTrade(pair, side, amount);
  }, [context]);
  
  const closeTrade = useCallback((tradeId: string) => {
    context.closeTrade(tradeId);
  }, [context]);
  
  const resetPaperTrading = useCallback(() => {
    context.resetPaperTrading();
  }, [context]);
  
  return {
    ...context,
    startTrading,
    stopTrading,
    executeTrade,
    closeTrade,
    resetPaperTrading,
  };
};

export const useOpenTrades = () => {
  const { openTrades, closeTrade, isLoading, error } = useTradingContext();
  return { openTrades, closeTrade, isLoading, error };
};

export const useClosedTrades = (limit: number = 50) => {
  const { closedTrades, isLoading, error } = useTradingContext();
  return { 
    closedTrades: closedTrades.slice(0, limit), 
    isLoading, 
    error 
  };
};

export const useTradingStatus = () => {
  const { status, startTrading, stopTrading, isLoading, error } = useTradingContext();
  return { status, startTrading, stopTrading, isLoading, error };
};

export const useTradeHistory = (pair?: string) => {
  const { closedTrades, isLoading, error } = useTradingContext();
  
  const filteredTrades = pair
    ? closedTrades.filter(trade => trade.pair === pair)
    : closedTrades;
    
  return {
    trades: filteredTrades,
    isLoading,
    error,
    totalTrades: filteredTrades.length,
    winningTrades: filteredTrades.filter(t => (t.pnl || 0) > 0).length,
    losingTrades: filteredTrades.filter(t => (t.pnl || 0) <= 0).length,
    totalPnl: filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
    avgPnl: filteredTrades.length > 0 
      ? filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / filteredTrades.length 
      : 0,
  };
};

export const useTradeStats = (tradeId: string) => {
  const { closedTrades, openTrades, isLoading, error } = useTradingContext();
  
  const allTrades = [...openTrades, ...closedTrades];
  const trade = allTrades.find(t => t.id === tradeId);
  
  return {
    trade,
    isLoading,
    error,
    isOpen: trade ? !('exitTime' in trade) : false,
  };
};
