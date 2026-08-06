import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { moduleForPath } from '@/features/hub/config/route-modules';
import { refreshModuleFlags } from '@/features/module-flags/services/module-flags';
import { useModuleFlagsStore } from '@/features/module-flags/store/module-flags-store';
import { usePrivateStore } from '@/features/private/store/private-store';

/** Keeps the remote switches current: once on launch, then on each foreground. */
export function useModuleFlagsSync(): void {
  useEffect(() => {
    void refreshModuleFlags();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshModuleFlags();
    });
    return () => subscription.remove();
  }, []);
}

export type ModuleAccess =
  | { allowed: true }
  | { allowed: false; reason: 'disabled'; message: string | null }
  | { allowed: false; reason: 'locked' };

/**
 * Whether this module may be opened right now, and why not.
 *
 * Two independent gates, and the order matters. The operator's switch is
 * checked first: a module pulled because it corrupts data should not be
 * reachable by unlocking the private space. The user's own "keep this private"
 * choice is second.
 */
export function useModuleAccess(moduleId: string): ModuleAccess {
  const flag = useModuleFlagsStore((s) => s.flags[moduleId]);
  const privatised = usePrivateStore((s) => s.privatised);
  const key = usePrivateStore((s) => s.key);

  if (flag && !flag.enabled) {
    return { allowed: false, reason: 'disabled', message: flag.message };
  }
  if (privatised.includes(moduleId) && !key) {
    return { allowed: false, reason: 'locked' };
  }
  return { allowed: true };
}

/**
 * Route-level guard, mounted once from the root layout.
 *
 * Watches the current path and redirects off any module that may not be open.
 * One place rather than a call on each screen, for the same reason usage
 * reporting is derived from the route: it covers every sub-route a module has
 * and every deep link into them, including the ones added later. A per-screen
 * guard is a thing to remember, and the screen where it is forgotten is the
 * one somebody's partner taps.
 *
 * Where it sends people differs by reason. A privatised module goes to the PIN
 * pad — the person is almost certainly its owner arriving from a stale back
 * stack, and asking for the PIN is the useful answer. A disabled module goes to
 * the Hub, where the card carries the operator's explanation.
 */
export function useModuleRouteGuard(): void {
  const router = useRouter();
  const pathname = usePathname();
  const flags = useModuleFlagsStore((s) => s.flags);
  const privatised = usePrivateStore((s) => s.privatised);
  const key = usePrivateStore((s) => s.key);
  const hydrated = usePrivateStore((s) => s.hydrated);

  useEffect(() => {
    // Before rehydration `privatised` is still the initial empty array, so
    // acting on it would let a privatised module render for a frame on every
    // cold start — the exact moment somebody else might be holding the phone.
    if (!hydrated) return;

    const moduleId = moduleForPath(pathname);
    if (!moduleId) return;

    if (flags[moduleId]?.enabled === false) {
      router.replace('/(tabs)/hub');
      return;
    }
    if (privatised.includes(moduleId) && key === null) {
      router.replace('/private/unlock');
    }
  }, [pathname, flags, privatised, key, hydrated, router]);
}
