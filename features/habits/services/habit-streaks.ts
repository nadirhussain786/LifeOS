import { addDays, differenceInCalendarDays, getDay, parseISO, subDays } from 'date-fns';

import { toDateKey } from '@/lib/date';
import type {
  Habit,
  HabitLog,
  HabitSkip,
  HabitStreakSummary,
  HabitTodayStatus,
} from '@/features/habits/types/habit.types';

export { toDateKey } from '@/lib/date';

const MAX_STREAK_LOOKBACK_DAYS = 3650;

type ScheduleHabit = Pick<
  Habit,
  'scheduleType' | 'scheduleDays' | 'scheduleIntervalDays' | 'createdAt'
>;

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

  // Current streak: walk back from today, stop at the first real miss. Today
  // hasn't-happened-yet and excused skips are transparent (neither break nor
  // extend). Counts logged days in the run ending at/just-before today.
  let currentStreak = 0;
  {
    let run = 0;
    let cursor = asOf;
    let isToday = true;
    for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i += 1) {
      const dateKey = toDateKey(cursor);
      if (isHabitScheduledOn(habit, dateKey)) {
        if (logsByDate.has(dateKey)) run += 1;
        else if (skipsByDate.has(dateKey)) {
          // excused
        } else if (isToday) {
          // pending — not a miss
        } else break;
      }
      isToday = false;
      cursor = subDays(cursor, 1);
    }
    currentStreak = run;
  }

  // Best streak: full-history scan (no early break) from today back to the
  // earliest log, so an older longer run is found even after a recent lapse.
  let bestStreak = currentStreak;
  {
    let run = 0;
    let cursor = asOf;
    let isToday = true;
    const earliestLog = logs.reduce(
      (min, l) => Math.min(min, parseISO(l.logDate).getTime()),
      asOf.getTime(),
    );
    for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i += 1) {
      if (cursor.getTime() < earliestLog) break;
      const dateKey = toDateKey(cursor);
      if (isHabitScheduledOn(habit, dateKey)) {
        if (logsByDate.has(dateKey)) {
          run += 1;
          bestStreak = Math.max(bestStreak, run);
        } else if (skipsByDate.has(dateKey)) {
          // excused
        } else if (isToday) {
          // pending
        } else run = 0;
      }
      isToday = false;
      cursor = subDays(cursor, 1);
    }
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
