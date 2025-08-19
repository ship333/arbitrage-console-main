import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useOpportunities() {
  return useQuery({
    queryKey: ['opportunities'],
    queryFn: async () => {
      const res = await api.getRecentOpportunities();
      return res.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 2000, // Data is fresh for 2 seconds
  });
}
