import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { recordNotificationDelivery } from '@/features/notifications/services/notification-log-repository';
import { useInAppNotificationStore } from '@/features/notifications/store/in-app-notification-store';
import {
  CATEGORY_META,
  type NotificationCategory,
} from '@/features/notifications/types/notification.types';
import { reportError } from '@/lib/error-reporting';
import { addNotificationReceivedListener } from '@/lib/notifications';

/**
 * Turns an arriving notification into something the app itself can show.
 *
 * Two things happen on arrival, and neither used to:
 *
 *  1. **It is written down.** The inbox was a log of what had been *scheduled*,
 *     with delivery inferred from the clock — which excluded every repeating
 *     reminder (their `scheduledAt` is always the next fire) and every push
 *     (never scheduled on this device at all). So a shared-group notification
 *     could buzz the phone and leave no trace anywhere in the app.
 *  2. **It is presented in-app.** With the OS banner suppressed while the app
 *     is foregrounded, this is what the user actually sees — in the app's own
 *     type, tinted by module, and tappable straight through to the thing.
 *
 * Mounted once from the root layout. Renders nothing.
 */
export function useNotificationCenter(): void {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = addNotificationReceivedListener((received) => {
      const { payload } = received;
      // A push may carry no category. `split` is the only source of those, and
      // an uncategorised arrival still deserves a row rather than vanishing.
      const category: NotificationCategory =
        payload.category && payload.category in CATEGORY_META ? payload.category : 'split';

      try {
        recordNotificationDelivery({
          logId: payload.logId,
          notificationId: received.notificationId,
          category,
          title: received.title,
          body: received.body,
          route: payload.route ?? null,
          params: payload.params ?? null,
        });
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        // A failed write must not cost the user the banner as well.
        reportError(error, { scope: 'notification-center' });
      }

      useInAppNotificationStore.getState().present({
        category,
        title: received.title,
        body: received.body,
        onPress: payload.route
          ? () =>
              router.push({
                pathname: payload.route as never,
                params: (payload.params ?? {}) as never,
              })
          : undefined,
      });
    });

    return unsubscribe;
  }, [router, queryClient]);
}
