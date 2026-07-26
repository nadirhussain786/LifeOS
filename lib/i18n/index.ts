import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { deviceLanguage } from '@/features/settings/store/language-store';
import ar from '@/lib/i18n/locales/ar.json';
import en from '@/lib/i18n/locales/en.json';
import hi from '@/lib/i18n/locales/hi.json';
import ur from '@/lib/i18n/locales/ur.json';

/**
 * i18next setup for English / Urdu / Hindi / Arabic. Initialized synchronously
 * at import with the device language; the persisted choice is applied once the
 * language store hydrates (see the LanguageBridge in app/_layout). English is
 * the source-of-truth resource and the fallback for any missing key, so a
 * not-yet-translated string never renders blank.
 */
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ur: { translation: ur },
    hi: { translation: hi },
    ar: { translation: ar },
  },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
