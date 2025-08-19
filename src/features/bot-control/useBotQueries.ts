import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { botApi, BotStatus } from '@/lib/api';

export const BOT_QUERY_KEYS = {
  status: ['bot', 'status'],  // Using an array for the query key
} as const;

export const useBotStatus = () => {
  return useQuery<BotStatus, Error>({
    queryKey: BOT_QUERY_KEYS.status,
    queryFn: () => botApi.getStatus(),
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useStartBot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (strategyId: string) => botApi.start(strategyId),
    onSuccess: () => {
      // Invalidate and refetch the bot status
      queryClient.invalidateQueries({ queryKey: BOT_QUERY_KEYS.status });
    },
  });
};

export const useStopBot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => botApi.stop(),
    onSuccess: () => {
      // Invalidate and refetch the bot status
      queryClient.invalidateQueries({ queryKey: BOT_QUERY_KEYS.status });
    },
  });
};

export const useUpdateBotConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: Record<string, any>) => botApi.updateConfig(config),
    onSuccess: () => {
      // Invalidate and refetch the bot status
      queryClient.invalidateQueries({ queryKey: BOT_QUERY_KEYS.status });
    },
  });
};
