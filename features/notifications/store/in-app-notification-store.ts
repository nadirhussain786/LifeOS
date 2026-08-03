import { create } from 'zustand';

import type { NotificationCategory } from '@/features/notifications/types/notification.types';

/**
 * The single in-app banner slot.
 *
 * Deliberately one-at-a-time and not persisted: a banner is a momentary
 * announcement, and the durable record of the same event is the notification
 * inbox (notification_log), which is written on the same arrival. If two
 * reminders land together the second replaces the first rather than queueing —
 * a queue would keep a stale nudge on screen after the user has already moved
 * on, and both are in the inbox regardless.
 */

export type InAppNotification = {
  id: number;
  category: NotificationCategory;
  title: string;
  body: string;
  /** Navigates to whatever the notification is about. */
  onPress?: () => void;
};

type State = {
  current: InAppNotification | null;
  present: (notification: Omit<InAppNotification, 'id'>) => number;
  dismiss: (id?: number) => void;
};

let nextId = 1;

export const useInAppNotificationStore = create<State>((set, get) => ({
  current: null,
  present: (notification) => {
    const id = nextId++;
    set({ current: { ...notification, id } });
    return id;
  },
  dismiss: (id) => {
    const current = get().current;
    if (!current) return;
    if (id !== undefined && current.id !== id) return;
    set({ current: null });
  },
}));
