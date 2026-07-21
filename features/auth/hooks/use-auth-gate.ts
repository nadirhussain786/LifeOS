import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/features/auth/services/auth-store';

/**
 * Redirects between the auth flow and the app based on session state. Signed-in
 * users and explicit guests get the app; everyone else is sent to the login
 * screen. Waits for `isInitialized` so the first frame doesn't flash the wrong
 * screen. Mounted once from the root layout.
 */
export function useAuthGate() {
  const segments = useSegments();
  const router = useRouter();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const session = useAuthStore((s) => s.session);
  const isGuest = useAuthStore((s) => s.isGuest);

  useEffect(() => {
    if (!isInitialized) return;
    const inAuthGroup = segments[0] === '(auth)';
    // The reset-password screen must stay reachable even with a session — the
    // recovery link signs the user in precisely so they can set a new password.
    const onResetScreen = segments.includes('reset-password');

    if (!session && !isGuest && !inAuthGroup) {
      // Truly unauthenticated and outside the auth flow → send to login.
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup && !onResetScreen) {
      // Only a REAL session gets bounced out of the auth flow. Guests are left
      // alone so they can open login/sign-up from Settings to upgrade to an
      // account (they're "in the app" via a persisted guest flag, not a session).
      router.replace('/(tabs)');
    }
  }, [isInitialized, session, isGuest, segments, router]);
}
