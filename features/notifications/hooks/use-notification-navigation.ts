import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { markNotificationRead } from '@/features/notifications/services/notification-log-repository';
import type { NotificationPayload } from '@/features/notifications/types/notification.types';
import { addNotificationResponseListener, getLastNotificationResponse } from '@/lib/notifications';

/**
 * Wires notification taps to navigation. Mounted once from the root layout:
 * subscribes to taps while the app is running AND checks the tap that
 * cold-started the app, so a reminder opened from a killed state still lands
 * on the right screen. Marks the tapped inbox row read as a side effect.
 */
export function useNotificationNavigation(): void {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handle = (payload: NotificationPayload | null) => {
      if (!payload) return;
      if (payload.logId) {
        markNotificationRead(payload.logId);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
      if (payload.route) {
        // Defer a tick so navigation runs after the router is mounted (matters
        // for the cold-start case).
        setTimeout(() => {
          router.push({ pathname: payload.route as never, params: (payload.params ?? {}) as never });
        }, 0);
      }
    };

    const unsubscribe = addNotificationResponseListener(handle);
    getLastNotificationResponse().then(handle);
    return unsubscribe;
  }, [router, queryClient]);
}
