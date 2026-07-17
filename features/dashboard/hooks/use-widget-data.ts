import { useQuery } from '@tanstack/react-query';

import {
  fetchCalendarPreview,
  fetchDailyQuote,
  fetchProductivitySummary,
  fetchTodayTasks,
  fetchWaterIntake,
} from '@/features/dashboard/services/dashboard-mock-data';
import { listHabitsWithToday } from '@/features/habits/services/habits-repository';
import { getEntryByDate, listEntriesBetween } from '@/features/journal/services/journal-repository';
import { calculateJournalStreak } from '@/features/journal/services/journal-streak';
import { stripMarkdown } from '@/features/notes/services/markdown';
import { listRecentNotes } from '@/features/notes/services/notes-repository';
import { toDateKey } from '@/lib/date';
import type { HabitRowData, RecentNotesData, ReflectData } from '@/features/dashboard/types/dashboard.types';

export function useTodayTasks() {
  return useQuery({ queryKey: ['dashboard', 'today-tasks'], queryFn: fetchTodayTasks });
}

export function useHabitRow() {
  return useQuery({
    queryKey: ['dashboard', 'habit-row'],
    queryFn: async (): Promise<HabitRowData> => ({
      habits: listHabitsWithToday()
        .slice(0, 8)
        .map((habit) => ({
          id: habit.id,
          name: habit.name,
          emoji: habit.emoji ?? '🔥',
          streak: habit.currentStreak,
          doneToday: habit.todayStatus === 'done',
        })),
    }),
  });
}

export function useCalendarPreview() {
  return useQuery({ queryKey: ['dashboard', 'calendar-preview'], queryFn: fetchCalendarPreview });
}

export function useReflect() {
  return useQuery({
    queryKey: ['dashboard', 'reflect'],
    queryFn: async (): Promise<ReflectData> => {
      const todayKey = toDateKey(new Date());
      const yearStart = toDateKey(new Date(Date.now() - 366 * 24 * 60 * 60 * 1000));
      const entries = listEntriesBetween(yearStart, todayKey);
      const todayEntry = getEntryByDate(todayKey);
      return {
        todaysMood: todayEntry?.mood ?? null,
        journalStreak: calculateJournalStreak(entries.map((entry) => entry.entryDate)),
        hasWrittenToday: !!todayEntry?.body.trim(),
      };
    },
  });
}

export function useRecentNotes() {
  return useQuery({
    queryKey: ['dashboard', 'recent-notes'],
    queryFn: async (): Promise<RecentNotesData> => ({
      notes: listRecentNotes(3).map((note) => ({
        id: note.id,
        title: note.title || 'Untitled note',
        snippet: note.body ? stripMarkdown(note.body).slice(0, 80) : '',
        updatedAt: new Date(note.updatedAt),
      })),
    }),
  });
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
