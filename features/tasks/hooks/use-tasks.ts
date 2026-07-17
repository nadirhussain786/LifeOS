import { useQuery } from '@tanstack/react-query';

import { getCategoryById, listCategories, listTasks } from '@/features/tasks/services/tasks-repository';
import { useTasksFilterStore } from '@/features/tasks/store/tasks-filter-store';

export function useTasks() {
  const { filter, sort, searchQuery } = useTasksFilterStore();

  return useQuery({
    queryKey: ['tasks', filter, sort],
    queryFn: async () => listTasks(filter, sort),
    select: (tasks) =>
      searchQuery.trim()
        ? tasks.filter((task) => task.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
        : tasks,
  });
}

export function useTaskCategories() {
  return useQuery({ queryKey: ['task-categories'], queryFn: async () => listCategories() });
}

/** Resolves a category by id regardless of soft-delete, so an already-assigned task keeps showing its label. */
export function useTaskCategoryById(id: string | null) {
  return useQuery({
    queryKey: ['task-categories', 'detail', id],
    queryFn: async () => (id ? getCategoryById(id) : null),
    enabled: !!id,
  });
}
