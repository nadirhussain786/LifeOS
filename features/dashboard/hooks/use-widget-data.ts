import { format, isToday } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

import { fetchDailyQuote } from '@/features/dashboard/services/dashboard-mock-data';
import { listHabitsWithToday } from '@/features/habits/services/habits-repository';
import { getEntryByDate, listEntriesBetween } from '@/features/journal/services/journal-repository';
import { calculateJournalStreak } from '@/features/journal/services/journal-streak';
import { stripMarkdown } from '@/features/notes/services/markdown';
import { listRecentNotes } from '@/features/notes/services/notes-repository';
import { getDueBucket } from '@/features/tasks/services/task-grouping';
import { getWeeklyCompletionStats, listTasks } from '@/features/tasks/services/tasks-repository';
import { listTimelineForDate } from '@/features/timeline/services/timeline-repository';
import { toDateKey } from '@/lib/date';
import type { HabitRowData, RecentNotesData, ReflectData, TodayTasksData, TodayTimelineData } from '@/features/dashboard/types/dashboard.types';

export function useTodayTasks() {
  return useQuery({
    queryKey: ['dashboard', 'today-tasks'],
    queryFn: async (): Promise<TodayTasksData> => {
      const dueTodayOrOverdue = listTasks('active', 'due-date').filter((task) => {
        const bucket = getDueBucket(task);
        return bucket === 'overdue' || bucket === 'today';
      });
      const completedToday = listTasks('completed', 'due-date').filter(
        (task) => task.completedAt !== null && isToday(task.completedAt),
      );

      return {
        completedCount: completedToday.length,
        totalCount: completedToday.length + dueTodayOrOverdue.length,
        upcoming: dueTodayOrOverdue.slice(0, 4).map((task) => ({
          id: task.id,
          title: task.title,
          done: false,
          dueLabel:
            getDueBucket(task) === 'overdue'
              ? 'Overdue'
              : task.hasDueTime && task.dueDate
                ? format(task.dueDate, 'h:mm a')
                : undefined,
        })),
      };
    },
  });
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

export function useTodayTimeline() {
  return useQuery({
    queryKey: ['dashboard', 'today-timeline'],
    queryFn: async (): Promise<TodayTimelineData> => ({ events: listTimelineForDate(toDateKey(new Date())) }),
  });
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

export function useProductivitySummary() {
  return useQuery({ queryKey: ['dashboard', 'productivity-summary'], queryFn: async () => getWeeklyCompletionStats() });
}

export function useDailyQuote() {
  return useQuery({ queryKey: ['dashboard', 'daily-quote'], queryFn: fetchDailyQuote });
}
