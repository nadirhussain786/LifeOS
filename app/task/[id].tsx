import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, CalendarDays, ChevronLeft, Flag, Repeat, StickyNote, Tag, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { AttributeRow } from '@/features/tasks/components/attribute-row';
import { CategoryPicker } from '@/features/tasks/components/category-picker';
import { DueDateField } from '@/features/tasks/components/due-date-field';
import { PriorityPicker } from '@/features/tasks/components/priority-picker';
import { RecurrencePicker } from '@/features/tasks/components/recurrence-picker';
import { useTask } from '@/features/tasks/hooks/use-task';
import { useTaskMutations } from '@/features/tasks/hooks/use-task-mutations';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';

const AUTOSAVE_DELAY_MS = 500;

/**
 * Custom header (not the native Stack.Screen header) — SDK 54's Android
 * edge-to-edge changes made the native header's automatic status-bar inset
 * unreliable, overlapping the back button with the system clock. Manual
 * insets.top padding, same as the "new" modal screens, sidesteps it.
 */
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const keyboardHeight = useKeyboardHeight();
  const { data: task } = useTask(id);
  const { update, archive, remove } = useTaskMutations();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes ?? '');
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!task || title === task.title) return;
    const timeout = setTimeout(() => update.mutate({ id: task.id, input: { title } }), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!task || notes === (task.notes ?? '')) return;
    const timeout = setTimeout(() => update.mutate({ id: task.id, input: { notes } }), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [notes]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) return null;

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
          <Pressable
            onPress={() => {
              archive.mutate(task.id);
              router.back();
            }}
            hitSlop={8}
          >
            <Archive size={20} color={colors[scheme].foreground} />
          </Pressable>
          <Pressable
            onPress={() => {
              remove.mutate(task.id);
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
          placeholder="Task title"
          placeholderTextColor={colors[scheme].mutedForeground}
          style={{ fontSize: 26, fontFamily: 'Sora_700Bold', lineHeight: 32, color: colors[scheme].foreground }}
        />

        <View className="rounded-2xl border border-border bg-card px-4">
          <AttributeRow icon={Flag} label="Priority" isFirst>
            <PriorityPicker value={task.priority} onChange={(priority) => update.mutate({ id: task.id, input: { priority } })} />
          </AttributeRow>

          <AttributeRow icon={CalendarDays} label="Due date">
            <DueDateField
              value={task.dueDate}
              hasTime={task.hasDueTime}
              onChange={(dueDate, hasDueTime) => update.mutate({ id: task.id, input: { dueDate, hasDueTime } })}
            />
          </AttributeRow>

          <AttributeRow icon={Repeat} label="Repeat">
            <RecurrencePicker
              value={task.recurrenceFrequency}
              onChange={(recurrenceFrequency) => update.mutate({ id: task.id, input: { recurrenceFrequency } })}
            />
          </AttributeRow>

          <AttributeRow icon={Tag} label="Category">
            <CategoryPicker
              value={task.categoryId}
              onChange={(categoryId) => update.mutate({ id: task.id, input: { categoryId } })}
            />
          </AttributeRow>
        </View>

        <View className="gap-2.5">
          <View className="flex-row items-center gap-1.5">
            <StickyNote size={13} color={colors[scheme].mutedForeground} />
            <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
              Notes
            </Text>
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Add notes…"
            placeholderTextColor={colors[scheme].mutedForeground}
            className="min-h-24 rounded-2xl border border-border bg-card p-4 text-base text-foreground"
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </View>
  );
}
