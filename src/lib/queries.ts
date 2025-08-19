import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';

// Query keys
export const queryKeys = {
  health: ['health'] as const,
  stats: ['stats'] as const,
  signals: ['signals', 'active'] as const,
  opportunities: (limit?: number) => ['opportunities', 'recent', limit] as const,
  bot: ['bot', 'status'] as const,
  backtest: ['backtest', 'status'] as const,
};

// Custom hooks for API calls
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: api.getHealth,
    refetchInterval: 5000, // 5 seconds
    staleTime: 2000,
  });
}

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: api.getStats,
    refetchInterval: 3000, // 3 seconds
    staleTime: 1000,
  });
}

export function useActiveSignals() {
  return useQuery({
    queryKey: queryKeys.signals,
    queryFn: api.getActiveSignals,
    refetchInterval: 4000, // 4 seconds
    staleTime: 2000,
  });
}

export function useRecentOpportunities(limit = 50) {
  return useQuery({
    queryKey: queryKeys.opportunities(limit),
    queryFn: () => api.getRecentOpportunities(limit),
    refetchInterval: 5000, // 5 seconds
    staleTime: 2000,
  });
}

export function useEvaluateBatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.evaluateBatch,
    onSuccess: () => {
      // Optionally invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

// Bot status polling
export function useBotStatus() {
  return useQuery({
    queryKey: queryKeys.bot,
    queryFn: api.getBotStatus,
    refetchInterval: 2000,
    staleTime: 1000,
  });
}

// Backtest status polling
export function useBacktestStatus() {
  return useQuery({
    queryKey: queryKeys.backtest,
    queryFn: api.getBacktestStatus,
    refetchInterval: 2000,
    staleTime: 1000,
  });
}

// Bot control mutations
export function useStartBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.startBot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bot });
    },
  });
}

export function usePauseBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.pauseBot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bot });
    },
  });
}

export function useStopBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.stopBot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bot });
    },
  });
}

export function useEmergencyStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.emergencyStop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bot });
    },
  });
}