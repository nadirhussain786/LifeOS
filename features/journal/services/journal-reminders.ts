import { cancelNotification, scheduleDailyNotification } from '@/lib/notifications';
import type { JournalReminderSettings } from '@/features/journal/store/journal-reminder-store';

export async function cancelJournalReminder(notificationId: string | null): Promise<void> {
  await cancelNotification(notificationId);
}

/** Schedules a single DAILY-repeating "write today's entry" nudge. */
export async function scheduleJournalReminder(settings: JournalReminderSettings): Promise<string | null> {
  if (!settings.enabled) return null;

  return scheduleDailyNotification({
    title: 'Journal 📖',
    body: "Take a minute to write today's entry.",
    hour: settings.hour,
    minute: settings.minute,
  });
}
