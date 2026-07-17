import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useGreeting } from '@/features/dashboard/hooks/use-greeting';

export function DashboardHeader() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { greeting, dateLabel } = useGreeting();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-row items-start justify-between px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
      <View className="gap-1">
        <Text variant="heading">{greeting}</Text>
        <Text variant="muted">{dateLabel}</Text>
      </View>
      <Pressable onPress={() => router.push('/settings')} hitSlop={12} className="pt-1">
        <Settings color={colors[scheme].mutedForeground} size={22} />
      </Pressable>
    </View>
  );
}
