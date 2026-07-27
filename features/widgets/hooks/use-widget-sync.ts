import { useEffect } from 'react';

import { syncTodayWidget } from '@/features/widgets/services/widget-data';
import { queryClient } from '@/lib/query-client';

/** Query keys whose changes should refresh the "Today" widget snapshot. */
const WATCHED = new Set(['tasks', 'habits', 'water-intake']);

/**
 * Refreshes the home-screen widget whenever tasks/habits/water data changes,
 * by subscribing to the react-query cache. This inverts the old dependency —
 * the widget module watches the features instead of each feature importing the
 * widget module — which removes the features↔widgets cycle. Debounced so a
 * burst of cache updates triggers a single refresh. Mounted once at root;
 * no-ops off Android (syncTodayWidget guards on platform).
 */
export function useWidgetSync() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void syncTodayWidget(), 500);
    };

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const key = event.query.queryKey?.[0];
      if (typeof key === 'string' && WATCHED.has(key)) schedule();
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}
