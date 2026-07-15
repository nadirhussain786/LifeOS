import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 justify-center gap-6 bg-background px-6">
      <View className="gap-2">
        <Text variant="heading">Welcome to LifeOS</Text>
        <Text variant="muted">Sign in to continue to your personal operating system.</Text>
      </View>

      <Button label="Continue" variant="accent" size="lg" disabled />
      <Text variant="caption" className="text-center">
        Authentication will be wired up in the next phase.
      </Text>

      {/* TODO(auth-module): remove once real sign-in ships */}
      <Pressable onPress={() => router.replace('/(tabs)')} className="items-center py-2">
        <Text variant="muted" className="underline">
          Skip for now (dev preview)
        </Text>
      </Pressable>
    </View>
  );
}
