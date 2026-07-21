import { cancelNotifications, scheduleDailyNotification } from '@/lib/notifications';
import type { WaterReminderSettings } from '@/features/water-intake/types/water-intake.types';

function timeSlots(settings: WaterReminderSettings): { hour: number; minute: number }[] {
  const slots: { hour: number; minute: number }[] = [];
  const startMinutes = settings.startHour * 60;
  const endMinutes = settings.endHour * 60;
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += settings.intervalMinutes) {
    slots.push({ hour: Math.floor(minutes / 60), minute: minutes % 60 });
  }
  return slots;
}

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
        title: 'Time to hydrate 💧',
        body: "It's been a while — grab some water.",
        hour: slot.hour,
        minute: slot.minute,
        data: { category: 'water', route: '/water-intake/history' },
      }),
    ),
  );
  return ids.filter((id): id is string => id !== null);
}
