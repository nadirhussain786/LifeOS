import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Check, ListChecks } from 'lucide-react-native';
import { Pressable, useColorScheme, View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { WidgetCard } from '@/features/dashboard/components/widget-card';
import { WidgetEmptyState } from '@/features/dashboard/components/widget-empty-state';
import { useTodayTasks } from '@/features/dashboard/hooks/use-widget-data';
import type { TodayTasksData } from '@/features/dashboard/types/dashboard.types';

export function TodayTasksWidget() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() ?? 'light';
  const { data, isLoading } = useTodayTasks();

  const toggleTask = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    queryClient.setQueryData<TodayTasksData>(['dashboard', 'today-tasks'], (prev) => {
      if (!prev) return prev;
      const upcoming = prev.upcoming.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
      const delta = upcoming.find((t) => t.id === id)?.done ? 1 : -1;
      return { ...prev, upcoming, completedCount: prev.completedCount + delta };
    });
  };

  return (
    <WidgetCard icon={ListChecks} title="Today" actionLabel="View all" onActionPress={() => router.push('/(tabs)/tasks')}>
      {isLoading || !data ? (
        <View className="gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </View>
      ) : data.totalCount === 0 ? (
        <WidgetEmptyState message="No tasks yet — plan your day" actionLabel="Add task" onAction={() => router.push('/(tabs)/tasks')} />
      ) : (
        <View className="gap-3">
          <Text variant="muted">
            {data.completedCount} of {data.totalCount} done
          </Text>
          <View className="gap-2">
            {data.upcoming.map((task) => (
              <Pressable
                key={task.id}
                onPress={() => toggleTask(task.id)}
                className="flex-row items-center gap-3 rounded-md bg-muted/40 px-3 py-2.5"
              >
                <View
                  className="h-5 w-5 items-center justify-center rounded-full border"
                  style={{
                    borderColor: task.done ? colors[scheme].accent : colors[scheme].border,
                    backgroundColor: task.done ? colors[scheme].accent : 'transparent',
                  }}
                >
                  {task.done ? <Check size={12} color={colors[scheme].accentForeground} /> : null}
                </View>
                <Text className={task.done ? 'flex-1 text-muted-foreground line-through' : 'flex-1'}>
                  {task.title}
                </Text>
                {task.dueLabel ? <Text variant="caption">{task.dueLabel}</Text> : null}
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </WidgetCard>
  );
}
