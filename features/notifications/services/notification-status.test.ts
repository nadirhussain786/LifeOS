import { notificationStatus } from '@/features/notifications/services/notification-status';
import type { LoggedNotification } from '@/features/notifications/types/notification.types';

/**
 * What the in-app notification centre counts as having arrived.
 *
 * Delivery used to be inferred from `scheduledAt <= now`, which is unanswerable
 * for a repeating reminder: its scheduledAt is always the NEXT fire, so it read
 * as "scheduled" forever. The badge worked around that by filtering to
 * `repeats = 'none'` — which meant every habit, hydration, journal, bedtime and
 * digest notification in the app was invisible in-app, and pushes (never
 * scheduled on this device) had no row to be counted at all.
 */

const HOUR = 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

const row = (over: Partial<LoggedNotification> = {}): LoggedNotification => ({
  id: 'n1',
  notificationId: 'os-1',
  category: 'habits',
  title: 'Gym',
  body: '',
  route: null,
  params: null,
  scheduledAt: NOW + HOUR,
  repeats: 'none',
  deliveredAt: null,
  readAt: null,
  canceledAt: null,
  createdAt: NOW,
  ...over,
});

describe('notificationStatus', () => {
  it('is scheduled while a one-time reminder is still in the future', () => {
    expect(notificationStatus(row(), NOW)).toBe('scheduled');
  });

  it('is delivered once a one-time reminder’s moment has passed', () => {
    expect(notificationStatus(row({ scheduledAt: NOW - HOUR }), NOW)).toBe('delivered');
  });

  it('treats a recorded arrival as delivered whatever the clock says', () => {
    // The whole point: a daily habit reminder that fired an hour ago still has
    // a scheduledAt in the future, because that field is its NEXT occurrence.
    expect(
      notificationStatus(
        row({ repeats: 'daily', scheduledAt: NOW + 23 * HOUR, deliveredAt: NOW - HOUR }),
        NOW,
      ),
    ).toBe('delivered');
  });

  it('leaves a repeating reminder that has not fired yet as scheduled', () => {
    expect(notificationStatus(row({ repeats: 'daily', scheduledAt: NOW + HOUR }), NOW)).toBe(
      'scheduled',
    );
    expect(notificationStatus(row({ repeats: 'weekly', scheduledAt: NOW + HOUR }), NOW)).toBe(
      'scheduled',
    );
  });

  it('counts a push as delivered — it was never scheduled to begin with', () => {
    expect(
      notificationStatus(
        row({ category: 'split', notificationId: null, deliveredAt: NOW - 60_000 }),
        NOW,
      ),
    ).toBe('delivered');
  });

  it('reports cancellation ahead of everything else', () => {
    expect(
      notificationStatus(row({ deliveredAt: NOW - HOUR, canceledAt: NOW - 60_000 }), NOW),
    ).toBe('canceled');
  });
});
