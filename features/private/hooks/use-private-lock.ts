import { useEffect } from 'react';
import { AppState } from 'react-native';

import { AUTO_LOCK_GRACE_MS, usePrivateStore } from '@/features/private/store/private-store';

/**
 * Locks the private space when the app leaves the foreground.
 *
 * The grace period is the whole subtlety. Picking a photo, taking one, or
 * opening a share sheet all background the app, so a zero-tolerance rule would
 * lock the vault in the middle of the one operation people most want to do in
 * it — and worse, would do so *after* the picker returned, discarding what they
 * just chose. Twenty seconds covers the round trip and still locks in any
 * scenario where the phone changes hands.
 *
 * Locking is just dropping the key from memory: there is no "locked" flag to
 * get out of sync, and nothing readable survives it.
 */
export function usePrivateAutoLock(): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const store = usePrivateStore.getState();
      if (!store.key) return;

      if (state === 'background' || state === 'inactive') {
        if (store.backgroundedAt === null) store.markBackgrounded();
        return;
      }

      if (state === 'active') {
        const since = store.backgroundedAt;
        if (since !== null && Date.now() - since > AUTO_LOCK_GRACE_MS) store.lock();
        else store.clearBackgrounded();
      }
    });

    return () => subscription.remove();
  }, []);
}
