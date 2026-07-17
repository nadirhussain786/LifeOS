import { useQueryClient, useMutation } from '@tanstack/react-query';

import { cancelTaskReminder, syncTaskReminder } from '@/features/tasks/services/task-reminders';
import {
  archiveTask,
  completeTask,
  createTask,
  deleteTask,
  getTask,
  reopenTask,
  updateTask,
} from '@/features/tasks/services/tasks-repository';
import type { CreateTaskInput, UpdateTaskInput } from '@/features/tasks/types/task.types';

export function useTaskMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tasks'] });

  const create = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const task = createTask(input);
      await syncTaskReminder(task);
      return task;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTaskInput }) => {
      updateTask(id, input);
      const task = getTask(id);
      if (task) await syncTaskReminder(task);
    },
    onSuccess: invalidate,
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const task = getTask(id);
      completeTask(id);
      if (task) await cancelTaskReminder(task);
    },
    onSuccess: invalidate,
  });

  const reopen = useMutation({
    mutationFn: async (id: string) => {
      reopenTask(id);
      const task = getTask(id);
      if (task) await syncTaskReminder(task);
    },
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const task = getTask(id);
      archiveTask(id);
      if (task) await cancelTaskReminder(task);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const task = getTask(id);
      deleteTask(id);
      if (task) await cancelTaskReminder(task);
    },
    onSuccess: invalidate,
  });

  return { create, update, complete, reopen, archive, remove };
}
