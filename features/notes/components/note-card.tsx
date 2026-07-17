import { Star, Trash2 } from 'lucide-react-native';
import { Pressable, useColorScheme, View } from 'react-native';

import { SwipeableRow } from '@/components/ui/swipeable-row';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useRelativeTime } from '@/hooks/use-relative-time';
import type { Note } from '@/features/notes/types/note.types';

type Props = {
  note: Note;
  categoryColor?: string;
  onPress: () => void;
  onDelete: () => void;
};

export function NoteCard({ note, categoryColor, onPress, onDelete }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const relativeTime = useRelativeTime(new Date(note.updatedAt));

  return (
    <SwipeableRow
      actions={
        <Pressable
          onPress={onDelete}
          accessibilityLabel={`Delete "${note.title}"`}
          className="flex-1 items-center justify-center bg-destructive"
        >
          <Trash2 color={colors[scheme].primaryForeground} size={18} />
        </Pressable>
      }
    >
      <Pressable onPress={onPress} className="gap-1 px-4 py-3">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1 flex-row items-center gap-1.5">
            {categoryColor ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor }} /> : null}
            <Text className="flex-1 font-sora-medium" numberOfLines={1}>
              {note.title || 'Untitled note'}
            </Text>
            {note.isPinned ? <Star size={13} color={colors[scheme].accent} fill={colors[scheme].accent} /> : null}
          </View>
          <Text variant="caption">{relativeTime}</Text>
        </View>
        {note.body ? (
          <Text variant="muted" numberOfLines={2}>
            {note.body}
          </Text>
        ) : null}
      </Pressable>
    </SwipeableRow>
  );
}
