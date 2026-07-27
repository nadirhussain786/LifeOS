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
import { useTasksFilterStore } from '@/features/tasks/store/tasks-filter-store';
import type {
  CreateTaskInput,
  Task,
  TaskStatus,
  UpdateTaskInput,
} from '@/features/tasks/types/task.types';

export function useTaskMutations() {
  const queryClient = useQueryClient();

  // The home-screen widget refreshes itself by watching the query cache
  // (features/widgets/hooks/use-widget-sync) — the feature no longer imports the
  // widget module, avoiding a features↔widgets dependency cycle.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tasks'] });

  /**
   * Optimistically flips a task's status so its checkbox fills instantly,
   * without waiting for the write + refetch. Targets the exact list query key
   * (['tasks', filter, sort]) so it can't corrupt detail/other list queries;
   * the settle invalidation re-filters the list (e.g. drops a now-completed
   * task out of the 'active' filter). Returns a rollback context for onError.
   */
  const optimisticStatus = async (
    taskId: string,
    status: TaskStatus,
    completedAt: number | null,
  ) => {
    const { filter, sort } = useTasksFilterStore.getState();
    const key = ['tasks', filter, sort] as const;
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<Task[]>(key);
    queryClient.setQueryData<Task[]>(key, (old) =>
      old?.map((task) => (task.id === taskId ? { ...task, status, completedAt } : task)),
    );
    return { key, previous };
  };
  const rollback = (ctx?: { key: readonly unknown[]; previous: Task[] | undefined }) => {
    if (ctx) queryClient.setQueryData(ctx.key, ctx.previous);
  };

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
    onMutate: (id) => optimisticStatus(id, 'completed', Date.now()),
    onError: (_e, _v, ctx) => rollback(ctx),
    onSettled: invalidate,
  });

  const reopen = useMutation({
    mutationFn: async (id: string) => {
      reopenTask(id);
      const task = getTask(id);
      if (task) await syncTaskReminder(task);
    },
    onMutate: (id) => optimisticStatus(id, 'todo', null),
    onError: (_e, _v, ctx) => rollback(ctx),
    onSettled: invalidate,
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
