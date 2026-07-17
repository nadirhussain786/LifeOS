import * as Notifications from 'expo-notifications';

import type { WaterReminderSettings } from '@/features/water-intake/types/water-intake.types';

export async function requestReminderPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return requested.granted;
}

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
  await Promise.all(notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}

/** Schedules one DAILY-repeating local notification per interval slot within
 * the reminder window (e.g. every hour from 8am–9pm = 14 notifications) —
 * expo-notifications has no native "repeat every N minutes within a daily
 * window" trigger, so this composes it from plain daily-at-HH:mm triggers. */
export async function scheduleWaterReminders(settings: WaterReminderSettings): Promise<string[]> {
  if (!settings.enabled) return [];

  const granted = await requestReminderPermission();
  if (!granted) return [];

  const slots = timeSlots(settings);
  return Promise.all(
    slots.map((slot) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time to hydrate 💧',
          body: "It's been a while — grab some water.",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: slot.hour,
          minute: slot.minute,
        },
      }),
    ),
  );
}
