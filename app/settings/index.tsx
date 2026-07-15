import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/features/auth/services/auth-store';

export default function SettingsScreen() {
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <View className="flex-1 gap-4 bg-background p-4">
      <Card>
        <Text variant="subheading">Account</Text>
        <Text variant="muted">Profile and account settings will appear here.</Text>
      </Card>

      <Card>
        <Text variant="subheading">Appearance</Text>
        <Text variant="muted">Theme preferences will appear here.</Text>
      </Card>

      <Button label="Sign out" variant="secondary" onPress={signOut} />
    </View>
  );
}
