import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Archive, ChevronLeft, Search, StickyNote } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { ListSectionHeader } from '@/components/ui/list-section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { NoteCard } from '@/features/notes/components/note-card';
import { useNoteMutations } from '@/features/notes/hooks/use-note-mutations';
import { useArchivedNotes, useNoteCategories, useNotes } from '@/features/notes/hooks/use-notes';
import { useNotesFilterStore } from '@/features/notes/store/notes-filter-store';
import type { Note } from '@/features/notes/types/note.types';

type ListItem = { type: 'header'; label: string; count: number } | { type: 'note'; note: Note };

export default function NotesScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const [showArchived, setShowArchived] = useState(false);

  const { searchQuery, setSearchQuery } = useNotesFilterStore();
  const activeNotes = useNotes();
  const archivedNotes = useArchivedNotes();
  const { data: categories = [] } = useNoteCategories();
  const { remove, archive, unarchive } = useNoteMutations();

  const { data: notes = [], isLoading } = showArchived ? archivedNotes : activeNotes;
  const categoryColorById = useMemo(() => new Map(categories.map((category) => [category.id, category.colorToken])), [categories]);

  const items = useMemo<ListItem[]>(() => {
    if (showArchived) return notes.map((note) => ({ type: 'note', note }) as const);

    const pinned = notes.filter((note) => note.isPinned);
    const rest = notes.filter((note) => !note.isPinned);
    const sections: ListItem[] = [];
    if (pinned.length > 0) {
      sections.push({ type: 'header', label: 'Pinned', count: pinned.length });
      sections.push(...pinned.map((note) => ({ type: 'note', note }) as const));
    }
    if (rest.length > 0) {
      if (pinned.length > 0) sections.push({ type: 'header', label: 'All Notes', count: rest.length });
      sections.push(...rest.map((note) => ({ type: 'note', note }) as const));
    }
    return sections;
  }, [notes, showArchived]);

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="gap-3 px-4 pb-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Pressable onPress={() => router.back()} hitSlop={8} className="-ml-1 p-1" accessibilityLabel="Back">
              <ChevronLeft size={24} color={colors[scheme].foreground} />
            </Pressable>
            <Text variant="heading">Notes</Text>
          </View>
          <Pressable
            onPress={() => setShowArchived((current) => !current)}
            className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5"
          >
            <Archive size={13} color={colors[scheme].mutedForeground} />
            <Text variant="caption">{showArchived ? 'Active' : 'Archived'}</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2 rounded-full bg-muted px-4 py-2.5">
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
        <View className="gap-2.5 px-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={showArchived ? 'No archived notes' : 'No notes yet'}
          description={showArchived ? 'Notes you archive show up here.' : 'Capture ideas and quick notes here.'}
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => (item.type === 'header' ? `header-${item.label}` : item.note.id)}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <ListSectionHeader label={item.label} count={item.count} />
            ) : (
              <NoteCard
                note={item.note}
                categoryColor={item.note.categoryId ? categoryColorById.get(item.note.categoryId) : undefined}
                onPress={() => router.push(`/note/${item.note.id}`)}
                onDelete={() => remove.mutate(item.note.id)}
                onToggleArchive={() => (item.note.isArchived ? unarchive.mutate(item.note.id) : archive.mutate(item.note.id))}
              />
            )
          }
        />
      )}

      <Fab onPress={() => router.push('/note/new')} accessibilityLabel="Add note" />
    </View>
  );
}
