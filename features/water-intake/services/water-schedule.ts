import { Platform } from 'react-native';

import type { WaterReminderSettings } from '@/features/water-intake/types/water-intake.types';

/**
 * When hydration reminders fire. Pure and dependency-free so it can be tested
 * without a native runtime — this is the arithmetic that decides how many OS
 * notification slots the app spends.
 */

/**
 * How many hydration slots this feature may take.
 *
 * Every slot is a separate repeating OS notification, and iOS keeps only 64
 * pending ones in total — silently discarding the rest, with no say from the
 * app over which survive. Every 30 minutes from 08:00 to 21:00 is 27 slots,
 * which on its own can crowd out task due-times and calendar alerts. Hydration
 * is the least consequential reminder in the app, so it is the one that gets
 * bounded; the window is preserved by spreading the allowance across it rather
 * than truncating the afternoon.
 */
const MAX_WATER_SLOTS = Platform.OS === 'ios' ? 12 : 24;

export function timeSlots(settings: WaterReminderSettings): { hour: number; minute: number }[] {
  const startMinutes = settings.startHour * 60;
  const endMinutes = settings.endHour * 60;
  if (endMinutes <= startMinutes) return [];

  const requested = Math.floor((endMinutes - startMinutes) / settings.intervalMinutes) + 1;
  const count = Math.min(requested, MAX_WATER_SLOTS);
  // Widen the gap rather than dropping the tail, so reminders still cover the
  // whole waking window the user chose.
  const step = count > 1 ? (endMinutes - startMinutes) / (count - 1) : 0;

  const slots: { hour: number; minute: number }[] = [];
  for (let i = 0; i < count; i++) {
    const minutes = Math.round(startMinutes + step * i);
    slots.push({ hour: Math.floor(minutes / 60), minute: minutes % 60 });
  }
  return slots;
}
