import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  getStudySettings,
  listStudySessions,
  listStudySubjects,
} from '@/features/study/services/study-repository';
import { buildStudyTrend, computeStudyInsights, computeStudyStats, subjectBreakdown, todayKey } from '@/features/study/services/study-stats';
import { format, subDays } from 'date-fns';

export function useStudySubjects() {
  return useQuery({ queryKey: ['study', 'subjects'], queryFn: async () => listStudySubjects() });
}

export function useStudySessions() {
  return useQuery({ queryKey: ['study', 'sessions'], queryFn: async () => listStudySessions() });
}

export function useStudySettings() {
  return useQuery({ queryKey: ['study', 'settings'], queryFn: async () => getStudySettings() });
}

/** Aggregates the study dashboard: today's progress vs goal, headline stats,
 * subject split and the daily trend series. */
export function useStudyInsights(rangeDays: number) {
  const { data: sessions = [], isLoading: sessionsLoading } = useStudySessions();
  const { data: subjects = [], isLoading: subjectsLoading } = useStudySubjects();
  const { data: settings, isLoading: settingsLoading } = useStudySettings();

  const dailyGoalMinutes = settings?.dailyGoalMinutes ?? 120;
  const dailyGoalSeconds = dailyGoalMinutes * 60;

  const stats = useMemo(() => computeStudyStats(sessions), [sessions]);
  const trend = useMemo(
    () => buildStudyTrend(sessions, rangeDays, dailyGoalSeconds),
    [sessions, rangeDays, dailyGoalSeconds],
  );
  const breakdown = useMemo(
    () => subjectBreakdown(sessions, subjects, format(subDays(new Date(), 6), 'yyyy-MM-dd')),
    [sessions, subjects],
  );
  const insights = useMemo(() => computeStudyInsights(sessions), [sessions]);

  return {
    isLoading: sessionsLoading || subjectsLoading || settingsLoading,
    sessions,
    subjects,
    settings: settings ?? { dailyGoalMinutes, focusMinutes: 25, breakMinutes: 5 },
    dailyGoalSeconds,
    stats,
    trend,
    breakdown,
    insights,
    todayKey: todayKey(),
  };
}
