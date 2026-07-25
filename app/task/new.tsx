import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Bell, CalendarDays, Flag, Repeat, StickyNote, Tag } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Switch, TextInput, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { AttributeRow } from '@/components/ui/attribute-row';
import { CategoryPicker } from '@/features/tasks/components/category-picker';
import { DueDateField } from '@/features/tasks/components/due-date-field';
import { PriorityPicker } from '@/features/tasks/components/priority-picker';
import { RecurrencePicker } from '@/features/tasks/components/recurrence-picker';
import { useTaskMutations } from '@/features/tasks/hooks/use-task-mutations';
import type { TaskPriority, TaskRecurrenceFrequency } from '@/features/tasks/types/task.types';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';

/**
 * Full-screen modal rather than a bottom sheet. @gorhom/bottom-sheet v5's
 * keyboard-avoidance is unreliable on Android with a focused TextInput
 * (github.com/gorhom/react-native-bottom-sheet/issues/2674, open, matches
 * our versions). Avoidance itself is done via useKeyboardHeight padding
 * rather than KeyboardAvoidingView — SDK 54's Android edge-to-edge changes
 * made KeyboardAvoidingView unreliable here (content clips instead of
 * scrolling clear of the keyboard).
 */
export default function NewTaskScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const keyboardHeight = useKeyboardHeight();
  const { create } = useTaskMutations();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('none');
  const [dueDate, setDueDate] = useState<number | null>(null);
  const [hasDueTime, setHasDueTime] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<TaskRecurrenceFrequency>('none');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const focusProgress = useSharedValue(0);
  const underlineStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
    transform: [{ scaleX: 0.3 + focusProgress.value * 0.7 }],
  }));

  const handleAdd = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    create.mutate({
      title: trimmed,
      notes: notes.trim() || null,
      priority,
      dueDate,
      hasDueTime,
      recurrenceFrequency,
      categoryId,
      reminderEnabled: reminderEnabled && dueDate !== null,
    });
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      <SheetHeader title="New Task" />

      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to get done?"
            placeholderTextColor={colors[scheme].mutedForeground}
            autoFocus
            multiline
            onFocus={() => {
              focusProgress.value = withTiming(1, { duration: 220 });
            }}
            onBlur={() => {
              focusProgress.value = withTiming(0, { duration: 220 });
            }}
            onSubmitEditing={handleAdd}
            style={{ fontSize: 26, fontFamily: 'Sora_700Bold', lineHeight: 32, color: colors[scheme].foreground }}
          />
          <Animated.View className="h-[3px] w-16 rounded-full bg-accent" style={underlineStyle} />
        </View>

        <View className="rounded-2xl border border-border bg-card px-4 shadow-e1">
          <AttributeRow icon={Flag} label="Priority" isFirst>
            <PriorityPicker value={priority} onChange={setPriority} />
          </AttributeRow>

          <AttributeRow icon={CalendarDays} label="Due date">
            <DueDateField
              value={dueDate}
              hasTime={hasDueTime}
              onChange={(value, hasTime) => {
                setDueDate(value);
                setHasDueTime(hasTime);
              }}
            />
          </AttributeRow>

          {dueDate !== null && (
            <AttributeRow icon={Bell} label="Reminder">
              <View className="flex-row items-center justify-between">
                <Text variant="muted">Notify me {hasDueTime ? 'at the due time' : 'at 9:00 AM that day'}</Text>
                <Switch value={reminderEnabled} onValueChange={setReminderEnabled} />
              </View>
            </AttributeRow>
          )}

          <AttributeRow icon={Repeat} label="Repeat">
            <RecurrencePicker value={recurrenceFrequency} onChange={setRecurrenceFrequency} />
          </AttributeRow>

          <AttributeRow icon={Tag} label="Category">
            <CategoryPicker value={categoryId} onChange={setCategoryId} />
          </AttributeRow>
        </View>

        <View className="gap-2.5">
          <View className="flex-row items-center gap-1.5">
            <StickyNote size={13} color={colors[scheme].mutedForeground} />
            <Text variant="micro" className="font-sora-semibold">
              Notes
            </Text>
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Add notes…"
            placeholderTextColor={colors[scheme].mutedForeground}
            className="min-h-24 rounded-2xl border border-border bg-card p-4 text-base text-foreground shadow-e1"
            textAlignVertical="top"
          />
        </View>

        <Button label="Add task" onPress={handleAdd} disabled={!title.trim()} size="lg" variant="accent" />
      </ScrollView>
    </View>
  );
}
