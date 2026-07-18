import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  getSleepSession,
  getSleepSessionByDate,
  getSleepSettings,
  listSleepSessions,
} from '@/features/sleep/services/sleep-repository';
import { buildTrend, computeSleepStats } from '@/features/sleep/services/sleep-stats';

export function useSleepSettings() {
  return useQuery({ queryKey: ['sleep', 'settings'], queryFn: async () => getSleepSettings() });
}

export function useSleepSessions() {
  return useQuery({ queryKey: ['sleep', 'sessions'], queryFn: async () => listSleepSessions() });
}

export function useSleepSession(id: string | undefined) {
  return useQuery({
    queryKey: ['sleep', 'session', id],
    queryFn: async () => (id ? getSleepSession(id) : null),
    enabled: !!id,
  });
}

export function useSleepSessionByDate(logDate: string | undefined) {
  return useQuery({
    queryKey: ['sleep', 'session-by-date', logDate],
    queryFn: async () => (logDate ? getSleepSessionByDate(logDate) : null),
    enabled: !!logDate,
  });
}

/**
 * Derives the dashboard's stats + chart series from the cached session list.
 * Stats always reflect all tracked nights (streaks/consistency need full
 * history); only the trend series is windowed to `rangeDays`.
 */
export function useSleepInsights(rangeDays: number) {
  const { data: sessions = [], isLoading: sessionsLoading } = useSleepSessions();
  const { data: settings, isLoading: settingsLoading } = useSleepSettings();

  const goalMinutes = settings?.goalMinutes ?? 480;

  const stats = useMemo(() => computeSleepStats(sessions, goalMinutes), [sessions, goalMinutes]);
  const trend = useMemo(() => buildTrend(sessions, goalMinutes, rangeDays), [sessions, goalMinutes, rangeDays]);
  const latest = sessions[0] ?? null;

  return {
    isLoading: sessionsLoading || settingsLoading,
    sessions,
    goalMinutes,
    targetBedtime: settings?.targetBedtime ?? null,
    targetWakeTime: settings?.targetWakeTime ?? null,
    stats,
    trend,
    latest,
  };
}
