import { useRouter } from 'expo-router';
import { BellOff, ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useNotificationsStore } from '@/features/notifications/store/notifications-store';
import { CATEGORY_META, type NotificationCategory } from '@/features/notifications/types/notification.types';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Shown on a per-module reminder screen (Water, Journal, Sleep bedtime) when its
 * central category — or the master switch — is off. Those switches gate all
 * scheduling, so without this banner a module's own "Reminders" toggle could
 * read ON while nothing ever fires. Tapping jumps to Notification settings.
 * Renders nothing when the category is active.
 */
export function CategoryOffNotice({ category }: { category: NotificationCategory }) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const theme = colors[scheme];
  const masterEnabled = useNotificationsStore((s) => s.masterEnabled);
  const categoryOn = useNotificationsStore((s) => s.categories[category] ?? true);

  if (masterEnabled && categoryOn) return null;

  const title = !masterEnabled ? 'All notifications are off' : `${CATEGORY_META[category].label} are off`;

  return (
    <Pressable
      onPress={() => router.push('/settings/notifications')}
      className="flex-row items-center gap-3 rounded-2xl border p-3.5"
      style={{ borderColor: theme.border, backgroundColor: theme.muted }}
    >
      <BellOff size={18} color={theme.mutedForeground} />
      <View className="flex-1">
        <Text className="font-sora-medium text-foreground">{title}</Text>
        <Text variant="caption">These reminders won&apos;t fire. Tap to turn them on.</Text>
      </View>
      <ChevronRight size={18} color={theme.mutedForeground} />
    </Pressable>
  );
}
