import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Star, Tag, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { AttributeRow } from '@/features/tasks/components/attribute-row';
import { NoteCategoryPicker } from '@/features/notes/components/note-category-picker';
import { useNote } from '@/features/notes/hooks/use-note';
import { useNoteMutations } from '@/features/notes/hooks/use-note-mutations';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';

const AUTOSAVE_DELAY_MS = 500;

/**
 * Custom header (not the native Stack.Screen header) — SDK 54's Android
 * edge-to-edge changes made the native header's automatic status-bar inset
 * unreliable, overlapping the back button with the system clock. Manual
 * insets.top padding, same as the "new" modal screens, sidesteps it.
 */
export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const keyboardHeight = useKeyboardHeight();
  const { data: note } = useNote(id);
  const { update, remove } = useNoteMutations();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body ?? '');
    }
  }, [note?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!note || title === note.title) return;
    const timeout = setTimeout(() => update.mutate({ id: note.id, input: { title } }), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!note || body === (note.body ?? '')) return;
    const timeout = setTimeout(() => update.mutate({ id: note.id, input: { body } }), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [body]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!note) return null;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          className="h-8 w-8 items-center justify-center rounded-full bg-muted"
        >
          <ChevronLeft size={20} color={colors[scheme].foreground} />
        </Pressable>
        <View className="flex-row gap-4">
          <Pressable onPress={() => update.mutate({ id: note.id, input: { isPinned: !note.isPinned } })} hitSlop={8}>
            <Star size={20} color={colors[scheme].accent} fill={note.isPinned ? colors[scheme].accent : 'transparent'} />
          </Pressable>
          <Pressable
            onPress={() => {
              remove.mutate(note.id);
              router.back();
            }}
            hitSlop={8}
          >
            <Trash2 size={20} color={colors[scheme].destructive} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={title}
          onChangeText={setTitle}
          multiline
          placeholder="Note title"
          placeholderTextColor={colors[scheme].mutedForeground}
          style={{ fontSize: 26, fontFamily: 'Sora_700Bold', lineHeight: 32, color: colors[scheme].foreground }}
        />

        <View className="rounded-2xl border border-border bg-card px-4">
          <AttributeRow icon={Tag} label="Category" isFirst>
            <NoteCategoryPicker
              value={note.categoryId}
              onChange={(categoryId) => update.mutate({ id: note.id, input: { categoryId } })}
            />
          </AttributeRow>
        </View>

        <TextInput
          value={body}
          onChangeText={setBody}
          multiline
          placeholder="Write something…"
          placeholderTextColor={colors[scheme].mutedForeground}
          className="min-h-32 rounded-2xl border border-border bg-card p-4 text-base text-foreground"
          textAlignVertical="top"
        />
      </ScrollView>
    </View>
  );
}
