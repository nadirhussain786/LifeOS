import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Local, device-side profile — deliberately separate from the Supabase auth
 * profile so it works for guest users too (who have no account). Holds the
 * onboarding answers, the "seen onboarding" flag that gates the first-run flow,
 * and the app-lock preference. Persisted via AsyncStorage.
 */
export type FocusArea = 'habits' | 'tasks' | 'journal' | 'water' | 'sleep' | 'fitness' | 'goals' | 'budget' | 'study';

type ProfileState = {
  name: string;
  focusAreas: FocusArea[];
  onboardingComplete: boolean;
  appLockEnabled: boolean;
  /** True once AsyncStorage has rehydrated — boot waits for this so returning
   * users never flash the onboarding flow before their saved state loads. */
  hydrated: boolean;

  setName: (name: string) => void;
  setFocusAreas: (areas: FocusArea[]) => void;
  setAppLockEnabled: (enabled: boolean) => void;
  completeOnboarding: (data: { name: string; focusAreas: FocusArea[]; appLockEnabled: boolean }) => void;
  reset: () => void;
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      name: '',
      focusAreas: [],
      onboardingComplete: false,
      appLockEnabled: false,
      hydrated: false,

      setName: (name) => set({ name }),
      setFocusAreas: (focusAreas) => set({ focusAreas }),
      setAppLockEnabled: (appLockEnabled) => set({ appLockEnabled }),
      completeOnboarding: ({ name, focusAreas, appLockEnabled }) =>
        set({ name: name.trim(), focusAreas, appLockEnabled, onboardingComplete: true }),
      reset: () => set({ name: '', focusAreas: [], onboardingComplete: false, appLockEnabled: false }),
    }),
    {
      name: 'lifeos-profile',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist the runtime hydration flag.
      partialize: ({ hydrated: _hydrated, ...rest }) => rest,
      onRehydrateStorage: () => () => {
        useProfileStore.setState({ hydrated: true });
      },
    },
  ),
);
