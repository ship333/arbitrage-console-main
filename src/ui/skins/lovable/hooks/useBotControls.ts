import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

export function useBotControls() {
  const queryClient = useQueryClient();

  const startBotMutation = useMutation({
    mutationFn: async (strategy: string) => {
      const res = await api.startBot({ strategy });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botStatus'] });
      toast({
        title: 'Success',
        description: 'Bot started successfully',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to start bot: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const stopBotMutation = useMutation({
    mutationFn: async () => {
      const res = await api.bot.stop();
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['botStatus'] });
      toast({
        title: 'Success',
        description: 'Bot stopped successfully',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to stop bot: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    startBot: startBotMutation.mutate,
    stopBot: stopBotMutation.mutate,
    isLoading: startBotMutation.isPending || stopBotMutation.isPending,
  };
}
