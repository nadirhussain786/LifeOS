import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { CheckCircle2, Search } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, TextInput, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/ui/fab';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { TaskListSectionHeader } from '@/features/tasks/components/task-list-section-header';
import { TaskRow } from '@/features/tasks/components/task-row';
import { useTaskMutations } from '@/features/tasks/hooks/use-task-mutations';
import { useTasks } from '@/features/tasks/hooks/use-tasks';
import { groupTasksByDueDate } from '@/features/tasks/services/task-grouping';
import { useTasksFilterStore } from '@/features/tasks/store/tasks-filter-store';
import type { Task, TaskListFilter } from '@/features/tasks/types/task.types';

type ListItem = { type: 'header'; label: string; count: number } | { type: 'task'; task: Task };

const FILTER_TABS: { value: TaskListFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export default function TasksScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();

  const { filter, setFilter, searchQuery, setSearchQuery } = useTasksFilterStore();
  const { data: tasks = [], isLoading } = useTasks();
  const { complete, reopen, archive, remove } = useTaskMutations();

  const items = useMemo<ListItem[]>(() => {
    if (filter !== 'active') {
      return tasks.map((task) => ({ type: 'task', task }) as const);
    }
    return groupTasksByDueDate(tasks).flatMap((section) => [
      { type: 'header', label: section.label, count: section.tasks.length } as const,
      ...section.tasks.map((task) => ({ type: 'task', task }) as const),
    ]);
  }, [tasks, filter]);

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="gap-3 px-4 pb-2">
        <Text variant="heading">Tasks</Text>

        <View className="flex-row items-center gap-2 rounded-md bg-muted px-3 py-2">
          <Search size={16} color={colors[scheme].mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tasks"
            placeholderTextColor={colors[scheme].mutedForeground}
            className="flex-1 text-foreground"
          />
        </View>

        <View className="flex-row gap-2">
          {FILTER_TABS.map((tab) => {
            const selected = tab.value === filter;
            return (
              <Pressable
                key={tab.value}
                onPress={() => setFilter(tab.value)}
                className={selected ? 'flex-1 items-center rounded-md bg-primary py-2' : 'flex-1 items-center rounded-md bg-transparent py-2'}
              >
                <Text className={selected ? 'text-primary-foreground' : 'text-muted-foreground'}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View className="gap-2 px-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <CheckCircle2 color={colors[scheme].mutedForeground} size={32} />
          <Text variant="heading">{filter === 'active' ? 'Nothing to do' : `No ${filter} tasks`}</Text>
          <Text variant="muted" className="text-center">
            {filter === 'active' ? 'Enjoy the calm, or add something new.' : 'Tasks will show up here.'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => (item.type === 'header' ? `header-${item.label}` : item.task.id)}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <TaskListSectionHeader label={item.label} count={item.count} />
            ) : (
              <TaskRow
                task={item.task}
                onPress={() => router.push(`/task/${item.task.id}`)}
                onToggleComplete={() => (item.task.status === 'completed' ? reopen.mutate(item.task.id) : complete.mutate(item.task.id))}
                onArchive={() => archive.mutate(item.task.id)}
                onDelete={() => remove.mutate(item.task.id)}
              />
            )
          }
        />
      )}

      <Fab onPress={() => router.push('/task/new')} accessibilityLabel="Add task" />
    </View>
  );
}
