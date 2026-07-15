import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { CalendarDays, Flag, Tag, X } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, useColorScheme, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { AttributeRow } from '@/features/tasks/components/attribute-row';
import { CategoryPicker } from '@/features/tasks/components/category-picker';
import { DueDateField } from '@/features/tasks/components/due-date-field';
import { PriorityPicker } from '@/features/tasks/components/priority-picker';
import { useTaskMutations } from '@/features/tasks/hooks/use-task-mutations';
import type { TaskPriority } from '@/features/tasks/types/task.types';

/**
 * Full-screen modal rather than a bottom sheet. @gorhom/bottom-sheet v5's
 * keyboard-avoidance is unreliable on Android with a focused TextInput
 * (github.com/gorhom/react-native-bottom-sheet/issues/2674, open, matches
 * our versions) — core RN's KeyboardAvoidingView has none of that risk.
 */
export default function NewTaskScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { create } = useTaskMutations();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('none');
  const [dueDate, setDueDate] = useState<number | null>(null);
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
    create.mutate({ title: trimmed, priority, dueDate, categoryId });
    router.back();
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          className="h-8 w-8 items-center justify-center rounded-full bg-muted"
        >
          <X size={17} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="caption" className="font-semibold uppercase tracking-wide">
          New Task
        </Text>
        <View className="h-8 w-8" />
      </View>

      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-8 pt-3"
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
            style={{ fontSize: 26, fontWeight: '600', lineHeight: 32, color: colors[scheme].foreground }}
          />
          <Animated.View className="h-[3px] w-16 rounded-full bg-accent" style={underlineStyle} />
        </View>

        <View className="rounded-2xl border border-border bg-card px-4">
          <AttributeRow icon={Flag} label="Priority" isFirst>
            <PriorityPicker value={priority} onChange={setPriority} />
          </AttributeRow>

          <AttributeRow icon={CalendarDays} label="Due date">
            <DueDateField value={dueDate} onChange={setDueDate} />
          </AttributeRow>

          <AttributeRow icon={Tag} label="Category">
            <CategoryPicker value={categoryId} onChange={setCategoryId} />
          </AttributeRow>
        </View>

        <Button label="Add task" onPress={handleAdd} disabled={!title.trim()} size="lg" variant="accent" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
