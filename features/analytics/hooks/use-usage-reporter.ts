import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { flushUsage } from '@/features/analytics/services/usage-reporter';
import { trackModuleOpen, useUsageStore } from '@/features/analytics/store/usage-store';
import { moduleForPath } from '@/features/hub/config/route-modules';

/**
 * Turns navigation into the "opens" half of the usage rollup.
 *
 * Deliberately derived from the route rather than instrumented per screen:
 * one file that no module has to remember to call, which also means deep links
 * and back-navigation are counted the same way a tap is. The path is mapped to
 * a module id (see route-modules.ts, shared with the module guard) and then
 * discarded — record ids, never routes, or the rollup starts carrying
 * `/journal/entry/<uuid>` and stops being a rollup.
 */

export function useUsageReporter() {
  const pathname = usePathname();
  const hydrated = useUsageStore((s) => s.hydrated);
  const lastModule = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const module = moduleForPath(pathname);
    // Moving between screens of the same module is one visit, not five.
    if (!module || module === lastModule.current) return;
    lastModule.current = module;
    trackModuleOpen(module);
  }, [pathname, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void flushUsage();
    const sub = AppState.addEventListener('change', (state) => {
      // On the way out: the buffer is at its fullest and the request is not
      // competing with anything the user is waiting for.
      if (state === 'background' || state === 'active') void flushUsage();
    });
    return () => sub.remove();
  }, [hydrated]);
}
