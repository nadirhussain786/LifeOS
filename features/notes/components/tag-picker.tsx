import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import type { NoteTag } from '@/features/notes/types/note.types';
import { cn } from '@/lib/utils';

type Props = {
  tags: NoteTag[];
  selectedTagIds: string[];
  onToggle: (tagId: string) => void;
  onCreateTag: (name: string) => void;
  onDeleteTag: (tagId: string) => void;
};

/** Multi-select chip picker for tags — distinct from the single-select CategoryPicker,
 * since a note can carry any number of tags alongside its one category. */
export function TagPicker({ tags, selectedTagIds, onToggle, onCreateTag, onDeleteTag }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const selected = new Set(selectedTagIds);

  const confirmNewTag = () => {
    const trimmed = name.trim();
    if (trimmed) onCreateTag(trimmed);
    setName('');
    setIsAdding(false);
  };

  const confirmDelete = (tag: NoteTag) => {
    Alert.alert('Delete tag?', `"${tag.name}" will be removed from every note.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteTag(tag.id) },
    ]);
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-2">
      {tags.map((tag) => {
        const isSelected = selected.has(tag.id);
        return (
          <Pressable
            key={tag.id}
            onPress={() => {
              Haptics.selectionAsync();
              onToggle(tag.id);
            }}
            onLongPress={() => confirmDelete(tag)}
            className={cn('rounded-full border px-3 py-1.5', isSelected ? 'border-accent bg-accent' : 'border-border')}
          >
            <Text className={isSelected ? 'font-sora-medium text-accent-foreground' : 'text-muted-foreground'}>
              #{tag.name}
            </Text>
          </Pressable>
        );
      })}

      {isAdding ? (
        <View className="flex-row items-center gap-1.5 rounded-full border border-border px-2 py-1">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Tag name"
            placeholderTextColor={colors[scheme].mutedForeground}
            autoFocus
            onSubmitEditing={confirmNewTag}
            onBlur={confirmNewTag}
            className="min-w-20 px-1 text-foreground"
          />
        </View>
      ) : (
        <Pressable onPress={() => setIsAdding(true)} className="flex-row items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5">
          <Plus size={14} color={colors[scheme].mutedForeground} />
          <Text variant="muted">Tag</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
