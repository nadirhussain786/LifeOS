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
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DevErrorBanner } from '@/components/dev/dev-error-banner';
import { MiniPlayerBar } from '@/features/music/components/mini-player-bar';
import { useNotificationNavigation } from '@/features/notifications/hooks/use-notification-navigation';
import { applyDeliveryMode } from '@/features/notifications/services/delivery';
import { syncTodayWidget } from '@/features/widgets/services/widget-data';
import { useAuthStore } from '@/features/auth/services/auth-store';
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

export default function RootLayout() {
  const init = useAuthStore((state) => state.init);
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
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
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
              <Stack.Screen name="settings/index" options={{ headerShown: true, title: 'Settings' }} />
              <Stack.Screen name="settings/notifications" options={{ headerShown: true, title: 'Notifications' }} />
              <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
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
            <NotificationNavigationBridge />
            <MiniPlayerBar />
            <DevErrorBanner />
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
