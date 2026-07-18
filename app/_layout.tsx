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
import { useAuthStore } from '@/features/auth/services/auth-store';
import { configureNotificationHandler } from '@/lib/notifications';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();

// Without a handler, expo-notifications suppresses notifications delivered
// while the app is foregrounded — water reminders should still show even if
// the app happens to be open at the time.
configureNotificationHandler();

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
            <MiniPlayerBar />
            <DevErrorBanner />
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
