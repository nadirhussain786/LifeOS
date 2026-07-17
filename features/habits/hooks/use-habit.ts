import { useQuery } from '@tanstack/react-query';

import { calculateHabitStreaks } from '@/features/habits/services/habit-streaks';
import { getHabit, listLogsForHabit, listSkipsForHabit } from '@/features/habits/services/habits-repository';

export function useHabit(id: string) {
  return useQuery({
    queryKey: ['habits', 'detail', id],
    queryFn: async () => getHabit(id),
  });
}

export function useHabitLogs(id: string) {
  return useQuery({
    queryKey: ['habits', 'logs', id],
    queryFn: async () => ({ logs: listLogsForHabit(id), skips: listSkipsForHabit(id) }),
  });
}

export function useHabitStreaks(id: string) {
  const habit = useHabit(id);
  const logs = useHabitLogs(id);

  const streaks =
    habit.data && logs.data ? calculateHabitStreaks(habit.data, logs.data.logs, logs.data.skips) : null;

  return { streaks, isLoading: habit.isLoading || logs.isLoading };
}
