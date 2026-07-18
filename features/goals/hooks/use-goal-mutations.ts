import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  addMilestone,
  archiveGoal,
  completeGoal,
  createGoal,
  deleteGoal,
  deleteMilestone,
  deleteProgressLog,
  logGoalProgress,
  renameMilestone,
  reopenGoal,
  setGoalCurrentValue,
  setGoalManualProgress,
  toggleMilestone,
  updateGoal,
} from '@/features/goals/services/goals-repository';
import type { Goal, CreateGoalInput, UpdateGoalInput } from '@/features/goals/types/goal.types';

export function useGoalMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['goals'] });

  const create = useMutation({
    mutationFn: async (input: CreateGoalInput) => createGoal(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateGoalInput }) => updateGoal(id, input),
    onSuccess: invalidate,
  });

  const setProgress = useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: number }) => setGoalManualProgress(id, progress),
    onSuccess: invalidate,
  });

  const setCurrentValue = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => setGoalCurrentValue(id, value),
    onSuccess: invalidate,
  });

  /** Records a dated progress check-in and advances the goal's value. */
  const logProgress = useMutation({
    mutationFn: async ({ goal, resultingValue, delta, note }: { goal: Goal; resultingValue: number; delta: number; note?: string | null }) =>
      logGoalProgress(goal, resultingValue, delta, note ?? null),
    onSuccess: invalidate,
  });

  const removeProgressLog = useMutation({
    mutationFn: async (id: string) => deleteProgressLog(id),
    onSuccess: invalidate,
  });

  const complete = useMutation({
    mutationFn: async (id: string) => completeGoal(id),
    onSuccess: invalidate,
  });

  const reopen = useMutation({
    mutationFn: async (id: string) => reopenGoal(id),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: async (id: string) => archiveGoal(id),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteGoal(id),
    onSuccess: invalidate,
  });

  const addMilestoneMutation = useMutation({
    mutationFn: async ({ goalId, title }: { goalId: string; title: string }) => addMilestone(goalId, title),
    onSuccess: invalidate,
  });

  const toggleMilestoneMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => toggleMilestone(id, isCompleted),
    onSuccess: invalidate,
  });

  const renameMilestoneMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => renameMilestone(id, title),
    onSuccess: invalidate,
  });

  const removeMilestoneMutation = useMutation({
    mutationFn: async (id: string) => deleteMilestone(id),
    onSuccess: invalidate,
  });

  return {
    create,
    update,
    setProgress,
    setCurrentValue,
    logProgress,
    removeProgressLog,
    complete,
    reopen,
    archive,
    remove,
    addMilestone: addMilestoneMutation,
    toggleMilestone: toggleMilestoneMutation,
    renameMilestone: renameMilestoneMutation,
    removeMilestone: removeMilestoneMutation,
  };
}
