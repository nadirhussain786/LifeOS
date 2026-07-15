import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Repeat } from 'lucide-react-native';
import { Pressable, ScrollView, useColorScheme, View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { WidgetCard } from '@/features/dashboard/components/widget-card';
import { WidgetEmptyState } from '@/features/dashboard/components/widget-empty-state';
import { useHabitRow } from '@/features/dashboard/hooks/use-widget-data';
import type { HabitRowData } from '@/features/dashboard/types/dashboard.types';

export function HabitRowWidget() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() ?? 'light';
  const { data, isLoading } = useHabitRow();

  const toggleHabit = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    queryClient.setQueryData<HabitRowData>(['dashboard', 'habit-row'], (prev) => {
      if (!prev) return prev;
      return {
        habits: prev.habits.map((habit) =>
          habit.id === id ? { ...habit, doneToday: !habit.doneToday } : habit,
        ),
      };
    });
  };

  return (
    <WidgetCard icon={Repeat} title="Habits" actionLabel="View all" onActionPress={() => router.push('/(tabs)/habits')}>
      {isLoading || !data ? (
        <View className="flex-row gap-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-16 w-16 rounded-full" />
        </View>
      ) : data.habits.length === 0 ? (
        <WidgetEmptyState message="No habits yet — start one today" actionLabel="Add habit" onAction={() => router.push('/(tabs)/habits')} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
          {data.habits.map((habit) => (
            <Pressable key={habit.id} onPress={() => toggleHabit(habit.id)} className="items-center gap-1.5">
              <View
                className="h-16 w-16 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: habit.doneToday ? colors[scheme].primary : colors[scheme].border,
                  backgroundColor: habit.doneToday ? colors[scheme].primary : 'transparent',
                }}
              >
                <Text className="text-2xl">{habit.emoji}</Text>
              </View>
              <Text variant="caption">{habit.name}</Text>
              <Text variant="caption">🔥{habit.streak}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </WidgetCard>
  );
}
