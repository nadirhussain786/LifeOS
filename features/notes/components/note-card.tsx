import { Archive, ArchiveRestore, Star, Trash2 } from 'lucide-react-native';
import { Pressable, useColorScheme, View } from 'react-native';

import { SwipeableRow } from '@/components/ui/swipeable-row';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { stripMarkdown } from '@/features/notes/services/markdown';
import { useRelativeTime } from '@/hooks/use-relative-time';
import type { Note } from '@/features/notes/types/note.types';

type Props = {
  note: Note;
  categoryColor?: string;
  onPress: () => void;
  onDelete: () => void;
  onToggleArchive: () => void;
};

export function NoteCard({ note, categoryColor, onPress, onDelete, onToggleArchive }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const relativeTime = useRelativeTime(new Date(note.updatedAt));

  return (
    <SwipeableRow
      actions={
        <>
          <Pressable
            onPress={onToggleArchive}
            accessibilityLabel={note.isArchived ? `Unarchive "${note.title}"` : `Archive "${note.title}"`}
            className="flex-1 items-center justify-center bg-secondary"
          >
            {note.isArchived ? (
              <ArchiveRestore color={colors[scheme].foreground} size={18} />
            ) : (
              <Archive color={colors[scheme].foreground} size={18} />
            )}
          </Pressable>
          <Pressable
            onPress={onDelete}
            accessibilityLabel={`Delete "${note.title}"`}
            className="flex-1 items-center justify-center bg-destructive"
          >
            <Trash2 color={colors[scheme].primaryForeground} size={18} />
          </Pressable>
        </>
      }
    >
      <Pressable onPress={onPress} className="gap-1.5 py-3.5 pl-4 pr-4">
        {categoryColor && <View className="absolute bottom-2 left-0 top-2 w-1 rounded-full" style={{ backgroundColor: categoryColor }} />}
        <View className="flex-row items-center justify-between gap-2">
          <Text className="flex-1 font-sora-semibold" numberOfLines={1}>
            {note.title || 'Untitled note'}
          </Text>
          {note.isPinned ? <Star size={14} color={colors[scheme].accent} fill={colors[scheme].accent} /> : null}
          <Text variant="caption">{relativeTime}</Text>
        </View>
        {note.body ? (
          <Text variant="muted" numberOfLines={2}>
            {stripMarkdown(note.body)}
          </Text>
        ) : null}
      </Pressable>
    </SwipeableRow>
  );
}
