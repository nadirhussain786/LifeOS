import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

type AppearanceState = {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
};

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      setThemePreference: (themePreference) => {
        colorScheme.set(themePreference);
        set({ themePreference });
      },
    }),
    {
      name: 'appearance-store',
      storage: createJSONStorage(() => AsyncStorage),
      // NativeWind's own override lives only in memory and always resets to
      // 'system' on a fresh launch — re-apply the saved preference to it as
      // soon as this store finishes reading it back from disk.
      onRehydrateStorage: () => (state) => {
        if (state) colorScheme.set(state.themePreference);
      },
    },
  ),
);
