import { setHabitReminderNotificationId } from '@/features/habits/services/habits-repository';
import { cancelNotification, scheduleDailyNotification } from '@/lib/notifications';
import type { Habit } from '@/features/habits/types/habit.types';

function parseReminderTime(reminderTime: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(reminderTime.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** Cancels any previously-scheduled reminder and, if the habit still wants
 * one, schedules a fresh DAILY notification at reminder_time — called after
 * every create/update so the schedule can never drift from what's saved. */
export async function syncHabitReminder(habit: Habit): Promise<void> {
  await cancelNotification(habit.reminderNotificationId);

  const parsed = habit.reminderTime ? parseReminderTime(habit.reminderTime) : null;
  if (!parsed) {
    setHabitReminderNotificationId(habit.id, null);
    return;
  }

  const id = await scheduleDailyNotification({
    title: `${habit.emoji ?? '💪'} ${habit.name}`,
    body: "Time to check in on this habit.",
    hour: parsed.hour,
    minute: parsed.minute,
  });
  setHabitReminderNotificationId(habit.id, id);
}

export async function cancelHabitReminder(habit: Pick<Habit, 'id' | 'reminderNotificationId'>): Promise<void> {
  await cancelNotification(habit.reminderNotificationId);
  setHabitReminderNotificationId(habit.id, null);
}
