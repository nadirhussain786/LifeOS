import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/features/auth/services/auth-store';
import { syncNow } from '@/features/sync/services/sync-engine';
import { useSyncStore } from '@/features/sync/store/sync-store';

/** Reactive sync status for UI (Sync & Account screen). */
export function useSyncStatus() {
  const status = useSyncStore((s) => s.status);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const lastError = useSyncStore((s) => s.lastError);
  return { status, lastSyncedAt, lastError };
}

/**
 * Drives automatic sync while signed in with auto-sync on: once when the
 * session appears, and again whenever the app returns to the foreground.
 * Mounted once from the root layout. No-ops for guests (syncNow guards on uid).
 */
export function useSyncTrigger() {
  const session = useAuthStore((s) => s.session);
  const autoSync = useSyncStore((s) => s.autoSync);

  useEffect(() => {
    if (!session || !autoSync) return;
    void syncNow();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    return () => sub.remove();
  }, [session, autoSync]);
}
