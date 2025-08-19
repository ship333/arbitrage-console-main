import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { PaperTradingService } from './tradingService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BotStatus, Trade } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface TradingContextType {
  tradingService: PaperTradingService | null;
  status: BotStatus | null;
  openTrades: Trade[];
  closedTrades: Trade[];
  startTrading: (strategyId: string) => void;
  stopTrading: () => void;
  executeTrade: (pair: string, side: 'buy' | 'sell', amount: number) => void;
  closeTrade: (tradeId: string) => void;
  resetPaperTrading: () => void;
  isLoading: boolean;
  error: Error | null;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const PAPER_TRADING_KEY = 'paper_trading_state';

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tradingService, setTradingService] = useState<PaperTradingService | null>(null);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Initialize trading service
  useEffect(() => {
    try {
      const storedState = localStorage.getItem(PAPER_TRADING_KEY);
      const initialBalance = 10000; // Default starting balance
      const service = new PaperTradingService(initialBalance);
      
      if (storedState) {
        try {
          const parsedState = JSON.parse(storedState);
          // In a real app, you'd want to validate the stored state
          Object.assign(service, { state: parsedState });
        } catch (e) {
          console.error('Failed to parse stored trading state', e);
          localStorage.removeItem(PAPER_TRADING_KEY);
        }
      }
      
      setTradingService(service);
      setStatus(service.getStatus());
      setIsLoading(false);
      
      // Set up auto-save
      const saveInterval = setInterval(() => {
        if (service) {
          localStorage.setItem(PAPER_TRADING_KEY, JSON.stringify(service.getState()));
        }
      }, 10000); // Save every 10 seconds
      
      return () => clearInterval(saveInterval);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize trading service'));
      setIsLoading(false);
    }
  }, []);
  
  // Status polling effect
  useEffect(() => {
    if (!tradingService) return;
    
    const interval = setInterval(() => {
      setStatus(tradingService.getStatus());
      queryClient.invalidateQueries(['trades']);
    }, 5000); // Update status every 5 seconds
    
    return () => clearInterval(interval);
  }, [tradingService, queryClient]);
  
  // Trade queries
  const { data: openTrades = [] } = useQuery<Trade[]>({
    queryKey: ['trades', 'open'],
    queryFn: () => tradingService ? tradingService.getOpenTrades() : [],
    enabled: !!tradingService,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
  
  const { data: closedTrades = [] } = useQuery<Trade[]>({
    queryKey: ['trades', 'closed'],
    queryFn: () => tradingService ? tradingService.getClosedTrades(50) : [],
    enabled: !!tradingService,
  });
  
  const startTrading = (strategyId: string) => {
    if (!tradingService) return;
    
    try {
      // In a real app, you'd start the actual trading bot here
      tradingService.getStatus().isRunning = true;
      tradingService.getStatus().currentStrategy = strategyId;
      tradingService.getStatus().startTime = new Date().toISOString();
      
      setStatus({ ...tradingService.getStatus() });
      
      toast({
        title: 'Trading started',
        description: `Strategy: ${strategyId}`,
      });
    } catch (err) {
      toast({
        title: 'Failed to start trading',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };
  
  const stopTrading = () => {
    if (!tradingService) return;
    
    try {
      // In a real app, you'd stop the actual trading bot here
      tradingService.getStatus().isRunning = false;
      setStatus({ ...tradingService.getStatus() });
      
      toast({
        title: 'Trading stopped',
      });
    } catch (err) {
      toast({
        title: 'Failed to stop trading',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };
  
  const executeTrade = (pair: string, side: 'buy' | 'sell', amount: number) => {
    if (!tradingService) return;
    
    try {
      const trade = tradingService.openPosition(pair, side, amount);
      if (trade) {
        queryClient.invalidateQueries(['trades']);
        
        toast({
          title: 'Trade executed',
          description: `${side.toUpperCase()} ${amount} ${pair}`,
        });
      }
    } catch (err) {
      toast({
        title: 'Trade execution failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };
  
  const closeTrade = (tradeId: string) => {
    if (!tradingService) return;
    
    try {
      const trade = tradingService.closePosition(tradeId);
      if (trade) {
        queryClient.invalidateQueries(['trades']);
        
        toast({
          title: 'Position closed',
          description: `PNL: ${trade.pnl?.toFixed(2)} (${trade.pnlPercentage?.toFixed(2)}%)`,
        });
      }
    } catch (err) {
      toast({
        title: 'Failed to close position',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };
  
  const resetPaperTrading = () => {
    if (!tradingService) return;
    
    try {
      tradingService.reset();
      localStorage.removeItem(PAPER_TRADING_KEY);
      setStatus(tradingService.getStatus());
      queryClient.invalidateQueries(['trades']);
      
      toast({
        title: 'Paper trading reset',
        description: 'All trades and balances have been reset',
      });
    } catch (err) {
      toast({
        title: 'Failed to reset paper trading',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <TradingContext.Provider
      value={{
        tradingService,
        status,
        openTrades,
        closedTrades,
        startTrading,
        stopTrading,
        executeTrade,
        closeTrade,
        resetPaperTrading,
        isLoading,
        error,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = (): TradingContextType => {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
