import type { LoggedNotification } from '@/features/notifications/types/notification.types';

/**
 * Whether a logged notification is still waiting, has arrived, or was called
 * off.
 *
 * Lives here rather than beside the types because the types module imports
 * Lucide icons for its category table — pulling a whole icon package into
 * anything that only wants to ask "has this arrived yet?", and making the
 * function untestable without a native runtime.
 */

export type LoggedNotificationStatus = 'scheduled' | 'delivered' | 'canceled';

export function notificationStatus(
  row: Pick<LoggedNotification, 'scheduledAt' | 'canceledAt' | 'repeats' | 'deliveredAt'>,
  now: number,
): LoggedNotificationStatus {
  if (row.canceledAt) return 'canceled';
  // Recorded delivery wins over any inference. Everything below is the
  // fallback for rows written before arrivals were tracked.
  if (row.deliveredAt) return 'delivered';
  // A repeating reminder's scheduledAt is its NEXT fire, so it can never be
  // read as past — which is exactly why arrivals are now recorded.
  if (row.repeats === 'daily' || row.repeats === 'weekly') return 'scheduled';
  return row.scheduledAt > now ? 'scheduled' : 'delivered';
}
