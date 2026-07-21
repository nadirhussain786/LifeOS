/**
 * Public environment for the app. Deliberately lenient: missing/blank Supabase
 * creds must NOT crash the app — LifeOS is offline-first and fully usable in
 * guest mode with no backend at all. Auth and sync check `isSupabaseConfigured`
 * and stay disabled (guest-only) until real values are present.
 *
 * EXPO_PUBLIC_ vars are inlined by Expo at build time. For local dev they come
 * from `.env`; for EAS builds they come from eas.json's per-profile `env` (or
 * EAS environment variables). The anon key is safe to expose client-side — it
 * only grants what your Row Level Security policies allow.
 */

const read = (v: string | undefined) => (v ?? '').trim();

export const env = {
  EXPO_PUBLIC_SUPABASE_URL: read(process.env.EXPO_PUBLIC_SUPABASE_URL),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: read(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  /** Where the password-reset email links back to. Optional — falls back to the
   * app's `lifeos://reset-password` deep link (see lib/supabase.ts). */
  EXPO_PUBLIC_SUPABASE_REDIRECT_URL: read(process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL),
};

/** True only when both a real-looking URL and a plausible anon key are present.
 * Auth/sync gate on this so a build without creds runs cleanly in guest mode. */
export const isSupabaseConfigured =
  /^https?:\/\/[^\s]+\.[^\s]+$/.test(env.EXPO_PUBLIC_SUPABASE_URL) && env.EXPO_PUBLIC_SUPABASE_ANON_KEY.length > 20;
