import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const res = await api.getMetrics();
      return res.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds
    staleTime: 5000, // Data is fresh for 5 seconds
  });
}
