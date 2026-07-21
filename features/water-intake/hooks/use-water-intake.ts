import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

import { getDailyTotal, logWater, undoLastLog } from '@/features/water-intake/services/water-intake-repository';
import { syncTodayWidget } from '@/features/widgets/services/widget-data';
import { toDateKey } from '@/lib/date';

export function useTodayWaterTotal() {
  return useQuery({
    queryKey: ['water-intake', 'today'],
    queryFn: async () => getDailyTotal(toDateKey(new Date())),
  });
}

export function useWaterIntakeMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['water-intake'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'today-timeline'] });
    queryClient.invalidateQueries({ queryKey: ['timeline'] });
    // Keep the home-screen "Today" widget's water progress fresh (no-ops off Android).
    syncTodayWidget();
  };

  const addWater = useMutation({
    mutationFn: async (amountMl: number) => logWater(amountMl),
    onSuccess: invalidate,
  });

  const undoLast = useMutation({
    mutationFn: async () => undoLastLog(),
    onSuccess: invalidate,
  });

  return { addWater, undoLast };
}
