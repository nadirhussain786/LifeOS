import {
  getSleepReminderNotificationId,
  getSleepSettings,
  setSleepReminderNotificationId,
} from '@/features/sleep/services/sleep-repository';
import { formatClock } from '@/features/sleep/services/sleep-stats';
import { cancelNotification, scheduleDailyNotification } from '@/lib/notifications';

function parseHHmm(value: string): { hour: number; minute: number } | null {
  if (!/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** Cancels the old bedtime reminder and, if enabled with a target bedtime,
 * schedules a fresh daily notification at that time. Called after every
 * settings save so the schedule never drifts from what's stored. */
export async function syncBedtimeReminder(): Promise<void> {
  await cancelNotification(getSleepReminderNotificationId());

  const settings = getSleepSettings();
  const time = settings.targetBedtime ? parseHHmm(settings.targetBedtime) : null;
  if (!settings.reminderEnabled || !time) {
    setSleepReminderNotificationId(null);
    return;
  }

  const id = await scheduleDailyNotification({
    title: 'Time to wind down 🌙',
    body: `Bedtime is ${formatClock(time.hour * 60 + time.minute)} — start getting ready for a good night's sleep.`,
    hour: time.hour,
    minute: time.minute,
  });
  setSleepReminderNotificationId(id);
}
