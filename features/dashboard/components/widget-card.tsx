import { type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { alpha } from '@/lib/color';

type Props = {
  icon: LucideIcon;
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  /** Optional accent for the icon chip + action — defaults to the brand accent. */
  tint?: string;
  children: React.ReactNode;
};

export function WidgetCard({ icon: Icon, title, actionLabel, onActionPress, tint, children }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const accent = tint ?? colors[scheme].accent;

  return (
    <View className="gap-3 rounded-3xl border border-border bg-card p-4 shadow-e1">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: alpha(accent, 0.14) }}>
            <Icon color={accent} size={17} />
          </View>
          <Text variant="subheading">{title}</Text>
        </View>
        {actionLabel && onActionPress ? (
          <Pressable onPress={onActionPress} hitSlop={8}>
            <Text variant="caption" className="font-sora-semibold" style={{ color: accent }}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
