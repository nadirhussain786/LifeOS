import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, ArchiveRestore, Bell, ChevronLeft, Star, Tag, Tags, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AttachmentStrip } from '@/components/ui/attachment-strip';
import { AttributeRow } from '@/components/ui/attribute-row';
import { ReminderPicker } from '@/components/ui/reminder-picker';
import { VoiceNoteRecorder } from '@/components/ui/voice-note-recorder';
import { colors } from '@/constants/theme';
import { BacklinksPanel } from '@/features/notes/components/backlinks-panel';
import { NoteCategoryPicker } from '@/features/notes/components/note-category-picker';
import { NoteEditorBody } from '@/features/notes/components/note-editor-body';
import { TagPicker } from '@/features/notes/components/tag-picker';
import { useNote, useNoteAttachments, useNoteBacklinks, useNoteTagsForNote } from '@/features/notes/hooks/use-note';
import { useNoteMutations } from '@/features/notes/hooks/use-note-mutations';
import { useNoteTags } from '@/features/notes/hooks/use-notes';
import { createTag, deleteTag } from '@/features/notes/services/notes-repository';
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
  const { data: noteTags = [], refetch: refetchNoteTags } = useNoteTagsForNote(id);
  const { data: allTags = [], refetch: refetchAllTags } = useNoteTags();
  const { data: attachments = [] } = useNoteAttachments(id);
  const { data: backlinks = [] } = useNoteBacklinks(id);
  const { update, remove, archive, unarchive, setTags, attach, removeAttachment } = useNoteMutations();

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

  const selectedTagIds = noteTags.map((tag) => tag.id);

  const toggleTag = (tagId: string) => {
    const next = selectedTagIds.includes(tagId) ? selectedTagIds.filter((id) => id !== tagId) : [...selectedTagIds, tagId];
    setTags.mutate({ id: note.id, tagIds: next });
    refetchNoteTags();
  };

  const handleCreateTag = (name: string) => {
    const tag = createTag(name);
    setTags.mutate({ id: note.id, tagIds: [...selectedTagIds, tag.id] });
    refetchAllTags();
    refetchNoteTags();
  };

  const handleDeleteTag = (tagId: string) => {
    deleteTag(tagId);
    refetchAllTags();
    refetchNoteTags();
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-5 pb-2">
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
          <Pressable onPress={() => (note.isArchived ? unarchive.mutate(note.id) : archive.mutate(note.id))} hitSlop={8}>
            {note.isArchived ? (
              <ArchiveRestore size={19} color={colors[scheme].foreground} />
            ) : (
              <Archive size={19} color={colors[scheme].foreground} />
            )}
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
          <AttributeRow icon={Tags} label="Tags">
            <TagPicker
              tags={allTags}
              selectedTagIds={selectedTagIds}
              onToggle={toggleTag}
              onCreateTag={handleCreateTag}
              onDeleteTag={handleDeleteTag}
            />
          </AttributeRow>
          <AttributeRow icon={Bell} label="Reminder">
            <ReminderPicker
              value={note.reminderAt}
              onChange={(reminderAt) => update.mutate({ id: note.id, input: { reminderAt } })}
            />
          </AttributeRow>
        </View>

        <NoteEditorBody value={body} onChangeText={setBody} placeholder="Write something…" />

        <View className="gap-2">
          <VoiceNoteRecorder onRecorded={(uri, durationMs) => attach.mutate({ id: note.id, kind: 'audio', uri, durationMs })} />
          <AttachmentStrip
            attachments={attachments}
            onAddImage={(uri) => attach.mutate({ id: note.id, kind: 'image', uri })}
            onRemove={(attachmentId) => removeAttachment.mutate({ id: attachmentId, noteId: note.id })}
          />
        </View>

        <BacklinksPanel backlinks={backlinks} />
      </ScrollView>
    </View>
  );
}
