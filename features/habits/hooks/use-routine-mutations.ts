import { useQueryClient, useMutation } from '@tanstack/react-query';

import {
  addHabitToRoutine,
  createRoutine,
  deleteRoutine,
  removeHabitFromRoutine,
  renameRoutine,
  reorderRoutineHabits,
} from '@/features/habits/services/habits-repository';

export function useRoutineMutations() {
  const queryClient = useQueryClient();

  // Routines are enriched from the same habit data, so any routine change
  // invalidates alongside the flat habit list under the shared 'habits' prefix.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['habits'] });

  const create = useMutation({
    mutationFn: async (name: string) => createRoutine(name),
    onSuccess: invalidate,
  });

  const rename = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => renameRoutine(id, name),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteRoutine(id),
    onSuccess: invalidate,
  });

  const addHabit = useMutation({
    mutationFn: async ({ routineId, habitId }: { routineId: string; habitId: string }) => addHabitToRoutine(routineId, habitId),
    onSuccess: invalidate,
  });

  const removeHabit = useMutation({
    mutationFn: async ({ routineId, habitId }: { routineId: string; habitId: string }) => removeHabitFromRoutine(routineId, habitId),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: async ({ routineId, orderedHabitIds }: { routineId: string; orderedHabitIds: string[] }) =>
      reorderRoutineHabits(routineId, orderedHabitIds),
    onSuccess: invalidate,
  });

  return { create, rename, remove, addHabit, removeHabit, reorder };
}
