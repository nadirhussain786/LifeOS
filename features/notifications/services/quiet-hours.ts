import { useNotificationsStore } from '@/features/notifications/store/notifications-store';

/**
 * True when a minute-of-day falls inside the quiet window. The window may wrap
 * past midnight (e.g. 22:00 → 07:00), in which case start > end.
 */
export function isInQuietWindow(minuteOfDay: number, startMinutes: number, endMinutes: number): boolean {
  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) return minuteOfDay >= startMinutes && minuteOfDay < endMinutes;
  return minuteOfDay >= startMinutes || minuteOfDay < endMinutes;
}

/** Shifts a daily HH:mm reminder to the end of quiet hours if it lands inside
 * the window; otherwise returns it unchanged. No-ops when quiet hours are off. */
export function shiftDailyOutOfQuietHours(hour: number, minute: number): { hour: number; minute: number } {
  const { quietHoursEnabled, quietStartMinutes, quietEndMinutes } = useNotificationsStore.getState();
  if (!quietHoursEnabled) return { hour, minute };
  if (!isInQuietWindow(hour * 60 + minute, quietStartMinutes, quietEndMinutes)) return { hour, minute };
  return { hour: Math.floor(quietEndMinutes / 60), minute: quietEndMinutes % 60 };
}

/** Shifts a one-time timestamp to the next end-of-quiet-hours if it lands
 * inside the window; otherwise returns it unchanged. No-ops when off. */
export function shiftTimestampOutOfQuietHours(date: number): number {
  const { quietHoursEnabled, quietStartMinutes, quietEndMinutes } = useNotificationsStore.getState();
  if (!quietHoursEnabled) return date;
  const source = new Date(date);
  if (!isInQuietWindow(source.getHours() * 60 + source.getMinutes(), quietStartMinutes, quietEndMinutes)) return date;
  const shifted = new Date(date);
  shifted.setHours(Math.floor(quietEndMinutes / 60), quietEndMinutes % 60, 0, 0);
  if (shifted.getTime() <= date) shifted.setDate(shifted.getDate() + 1);
  return shifted.getTime();
}

/** "22:00 – 7:00" style label for the settings summary. */
export function formatQuietWindow(startMinutes: number, endMinutes: number): string {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const period = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return min === 0 ? `${h12} ${period}` : `${h12}:${String(min).padStart(2, '0')} ${period}`;
  };
  return `${fmt(startMinutes)} – ${fmt(endMinutes)}`;
}
