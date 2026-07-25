import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/features/auth/services/auth-store';
import { useProfileStore } from '@/features/profile/store/profile-store';

export default function Index() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const session = useAuthStore((s) => s.session);
  const isGuest = useAuthStore((s) => s.isGuest);
  const onboardingComplete = useProfileStore((s) => s.onboardingComplete);
  const hydrated = useProfileStore((s) => s.hydrated);

  if (!isInitialized || !hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (!session && !isGuest) return <Redirect href="/(auth)/login" />;
  if (!onboardingComplete) return <Redirect href="/(onboarding)" />;
  return <Redirect href="/(tabs)" />;
}
