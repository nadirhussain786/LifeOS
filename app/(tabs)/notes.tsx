import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Search, StickyNote } from 'lucide-react-native';
import { useMemo } from 'react';
import { TextInput, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/ui/fab';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { NoteCard } from '@/features/notes/components/note-card';
import { useNoteMutations } from '@/features/notes/hooks/use-note-mutations';
import { useNoteCategories, useNotes } from '@/features/notes/hooks/use-notes';
import { useNotesFilterStore } from '@/features/notes/store/notes-filter-store';

export default function NotesScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();

  const { searchQuery, setSearchQuery } = useNotesFilterStore();
  const { data: notes = [], isLoading } = useNotes();
  const { data: categories = [] } = useNoteCategories();
  const { remove } = useNoteMutations();

  const categoryColorById = useMemo(() => new Map(categories.map((category) => [category.id, category.colorToken])), [categories]);

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="gap-3 px-4 pb-2">
        <Text variant="heading">Notes</Text>

        <View className="flex-row items-center gap-2 rounded-md bg-muted px-3 py-2">
          <Search size={16} color={colors[scheme].mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notes"
            placeholderTextColor={colors[scheme].mutedForeground}
            className="flex-1 text-foreground"
          />
        </View>
      </View>

      {isLoading ? (
        <View className="gap-2 px-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </View>
      ) : notes.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <StickyNote color={colors[scheme].mutedForeground} size={32} />
          <Text variant="heading">No notes yet</Text>
          <Text variant="muted" className="text-center">
            Capture ideas and quick notes here.
          </Text>
        </View>
      ) : (
        <FlashList
          data={notes}
          keyExtractor={(note) => note.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item: note }) => (
            <NoteCard
              note={note}
              categoryColor={note.categoryId ? categoryColorById.get(note.categoryId) : undefined}
              onPress={() => router.push(`/note/${note.id}`)}
              onDelete={() => remove.mutate(note.id)}
            />
          )}
        />
      )}

      <Fab onPress={() => router.push('/note/new')} accessibilityLabel="Add note" />
    </View>
  );
}
