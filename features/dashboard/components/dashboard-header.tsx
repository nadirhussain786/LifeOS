import { useRouter } from 'expo-router';
import { Bell, Settings } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useGreeting } from '@/features/dashboard/hooks/use-greeting';
import { useUnreadNotificationCount } from '@/features/notifications/hooks/use-notifications-inbox';

export function DashboardHeader() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { greeting, dateLabel } = useGreeting();
  const insets = useSafeAreaInsets();
  const unread = useUnreadNotificationCount();

  return (
    <View className="flex-row items-center justify-between pb-1" style={{ paddingTop: insets.top + 10 }}>
      <View className="flex-1 gap-0.5">
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide text-muted-foreground">
          {dateLabel}
        </Text>
        <Text className="font-sora-extrabold text-3xl tracking-tight text-foreground">{greeting}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => router.push('/notifications')}
          hitSlop={8}
          accessibilityLabel="Notifications"
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
        >
          <Bell color={colors[scheme].foreground} size={20} />
          {unread > 0 && (
            <View
              className="absolute right-1.5 top-1.5 h-4 min-w-4 items-center justify-center rounded-full px-1"
              style={{ backgroundColor: colors[scheme].destructive }}
            >
              <Text style={{ color: '#ffffff', fontSize: 9, fontFamily: 'Sora_700Bold' }}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={() => router.push('/settings')}
          hitSlop={8}
          accessibilityLabel="Settings"
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
        >
          <Settings color={colors[scheme].foreground} size={20} />
        </Pressable>
      </View>
    </View>
  );
}
