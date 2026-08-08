import { useEffect } from 'react';

import { useModuleFlagsStore } from '@/features/module-flags/store/module-flags-store';
import { usePrivateStore } from '@/features/private/store/private-store';
import { useLanguageStore } from '@/features/settings/store/language-store';
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
 *
 * It also watches the two switches that can hide a row entirely — the user's
 * privatised list and the operator's flags. Those change no query data at all,
 * so without this the home screen would keep displaying a module's counts after
 * it was moved behind the vault, until something unrelated happened to
 * invalidate a task. Subscribed here rather than called from the settings screen
 * so every path that can flip them is covered, including a flag arriving from
 * the server while the app sits in the foreground.
 */
export function useWidgetSync() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void syncTodayWidget(), 500);
    };

    const unsubscribeCache = queryClient.getQueryCache().subscribe((event) => {
      const key = event.query.queryKey?.[0];
      if (typeof key === 'string' && WATCHED.has(key)) schedule();
    });

    const unsubscribePrivate = usePrivateStore.subscribe((state, previous) => {
      if (state.privatised !== previous.privatised) schedule();
    });

    const unsubscribeFlags = useModuleFlagsStore.subscribe((state, previous) => {
      if (state.flags !== previous.flags) schedule();
    });

    // The widget's strings are formatted by the app and stored in the snapshot,
    // so a language change has to rewrite it. Without this the home screen keeps
    // yesterday's language indefinitely — nothing else in the app would ever
    // invalidate it, and the user has no way to force one.
    const unsubscribeLanguage = useLanguageStore.subscribe((state, previous) => {
      if (state.language !== previous.language) schedule();
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribeCache();
      unsubscribePrivate();
      unsubscribeFlags();
      unsubscribeLanguage();
    };
  }, []);
}
