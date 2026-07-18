import { create } from 'zustand';

import type { GoalCategory, GoalStatus } from '@/features/goals/types/goal.types';

export type GoalSort = 'manual' | 'progress' | 'due' | 'priority' | 'created';

type GoalsFilterState = {
  searchQuery: string;
  statusFilter: GoalStatus;
  categoryFilter: GoalCategory | 'all';
  sort: GoalSort;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: GoalStatus) => void;
  setCategoryFilter: (category: GoalCategory | 'all') => void;
  setSort: (sort: GoalSort) => void;
};

export const useGoalsFilterStore = create<GoalsFilterState>((set) => ({
  searchQuery: '',
  statusFilter: 'active',
  categoryFilter: 'all',
  sort: 'manual',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setSort: (sort) => set({ sort }),
}));
