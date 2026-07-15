import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, useColorScheme, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { CategoryPicker } from '@/features/tasks/components/category-picker';
import { DueDateField } from '@/features/tasks/components/due-date-field';
import { PriorityPicker } from '@/features/tasks/components/priority-picker';
import { useTask } from '@/features/tasks/hooks/use-task';
import { useTaskMutations } from '@/features/tasks/hooks/use-task-mutations';

const AUTOSAVE_DELAY_MS = 500;

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
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
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerRight: () => (
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
          ),
        }}
      />

      <ScrollView contentContainerClassName="gap-5 p-4" keyboardShouldPersistTaps="handled">
        <TextInput
          value={title}
          onChangeText={setTitle}
          multiline
          placeholder="Task title"
          placeholderTextColor={colors[scheme].mutedForeground}
          className="text-2xl font-semibold text-foreground"
        />

        <View className="gap-2">
          <Text variant="caption" className="uppercase">
            Priority
          </Text>
          <PriorityPicker value={task.priority} onChange={(priority) => update.mutate({ id: task.id, input: { priority } })} />
        </View>

        <View className="gap-2">
          <Text variant="caption" className="uppercase">
            Due date
          </Text>
          <DueDateField value={task.dueDate} onChange={(dueDate) => update.mutate({ id: task.id, input: { dueDate } })} />
        </View>

        <View className="gap-2">
          <Text variant="caption" className="uppercase">
            Category
          </Text>
          <CategoryPicker
            value={task.categoryId}
            onChange={(categoryId) => update.mutate({ id: task.id, input: { categoryId } })}
          />
        </View>

        <View className="gap-2">
          <Text variant="caption" className="uppercase">
            Notes
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Add notes…"
            placeholderTextColor={colors[scheme].mutedForeground}
            className="min-h-24 text-base text-foreground"
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </View>
  );
}
