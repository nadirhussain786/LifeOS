import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AccountStanding } from '@/features/moderation/services/account-standing';
import type { WipeOutcome } from '@/features/moderation/services/device-commands';

/**
 * Last known standing for the signed-in account.
 *
 * Persisted so a blocked account sees the explanation on a cold start without
 * waiting for a round trip — but never treated as authority. The server holds
 * the verdict; this is a cache of the last one it gave, cleared on sign-out so
 * a shared device never shows one account's verdict to the next person.
 */
type ModerationState = {
  standing: AccountStanding | null;
  /** When the verdict was last fetched, for the "checked just now" line. */
  checkedAt: number | null;
  /**
   * What the last operator-ordered wipe cost, if one has happened.
   *
   * Survives the wipe deliberately — it lives in AsyncStorage, which
   * `wipeLocalData` does not touch, because it is the only remaining record
   * that anything was here. Somebody whose phone empties itself is owed a
   * specific answer about what went and what can come back, and "your data was
   * removed" without that list is how a moderation action becomes a support
   * thread.
   */
  wipeOutcome: WipeOutcome | null;

  setStanding: (standing: AccountStanding) => void;
  setWipeOutcome: (outcome: WipeOutcome) => void;
  clear: () => void;
};

export const useModerationStore = create<ModerationState>()(
  persist(
    (set) => ({
      standing: null,
      checkedAt: null,
      wipeOutcome: null,

      setStanding: (standing) => set({ standing, checkedAt: Date.now() }),
      setWipeOutcome: (wipeOutcome) => set({ wipeOutcome }),
      // `wipeOutcome` is not cleared here: sign-out happens on the shared
      // device too, and the next person must not inherit the previous
      // account's verdict — but the outcome is cleared when the block lifts
      // (see use-account-standing), which is when it stops being true.
      clear: () => set({ standing: null, checkedAt: null }),
    }),
    {
      name: 'moderation-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
