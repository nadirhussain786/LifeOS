import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type Props = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function WidgetEmptyState({ message, actionLabel, onAction }: Props) {
  return (
    <View className="items-start gap-3 py-1">
      <Text variant="muted">{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} variant="secondary" size="sm" onPress={onAction} /> : null}
    </View>
  );
}
