import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const LANGUAGES = ['en', 'ur', 'hi', 'ar'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Right-to-left languages — Urdu and Arabic. Switching to/from these flips the
 * whole layout direction, which only fully applies after an app restart. */
export const RTL_LANGUAGES: readonly Language[] = ['ur', 'ar'];

export function isRTL(language: Language): boolean {
  return RTL_LANGUAGES.includes(language);
}

/** The device's language if LifeOS supports it, otherwise English. */
export function deviceLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode ?? 'en';
    return (LANGUAGES as readonly string[]).includes(code) ? (code as Language) : 'en';
  } catch {
    return 'en';
  }
}

type LanguageState = {
  language: Language;
  hydrated: boolean;
  setLanguage: (language: Language) => void;
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: deviceLanguage(),
      hydrated: false,
      setLanguage: (language) => {
        I18nManager.forceRTL(isRTL(language));
        set({ language });
      },
    }),
    {
      name: 'lifeos-language',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated: _hydrated, ...rest }) => rest,
      onRehydrateStorage: () => (state) => {
        if (state) I18nManager.forceRTL(isRTL(state.language));
        useLanguageStore.setState({ hydrated: true });
      },
    },
  ),
);
