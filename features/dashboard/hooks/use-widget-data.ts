import { useQuery } from '@tanstack/react-query';

import {
  fetchCalendarPreview,
  fetchDailyQuote,
  fetchHabitRow,
  fetchProductivitySummary,
  fetchReflect,
  fetchRecentNotes,
  fetchTodayTasks,
  fetchWaterIntake,
} from '@/features/dashboard/services/dashboard-mock-data';

export function useTodayTasks() {
  return useQuery({ queryKey: ['dashboard', 'today-tasks'], queryFn: fetchTodayTasks });
}

export function useHabitRow() {
  return useQuery({ queryKey: ['dashboard', 'habit-row'], queryFn: fetchHabitRow });
}

export function useCalendarPreview() {
  return useQuery({ queryKey: ['dashboard', 'calendar-preview'], queryFn: fetchCalendarPreview });
}

export function useReflect() {
  return useQuery({ queryKey: ['dashboard', 'reflect'], queryFn: fetchReflect });
}

export function useRecentNotes() {
  return useQuery({ queryKey: ['dashboard', 'recent-notes'], queryFn: fetchRecentNotes });
}

export function useWaterIntake() {
  return useQuery({ queryKey: ['dashboard', 'water-intake'], queryFn: fetchWaterIntake });
}

export function useProductivitySummary() {
  return useQuery({ queryKey: ['dashboard', 'productivity-summary'], queryFn: fetchProductivitySummary });
}

export function useDailyQuote() {
  return useQuery({ queryKey: ['dashboard', 'daily-quote'], queryFn: fetchDailyQuote });
}
