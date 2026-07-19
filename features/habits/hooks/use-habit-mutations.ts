import { useQueryClient, useMutation } from '@tanstack/react-query';

import { cancelHabitReminder, syncHabitReminder } from '@/features/habits/services/habit-reminders';
import { toDateKey } from '@/features/habits/services/habit-streaks';
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  getHabit,
  logHabit,
  reorderHabits,
  skipHabit,
  unarchiveHabit,
  unlogHabit,
  unskipHabit,
  updateHabit,
} from '@/features/habits/services/habits-repository';
import type { CreateHabitInput, HabitSkipReason, UpdateHabitInput } from '@/features/habits/types/habit.types';
import { syncTodayWidget } from '@/features/widgets/services/widget-data';

export function useHabitMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['habits'] });
    // Keep the home-screen "Today" widget's habits-left count fresh (no-ops off Android).
    syncTodayWidget();
  };

  const create = useMutation({
    mutationFn: async (input: CreateHabitInput) => {
      const habit = createHabit(input);
      await syncHabitReminder(habit);
      return habit;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateHabitInput }) => {
      updateHabit(id, input);
      const habit = getHabit(id);
      if (habit) await syncHabitReminder(habit);
    },
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const habit = getHabit(id);
      archiveHabit(id);
      if (habit) await cancelHabitReminder(habit);
    },
    onSuccess: invalidate,
  });

  const unarchive = useMutation({
    mutationFn: async (id: string) => unarchiveHabit(id),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const habit = getHabit(id);
      deleteHabit(id);
      if (habit) await cancelHabitReminder(habit);
    },
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => reorderHabits(orderedIds),
    onSuccess: invalidate,
  });

  const logToday = useMutation({
    mutationFn: async ({ habitId, value }: { habitId: string; value?: number }) =>
      logHabit(habitId, toDateKey(new Date()), value ?? 1),
    onSuccess: invalidate,
  });

  const unlogToday = useMutation({
    mutationFn: async (habitId: string) => unlogHabit(habitId, toDateKey(new Date())),
    onSuccess: invalidate,
  });

  const logDate = useMutation({
    mutationFn: async ({ habitId, logDate, value }: { habitId: string; logDate: string; value?: number }) =>
      logHabit(habitId, logDate, value ?? 1),
    onSuccess: invalidate,
  });

  const skipToday = useMutation({
    mutationFn: async ({ habitId, reason }: { habitId: string; reason: HabitSkipReason }) =>
      skipHabit(habitId, toDateKey(new Date()), reason),
    onSuccess: invalidate,
  });

  const unskipToday = useMutation({
    mutationFn: async (habitId: string) => unskipHabit(habitId, toDateKey(new Date())),
    onSuccess: invalidate,
  });

  return {
    create,
    update,
    archive,
    unarchive,
    remove,
    reorder,
    logToday,
    unlogToday,
    logDate,
    skipToday,
    unskipToday,
  };
}
