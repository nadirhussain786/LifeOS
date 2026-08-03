import { setHabitReminderNotificationId } from '@/features/habits/services/habits-repository';
import i18n from '@/lib/i18n';
import {
  cancelPackedNotifications,
  packNotificationIds,
  scheduleDailyNotification,
  scheduleWeeklyNotification,
} from '@/lib/notifications';
import { reminderWeekdays } from '@/features/habits/services/habit-schedule';
import type { Habit } from '@/features/habits/types/habit.types';

function parseReminderTime(reminderTime: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(reminderTime.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** Cancels any previously-scheduled reminders and, if the habit still wants
 * one, schedules fresh notifications at reminder_time — one per scheduled
 * weekday, or a single daily trigger when the habit runs every day. Called
 * after every create/update so the schedule can never drift from what's saved. */
export async function syncHabitReminder(habit: Habit): Promise<void> {
  await cancelPackedNotifications(habit.reminderNotificationId);

  const parsed = habit.reminderTime ? parseReminderTime(habit.reminderTime) : null;
  if (!parsed) {
    setHabitReminderNotificationId(habit.id, null);
    return;
  }

  const content = {
    title: `${habit.emoji ?? '💪'} ${habit.name}`,
    body: i18n.t('habits.reminderBody'),
    data: { category: 'habits', route: '/habits' } as const,
  };

  const weekdays = reminderWeekdays(habit);

  const ids =
    weekdays === null
      ? [await scheduleDailyNotification({ ...content, ...parsed })]
      : await Promise.all(
          weekdays.map((weekday) => scheduleWeeklyNotification({ ...content, weekday, ...parsed })),
        );

  setHabitReminderNotificationId(habit.id, packNotificationIds(ids));
}

export async function cancelHabitReminder(
  habit: Pick<Habit, 'id' | 'reminderNotificationId'>,
): Promise<void> {
  await cancelPackedNotifications(habit.reminderNotificationId);
  setHabitReminderNotificationId(habit.id, null);
}
