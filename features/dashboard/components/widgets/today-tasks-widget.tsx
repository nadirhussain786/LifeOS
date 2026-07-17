import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ListChecks } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { WidgetCard } from '@/features/dashboard/components/widget-card';
import { WidgetEmptyState } from '@/features/dashboard/components/widget-empty-state';
import { useTodayTasks } from '@/features/dashboard/hooks/use-widget-data';
import { useTaskMutations } from '@/features/tasks/hooks/use-task-mutations';

export function TodayTasksWidget() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() ?? 'light';
  const { data, isLoading } = useTodayTasks();
  const { complete } = useTaskMutations();

  const completeTask = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    complete.mutate(id, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'today-tasks'] }) });
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
        <WidgetEmptyState message="No tasks yet — plan your day" actionLabel="Add task" onAction={() => router.push('/task/new')} />
      ) : (
        <View className="gap-3">
          <Text variant="muted">
            {data.completedCount} of {data.totalCount} done
          </Text>
          {data.upcoming.length === 0 ? (
            <Text variant="muted">Everything due today is done. 🎉</Text>
          ) : (
            <View className="gap-2">
              {data.upcoming.map((task) => (
                <Pressable
                  key={task.id}
                  onPress={() => completeTask(task.id)}
                  className="flex-row items-center gap-3 rounded-md bg-muted/40 px-3 py-2.5"
                >
                  <View className="h-5 w-5 rounded-full border" style={{ borderColor: colors[scheme].border }} />
                  <Text className="flex-1" numberOfLines={1}>
                    {task.title}
                  </Text>
                  {task.dueLabel ? (
                    <Text variant="caption" style={task.dueLabel === 'Overdue' ? { color: colors[scheme].destructive } : undefined}>
                      {task.dueLabel}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </WidgetCard>
  );
}
