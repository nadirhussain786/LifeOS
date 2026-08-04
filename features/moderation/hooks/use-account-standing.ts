import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/features/auth/services/auth-store';
import {
  effectiveStatus,
  refreshAccountStanding,
} from '@/features/moderation/services/account-standing';
import { useModerationStore } from '@/features/moderation/store/moderation-store';

/**
 * Keeps the cached verdict fresh: once when a session appears, and again on
 * each foreground — which is also how a 24-hour automatic restriction clears
 * itself without the user doing anything.
 *
 * Clears on sign-out so the next account on a shared device starts clean.
 */
export function useAccountStandingSync() {
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    if (!session) {
      useModerationStore.getState().clear();
      return;
    }
    void refreshAccountStanding();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshAccountStanding();
    });
    return () => sub.remove();
  }, [session]);
}

/** Reactive verdict for UI. */
export function useAccountStanding() {
  const standing = useModerationStore((s) => s.standing);
  return { standing, status: effectiveStatus(standing) };
}
