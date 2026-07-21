import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CATEGORY_ORDER, type NotificationCategory } from '@/features/notifications/types/notification.types';

export type DeliveryMode = 'digest' | 'individual';

function allCategoriesEnabled(): Record<NotificationCategory, boolean> {
  return CATEGORY_ORDER.reduce(
    (acc, category) => {
      acc[category] = true;
      return acc;
    },
    {} as Record<NotificationCategory, boolean>,
  );
}

export type NotificationsState = {
  /** Kill-switch for every LifeOS reminder. When false, nothing schedules. */
  masterEnabled: boolean;
  /** Per-category on/off. A category toggled off stops new scheduling; existing
   * queued reminders are cleared when the owning item next syncs. */
  categories: Record<NotificationCategory, boolean>;
  /** When on, non-bypassing reminders that land in the window are shifted out. */
  quietHoursEnabled: boolean;
  /** Quiet window as minutes-from-midnight. Wraps past midnight when start > end. */
  quietStartMinutes: number;
  quietEndMinutes: number;
  /** 'digest' = one morning summary + urgent-only pings (the smart default);
   * 'individual' = every reminder fires on its own. */
  deliveryMode: DeliveryMode;
  digestHour: number;
  digestMinute: number;
  /** expo-notifications id for the currently-scheduled digest, so it can be
   * cancelled before rescheduling. */
  digestNotificationId: string | null;

  setMasterEnabled: (enabled: boolean) => void;
  setCategoryEnabled: (category: NotificationCategory, enabled: boolean) => void;
  setQuietHoursEnabled: (enabled: boolean) => void;
  setQuietHours: (startMinutes: number, endMinutes: number) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setDigestTime: (hour: number, minute: number) => void;
  setDigestNotificationId: (id: string | null) => void;
};

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      masterEnabled: true,
      categories: allCategoriesEnabled(),
      quietHoursEnabled: true,
      quietStartMinutes: 22 * 60,
      quietEndMinutes: 7 * 60,
      deliveryMode: 'digest',
      digestHour: 8,
      digestMinute: 0,
      digestNotificationId: null,

      setMasterEnabled: (masterEnabled) => set({ masterEnabled }),
      setCategoryEnabled: (category, enabled) =>
        set((state) => ({ categories: { ...state.categories, [category]: enabled } })),
      setQuietHoursEnabled: (quietHoursEnabled) => set({ quietHoursEnabled }),
      setQuietHours: (quietStartMinutes, quietEndMinutes) => set({ quietStartMinutes, quietEndMinutes }),
      setDeliveryMode: (deliveryMode) => set({ deliveryMode }),
      setDigestTime: (digestHour, digestMinute) => set({ digestHour, digestMinute }),
      setDigestNotificationId: (digestNotificationId) => set({ digestNotificationId }),
    }),
    {
      name: 'notifications-store',
      storage: createJSONStorage(() => AsyncStorage),
      // A category added in a later release won't exist in a persisted map read
      // back from an older install — backfill any missing ones to enabled.
      merge: (persisted, current) => {
        const saved = persisted as Partial<NotificationsState> | undefined;
        return {
          ...current,
          ...saved,
          categories: { ...allCategoriesEnabled(), ...(saved?.categories ?? {}) },
        };
      },
    },
  ),
);

/** True when a category may schedule right now — master on AND category on.
 * Callable outside React (used by the scheduling primitives). */
export function isCategoryEnabled(category: NotificationCategory): boolean {
  const state = useNotificationsStore.getState();
  return state.masterEnabled && (state.categories[category] ?? true);
}
