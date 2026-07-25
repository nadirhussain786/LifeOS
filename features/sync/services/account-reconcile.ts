import { useProfileStore } from '@/features/profile/store/profile-store';
import { useSyncStore } from '@/features/sync/store/sync-store';
import { clearAllData } from '@/lib/data-management';
import { queryClient } from '@/lib/query-client';

/**
 * Reconciles local state with the account that just signed in.
 *
 * The local DB is single-tenant (`user_id = 'local'`). If a DIFFERENT account
 * signs in on this device than the one whose data is currently local, wipe the
 * local data, sync cursors, and device profile FIRST — otherwise the previous
 * user's rows would be pushed up under the new uid (cross-account cloud bleed)
 * and the two users' data would merge locally.
 *
 * A guest upgrading, or the same user re-signing-in, keeps their data: a guest
 * has no prior `lastUserId`, so their local rows migrate to the account on the
 * first sync (the intended guest→account behavior).
 */
export function reconcileAccountOnSignIn(uid: string): void {
  const store = useSyncStore.getState();
  const previous = store.lastUserId;

  if (previous && previous !== uid) {
    clearAllData();
    queryClient.clear();
    store.resetCursors();
    useProfileStore.getState().reset();
  }

  store.setLastUserId(uid);
}
