import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/features/auth/services/auth-store';
import {
  effectiveStatus,
  refreshAccountStanding,
} from '@/features/moderation/services/account-standing';
import { processDeviceCommands } from '@/features/moderation/services/device-commands';
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
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => sub.remove();
  }, [session]);
}

/**
 * One pass: fetch the verdict, then run anything the operator has queued for
 * this device.
 *
 * Ordered, not parallel. The verdict decides whether the app is usable at all,
 * and a wipe that runs while the UI is still rendering the previous account's
 * content produces a screen full of rows that no longer exist. Fetching first
 * means the block screen is already up by the time the database empties.
 */
async function check(): Promise<void> {
  const standing = await refreshAccountStanding();

  // Cleared here rather than on sign-out: this is the moment it stops being
  // true, and it has to survive a sign-out on the blocked device so the person
  // can still read what happened.
  if (effectiveStatus(standing) === 'active') {
    if (useModerationStore.getState().wipeOutcome) {
      useModerationStore.setState({ wipeOutcome: null });
    }
    return;
  }

  await processDeviceCommands();
}

/** Reactive verdict for UI. */
export function useAccountStanding() {
  const standing = useModerationStore((s) => s.standing);
  return { standing, status: effectiveStatus(standing) };
}
