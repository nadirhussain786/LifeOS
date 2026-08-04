import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AccountStanding } from '@/features/moderation/services/account-standing';

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

  setStanding: (standing: AccountStanding) => void;
  clear: () => void;
};

export const useModerationStore = create<ModerationState>()(
  persist(
    (set) => ({
      standing: null,
      checkedAt: null,

      setStanding: (standing) => set({ standing, checkedAt: Date.now() }),
      clear: () => set({ standing: null, checkedAt: null }),
    }),
    {
      name: 'moderation-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
