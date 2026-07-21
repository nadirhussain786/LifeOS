import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { env, isSupabaseConfigured } from './env';

// createClient needs syntactically valid args even when the app is unconfigured
// (guest mode). Fall back to a harmless placeholder so import never throws; auth
// and sync are gated on isSupabaseConfigured, so no real calls are made until
// creds are set.
const url = isSupabaseConfigured ? env.EXPO_PUBLIC_SUPABASE_URL : 'https://placeholder.supabase.co';
const anonKey = isSupabaseConfigured ? env.EXPO_PUBLIC_SUPABASE_ANON_KEY : 'placeholder-anon-key';

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Where the password-reset email should link back to. Uses the configured
 * redirect if set, otherwise the app's own deep link. */
export function passwordResetRedirectUrl(): string {
  return env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL || Linking.createURL('/reset-password');
}
