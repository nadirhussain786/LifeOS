import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/features/auth/services/auth-store';
import { useProfileStore } from '@/features/profile/store/profile-store';

/**
 * Routes between the auth flow, first-run onboarding, and the app based on
 * session + onboarding state. Order of gates: unauthenticated → login;
 * authenticated-but-unonboarded → onboarding; done → app. Waits for both the
 * session check and the persisted profile so the first frame never flashes the
 * wrong screen. Mounted once from the root layout.
 */
export function useAuthGate() {
  const segments = useSegments();
  const router = useRouter();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const session = useAuthStore((s) => s.session);
  const isGuest = useAuthStore((s) => s.isGuest);
  const onboardingComplete = useProfileStore((s) => s.onboardingComplete);
  const hydrated = useProfileStore((s) => s.hydrated);

  useEffect(() => {
    if (!isInitialized || !hydrated) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    // The reset-password screen must stay reachable even with a session — the
    // recovery link signs the user in precisely so they can set a new password.
    const onResetScreen = segments.includes('reset-password');
    const authed = !!session || isGuest;

    if (!authed) {
      // Truly unauthenticated → the auth flow (unless already there).
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    if (onResetScreen) return;

    if (!onboardingComplete) {
      // Signed in or guest, but hasn't finished first-run setup.
      if (!inOnboarding) router.replace('/(onboarding)');
      return;
    }

    // Onboarded. Leave the onboarding flow; and bounce only a REAL session out
    // of the auth flow — guests are left there so they can upgrade to an account
    // from Settings without being kicked back into the app.
    if (inOnboarding) router.replace('/(tabs)');
    else if (inAuthGroup && session) router.replace('/(tabs)');
  }, [isInitialized, hydrated, session, isGuest, onboardingComplete, segments, router]);
}
