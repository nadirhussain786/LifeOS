import { View } from 'react-native';

import { Text } from '@/components/ui/text';

export function TaskListSectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <View className="flex-row items-center justify-between bg-background px-4 pb-2 pt-4">
      <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
        {label}
      </Text>
      <Text variant="caption">{count}</Text>
    </View>
  );
}
