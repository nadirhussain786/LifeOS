import { useQuery } from '@tanstack/react-query';

import {
  getHabitCategoryById,
  listHabitCategories,
  listHabitsWithToday,
} from '@/features/habits/services/habits-repository';
import { useHabitsFilterStore } from '@/features/habits/store/habits-filter-store';

export function useHabits() {
  const { searchQuery, showArchived } = useHabitsFilterStore();

  return useQuery({
    queryKey: ['habits', showArchived],
    queryFn: async () => listHabitsWithToday(showArchived),
    select: (habits) =>
      searchQuery.trim()
        ? habits.filter((habit) => habit.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
        : habits,
  });
}

export function useHabitCategories() {
  return useQuery({ queryKey: ['habit-categories'], queryFn: async () => listHabitCategories() });
}

export function useHabitCategoryById(id: string | null) {
  return useQuery({
    queryKey: ['habit-categories', 'detail', id],
    queryFn: async () => (id ? getHabitCategoryById(id) : null),
    enabled: !!id,
  });
}
