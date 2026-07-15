import { create } from 'zustand';

import type { TaskListFilter, TaskSort } from '@/features/tasks/types/task.types';

type TasksFilterState = {
  filter: TaskListFilter;
  sort: TaskSort;
  searchQuery: string;
  setFilter: (filter: TaskListFilter) => void;
  setSort: (sort: TaskSort) => void;
  setSearchQuery: (query: string) => void;
};

export const useTasksFilterStore = create<TasksFilterState>((set) => ({
  filter: 'active',
  sort: 'due-date',
  searchQuery: '',
  setFilter: (filter) => set({ filter }),
  setSort: (sort) => set({ sort }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
