import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Live "I'm going to bed now" tracker. `sleepingSince` holds the bedtime
 * timestamp while a night is in progress (persisted so it survives the app
 * being closed/reopened overnight), then is cleared once the user wakes and
 * the session is handed off to the log form. */
type SleepTrackerState = {
  sleepingSince: number | null;
  startSleep: () => void;
  cancelSleep: () => void;
};

export const useSleepTrackerStore = create<SleepTrackerState>()(
  persist(
    (set) => ({
      sleepingSince: null,
      startSleep: () => set({ sleepingSince: Date.now() }),
      cancelSleep: () => set({ sleepingSince: null }),
    }),
    { name: 'sleep-tracker-store', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
