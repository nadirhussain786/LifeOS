import { getLocales } from 'expo-localization';

let cached: string | null = null;

/** The device's primary BCP-47 locale tag (e.g. "en-US", "de-DE"), for
 * Intl-based number/currency/date formatting. Cached after first read. */
export function deviceLocale(): string {
  if (cached === null) {
    try {
      cached = getLocales()[0]?.languageTag ?? 'en-US';
    } catch {
      cached = 'en-US';
    }
  }
  return cached;
}
