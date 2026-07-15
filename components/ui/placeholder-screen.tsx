import { type LucideIcon } from 'lucide-react-native';
import { useColorScheme, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function PlaceholderScreen({ icon: Icon, title, description }: Props) {
  const scheme = useColorScheme() ?? 'light';

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
      <Icon color={colors[scheme].mutedForeground} size={32} />
      <Text variant="heading">{title}</Text>
      <Text variant="muted" className="text-center">
        {description}
      </Text>
    </View>
  );
}
