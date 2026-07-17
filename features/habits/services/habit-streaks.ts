import { addDays, differenceInCalendarDays, getDay, parseISO, subDays } from 'date-fns';

import { toDateKey } from '@/lib/date';
import type { Habit, HabitLog, HabitSkip, HabitStreakSummary, HabitTodayStatus } from '@/features/habits/types/habit.types';

export { toDateKey } from '@/lib/date';

const MAX_STREAK_LOOKBACK_DAYS = 3650;

type ScheduleHabit = Pick<Habit, 'scheduleType' | 'scheduleDays' | 'scheduleIntervalDays' | 'createdAt'>;

/**
 * Whether a habit is expected on a given day. 'weekly' | 'monthly' | 'flexible'
 * deliberately resolve to "every day counts" for streak purposes — cadence-aware
 * weekly/monthly bucketing (e.g. "3 of 7 days this week") is a real behavioral
 * difference worth building, but is future extensibility, not Phase 1 scope.
 */
export function isHabitScheduledOn(habit: ScheduleHabit, dateKey: string): boolean {
  if (habit.scheduleType === 'custom_days') {
    const dow = getDay(parseISO(dateKey));
    return (habit.scheduleDays ?? []).includes(dow);
  }
  if (habit.scheduleType === 'every_x_days') {
    const interval = habit.scheduleIntervalDays ?? 1;
    const anchor = toDateKey(new Date(habit.createdAt));
    const days = differenceInCalendarDays(parseISO(dateKey), parseISO(anchor));
    return days >= 0 && days % interval === 0;
  }
  return true;
}

function indexByDate<T extends { logDate: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) map.set(row.logDate, row);
  return map;
}

export function getTodayStatus(
  habit: ScheduleHabit,
  logs: HabitLog[],
  skips: HabitSkip[],
  todayKey: string,
): HabitTodayStatus {
  if (!isHabitScheduledOn(habit, todayKey)) return 'not_scheduled';
  const logsByDate = indexByDate(logs);
  const skipsByDate = indexByDate(skips);
  if (logsByDate.has(todayKey)) return 'done';
  if (skipsByDate.has(todayKey)) return 'skipped';
  return 'not_yet';
}

/**
 * Derives current streak, best streak, and 30-day completion rate from raw
 * logs/skips. Nothing is stored — recomputed on read so editing or backfilling
 * a past log never requires a separate "resync streak" step.
 */
export function calculateHabitStreaks(
  habit: ScheduleHabit,
  logs: HabitLog[],
  skips: HabitSkip[],
  asOf: Date = new Date(),
): HabitStreakSummary {
  const logsByDate = indexByDate(logs);
  const skipsByDate = indexByDate(skips);

  let currentStreak = 0;
  let bestStreak = 0;
  let runningStreak = 0;
  let cursor = asOf;
  let isToday = true;

  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i += 1) {
    const dateKey = toDateKey(cursor);
    const scheduled = isHabitScheduledOn(habit, dateKey);

    if (scheduled) {
      if (logsByDate.has(dateKey)) {
        runningStreak += 1;
        bestStreak = Math.max(bestStreak, runningStreak);
      } else if (skipsByDate.has(dateKey)) {
        // excused — doesn't break the streak, doesn't extend it either
      } else if (isToday) {
        // today just hasn't happened yet; don't treat as a miss
      } else {
        runningStreak = 0;
        break;
      }
    }

    if (isToday) currentStreak = runningStreak;
    isToday = false;
    cursor = subDays(cursor, 1);

    // Stop scanning once we're clearly past anything that could still matter:
    // a run of 60 unscheduled/empty days beyond the habit's own history.
    if (i > 60 && runningStreak === 0 && logs.length === 0) break;
  }

  const windowStart = subDays(asOf, 29);
  let scheduledDays = 0;
  let completedDays = 0;
  for (let cursorDate = windowStart; cursorDate <= asOf; cursorDate = addDays(cursorDate, 1)) {
    const dateKey = toDateKey(cursorDate);
    if (!isHabitScheduledOn(habit, dateKey)) continue;
    if (skipsByDate.has(dateKey)) continue;
    scheduledDays += 1;
    if (logsByDate.has(dateKey)) completedDays += 1;
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    completionRate30d: scheduledDays === 0 ? 1 : completedDays / scheduledDays,
  };
}
