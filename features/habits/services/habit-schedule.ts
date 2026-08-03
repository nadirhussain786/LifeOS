import type { Habit } from '@/features/habits/types/habit.types';

/**
 * Which days a habit's reminder belongs on. Pure and dependency-free so it can
 * be tested without a native runtime.
 */

/**
 * The days this habit's reminder should actually fire on.
 *
 * `null` means every day. Anything else is the habit's own schedule — which the
 * reminder used to ignore completely: every habit got a DAILY trigger, so one
 * scheduled for Mon/Wed/Fri nagged on all seven days, including the four it was
 * not due. `isDueOn` in habit-streaks has always used these same 0-based
 * weekday ints (0 = Sunday); the reminder simply never consulted them.
 *
 * `interval` habits ("every 3 days") can't be expressed as a repeating OS
 * trigger at all, so they keep a daily nudge — over-reminding is a smaller
 * failure than a habit that never reminds, and the app has nowhere to run code
 * on the days in between.
 */
export function reminderWeekdays(habit: Habit): number[] | null {
  if (habit.scheduleType !== 'custom_days') return null;
  const days = habit.scheduleDays ?? [];
  // An empty custom schedule means no day is selected; a daily reminder would
  // be wrong in the other direction, so fire on none.
  return days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
}
