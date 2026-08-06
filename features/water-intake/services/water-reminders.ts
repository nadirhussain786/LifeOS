import i18n from '@/lib/i18n';
import { cancelNotifications, scheduleDailyNotification } from '@/lib/notifications';
import { timeSlots } from '@/features/water-intake/services/water-schedule';
import type { WaterReminderSettings } from '@/features/water-intake/types/water-intake.types';

export async function cancelWaterReminders(notificationIds: string[]): Promise<void> {
  await cancelNotifications(notificationIds);
}

/** Schedules one DAILY-repeating local notification per interval slot within
 * the reminder window (e.g. every hour from 8am–9pm = 14 notifications) —
 * expo-notifications has no native "repeat every N minutes within a daily
 * window" trigger, so this composes it from plain daily-at-HH:mm triggers. */
export async function scheduleWaterReminders(settings: WaterReminderSettings): Promise<string[]> {
  if (!settings.enabled) return [];

  const slots = timeSlots(settings);
  const ids = await Promise.all(
    slots.map((slot) =>
      scheduleDailyNotification({
        title: i18n.t('water.reminderNotifTitle'),
        body: i18n.t('water.reminderNotifBody'),
        hour: slot.hour,
        minute: slot.minute,
        data: { category: 'water', route: '/water-intake/history' },
      }),
    ),
  );
  return ids.filter((id): id is string => id !== null);
}
