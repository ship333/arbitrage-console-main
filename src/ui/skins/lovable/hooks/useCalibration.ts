import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

interface CalibrationParams {
  pair: string;
  k: number;
  alpha: number;
}

export function useCalibration() {
  const queryClient = useQueryClient();

  const { data: calibrationStatus, isLoading } = useQuery({
    queryKey: ['calibrationStatus'],
    queryFn: async () => {
      const res = await api.calibration.getStatus();
      return res.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const updateCalibrationMutation = useMutation({
    mutationFn: async ({ pair, k, alpha }: CalibrationParams) => {
      const res = await api.calibration.update(pair, { k, alpha });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calibrationStatus'] });
      toast({
        title: 'Success',
        description: 'Calibration updated successfully',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update calibration: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    calibrationStatus,
    isLoading,
    updateCalibration: updateCalibrationMutation.mutate,
    isUpdating: updateCalibrationMutation.isPending,
  };
}
