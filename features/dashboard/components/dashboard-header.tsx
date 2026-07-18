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
    <View className="flex-row items-center justify-between pb-1" style={{ paddingTop: insets.top + 10 }}>
      <View className="flex-1 gap-0.5">
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide" style={{ color: colors[scheme].mutedForeground }}>
          {dateLabel}
        </Text>
        <Text className="font-sora-extrabold text-3xl text-foreground">{greeting}</Text>
      </View>
      <Pressable
        onPress={() => router.push('/settings')}
        hitSlop={8}
        accessibilityLabel="Settings"
        className="h-11 w-11 items-center justify-center rounded-full bg-muted"
      >
        <Settings color={colors[scheme].foreground} size={20} />
      </Pressable>
    </View>
  );
}
