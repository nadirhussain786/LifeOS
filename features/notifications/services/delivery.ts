import { syncDigest } from '@/features/notifications/services/digest';
import { useNotificationsStore } from '@/features/notifications/store/notifications-store';
import { CATEGORY_META, CATEGORY_ORDER, type NotificationCategory } from '@/features/notifications/types/notification.types';
import { cancelScheduledInCategory } from '@/lib/notifications';

/**
 * Categories that "smart digest" delivery folds into the morning summary
 * instead of firing on their own — every non-time-critical nudge. Time-critical
 * categories (bypassQuietHours: due tasks, calendar events, money, bedtime)
 * are excluded and always ping individually, as is the digest itself.
 */
export const CONSOLIDATED_CATEGORIES: NotificationCategory[] = CATEGORY_ORDER.filter(
  (category) => category !== 'digest' && !CATEGORY_META[category].bypassQuietHours,
);

/**
 * Brings scheduled notifications in line with the current delivery mode and
 * refreshes the morning digest. In digest mode it cancels any already-queued
 * nudge reminders so the day's low-signal reminders arrive only as the one
 * morning summary; the scheduling primitives then stop new ones from being
 * queued (see passesCategoryGate in lib/notifications). Idempotent — safe to
 * run on every launch and whenever the relevant settings change.
 *
 * Switching back to individual delivery can't recreate the cancelled reminders
 * (their text/timing lives on each item); they return the next time each item
 * is saved. The Notification Settings screen states this.
 */
export async function applyDeliveryMode(): Promise<void> {
  const { deliveryMode } = useNotificationsStore.getState();
  if (deliveryMode === 'digest') {
    await Promise.all(CONSOLIDATED_CATEGORIES.map((category) => cancelScheduledInCategory(category)));
  }
  await syncDigest();
}
