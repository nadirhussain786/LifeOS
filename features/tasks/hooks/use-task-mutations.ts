import { useQueryClient, useMutation } from '@tanstack/react-query';

import {
  archiveTask,
  completeTask,
  createTask,
  deleteTask,
  reopenTask,
  updateTask,
} from '@/features/tasks/services/tasks-repository';
import type { CreateTaskInput, UpdateTaskInput } from '@/features/tasks/types/task.types';

export function useTaskMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tasks'] });

  const create = useMutation({
    mutationFn: async (input: CreateTaskInput) => createTask(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTaskInput }) => updateTask(id, input),
    onSuccess: invalidate,
  });

  const complete = useMutation({
    mutationFn: async (id: string) => completeTask(id),
    onSuccess: invalidate,
  });

  const reopen = useMutation({
    mutationFn: async (id: string) => reopenTask(id),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: async (id: string) => archiveTask(id),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteTask(id),
    onSuccess: invalidate,
  });

  return { create, update, complete, reopen, archive, remove };
}
