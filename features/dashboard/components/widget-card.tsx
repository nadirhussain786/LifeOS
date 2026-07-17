import { type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';

type Props = {
  icon: LucideIcon;
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children: React.ReactNode;
};

export function WidgetCard({ icon: Icon, title, actionLabel, onActionPress, children }: Props) {
  const scheme = useColorScheme() ?? 'light';

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Icon color={colors[scheme].mutedForeground} size={18} />
          <Text variant="subheading">{title}</Text>
        </View>
        {actionLabel && onActionPress ? (
          <Pressable onPress={onActionPress} hitSlop={8}>
            <Text variant="muted">{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </Card>
  );
}
