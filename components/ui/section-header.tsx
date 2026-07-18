import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

type Props = {
  title: string;
  /** Optional trailing action shown as a colored text link with a chevron. */
  actionLabel?: string;
  onAction?: () => void;
  actionTint?: string;
};

/** Consistent section title with an optional trailing action link. A short
 * accent bar anchors the title so sections feel deliberate, not just bold text. */
export function SectionHeader({ title, actionLabel, onAction, actionTint }: Props) {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="subheading">{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} className="flex-row items-center gap-0.5">
          <Text variant="caption" className="font-sora-semibold" style={actionTint ? { color: actionTint } : undefined}>
            {actionLabel}
          </Text>
          <ChevronRight size={13} color={actionTint} />
        </Pressable>
      ) : null}
    </View>
  );
}
