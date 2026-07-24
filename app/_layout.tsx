import '@/global.css';

import {
  Literata_400Regular,
  Literata_400Regular_Italic,
  Literata_500Medium,
  Literata_600SemiBold,
} from '@expo-google-fonts/literata';
import { Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold, useFonts } from '@expo-google-fonts/sora';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplash } from '@/components/animated-splash';
import { DevErrorBanner } from '@/components/dev/dev-error-banner';
import { MiniPlayerBar } from '@/features/music/components/mini-player-bar';
import { useNotificationNavigation } from '@/features/notifications/hooks/use-notification-navigation';
import { applyDeliveryMode } from '@/features/notifications/services/delivery';
import { syncTodayWidget } from '@/features/widgets/services/widget-data';
import { useProfileStore } from '@/features/profile/store/profile-store';
import { AppLockOverlay } from '@/features/security/components/app-lock-overlay';
import { useAppLock } from '@/features/security/hooks/use-app-lock';
import { useAuthStore } from '@/features/auth/services/auth-store';
import { useAuthGate } from '@/features/auth/hooks/use-auth-gate';
import { useSplashStore } from '@/hooks/use-splash-store';
import { useSyncTrigger } from '@/features/sync/hooks/use-sync';
import { colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { configureAndroidChannels, configureNotificationHandler } from '@/lib/notifications';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();

// Without a handler, expo-notifications suppresses notifications delivered
// while the app is foregrounded — water reminders should still show even if
// the app happens to be open at the time.
configureNotificationHandler();
// Create the Android notification channels (heads-up for time-critical, quiet
// for nudges). No-ops off Android / in Expo Go Android.
configureAndroidChannels();

/** Lives inside the router + query provider so it can deep-link on notification
 * taps and mark inbox rows read. Renders nothing. */
function NotificationNavigationBridge() {
  useNotificationNavigation();
  return null;
}

/** Redirects between the auth flow and the app. Must live inside the navigation
 * tree (uses router/segments). Renders nothing. */
function AuthGate() {
  useAuthGate();
  return null;
}

/** Drives automatic local↔cloud sync while signed in. Renders nothing. */
function SyncTrigger() {
  useSyncTrigger();
  return null;
}

/** Raises the app-lock shield on cold start / when returning from background. */
function AppLockController() {
  useAppLock();
  return null;
}

export default function RootLayout() {
  const init = useAuthStore((state) => state.init);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const profileHydrated = useProfileStore((state) => state.hydrated);
  const scheme = useColorScheme() ?? 'light';
  const [splashDone, setSplashDone] = useState(false);
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Literata_400Regular,
    Literata_400Regular_Italic,
    Literata_500Medium,
    Literata_600SemiBold,
  });

  useEffect(() => {
    init();
    // Reconcile scheduled reminders with the delivery mode and refresh the
    // morning digest with today's counts on every launch — local notifications
    // carry fixed text, so this is how it stays current.
    applyDeliveryMode();
    // Refresh the home-screen widget's snapshot with today's counts (Android).
    syncTodayWidget();
  }, [init]);

  useEffect(() => {
    if (fontsLoaded && isInitialized && profileHydrated) SplashScreen.hideAsync();
  }, [fontsLoaded, isInitialized, profileHydrated]);

  // The app's ground color. Applied to the root view + every navigator scene
  // (contentStyle below) so boot and screen transitions never flash the
  // default white scene — the bug this replaced, worst in dark mode.
  const c = colors[scheme];

  // Wait for fonts, the initial session check, and the persisted profile so the
  // gate can route to auth / onboarding / app without a flash of the wrong one.
  if (!fontsLoaded || !isInitialized || !profileHydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="notes" />
              <Stack.Screen name="music" />
              <Stack.Screen name="goals/index" />
              <Stack.Screen name="goals/[id]" />
              <Stack.Screen name="goals/[id]/edit" options={{ presentation: 'modal' }} />
              <Stack.Screen name="goals/[id]/log" options={{ presentation: 'modal' }} />
              <Stack.Screen name="sleep/index" />
              <Stack.Screen name="sleep/settings" />
              <Stack.Screen name="study/index" />
              <Stack.Screen name="study/settings" />
              <Stack.Screen name="study/timer" options={{ gestureEnabled: false }} />
              <Stack.Screen name="budget/index" />
              <Stack.Screen name="budget/transactions" />
              <Stack.Screen name="budget/reports" />
              <Stack.Screen name="budget/settings" />
              <Stack.Screen name="budget/savings/[id]" />
              <Stack.Screen name="budget/debts/index" />
              <Stack.Screen name="budget/debts/[id]" />
              <Stack.Screen name="gallery/index" />
              <Stack.Screen name="gallery/feed" />
              <Stack.Screen name="gallery/all" />
              <Stack.Screen name="gallery/compare" />
              <Stack.Screen name="gallery/album/[id]" />
              <Stack.Screen name="gallery/photo/[id]" />
              <Stack.Screen name="gallery/story/[period]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
              <Stack.Screen name="settings/index" />
              <Stack.Screen name="settings/notifications" />
              <Stack.Screen name="settings/sync" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="task/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="note/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="habit/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="routine/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="timeline/event/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="music/playlist/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="music/now-playing" options={{ presentation: 'modal' }} />
              <Stack.Screen name="goals/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="sleep/log" options={{ presentation: 'modal' }} />
              <Stack.Screen name="study/log" options={{ presentation: 'modal' }} />
              <Stack.Screen name="budget/transaction" options={{ presentation: 'modal' }} />
              <Stack.Screen name="budget/savings/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="budget/debts/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="gallery/album/new" options={{ presentation: 'modal' }} />
            </Stack>
            <AuthGate />
            <SyncTrigger />
            <AppLockController />
            <NotificationNavigationBridge />
            <MiniPlayerBar />
            <DevErrorBanner />
            {/* On top of everything: the lock shield, then the cold-start splash. */}
            <AppLockOverlay />
            {!splashDone && (
              <AnimatedSplash
                onFinish={() => {
                  setSplashDone(true);
                  // Release the cold-start autofocus guard so login/onboarding
                  // fields no longer keep the keyboard down.
                  useSplashStore.getState().setComplete();
                }}
              />
            )}
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
