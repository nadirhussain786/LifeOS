import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Repeat, Search } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { TextInput, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { ListSectionHeader } from '@/components/ui/list-section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors, habitDoneColor } from '@/constants/theme';
import { HabitRow } from '@/features/habits/components/habit-row';
import { HabitsFabSheet } from '@/features/habits/components/habits-fab-sheet';
import { QuickLogSheet } from '@/features/habits/components/quick-log-sheet';
import { RoutineCard } from '@/features/habits/components/routine-card';
import { useHabitMutations } from '@/features/habits/hooks/use-habit-mutations';
import { useHabitCategories, useHabits } from '@/features/habits/hooks/use-habits';
import { useRoutines } from '@/features/habits/hooks/use-routines';
import { toDateKey } from '@/features/habits/services/habit-streaks';
import { useHabitsFilterStore } from '@/features/habits/store/habits-filter-store';
import type { HabitWithToday, RoutineWithHabits } from '@/features/habits/types/habit.types';

type ListItem =
  | { type: 'routine'; routine: RoutineWithHabits }
  | { type: 'header'; key: string; label: string; count: number; dotColor?: string }
  | { type: 'habit'; habit: HabitWithToday };

export default function HabitsScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const quickLogRef = useRef<BottomSheetModal>(null);
  const fabSheetRef = useRef<BottomSheetModal>(null);
  const [quickLogHabit, setQuickLogHabit] = useState<HabitWithToday | null>(null);

  const { searchQuery, setSearchQuery } = useHabitsFilterStore();
  const { data: habits = [], isLoading } = useHabits();
  const { data: routines = [] } = useRoutines();
  const { data: categories = [] } = useHabitCategories();
  const { logToday, unlogToday, logDate, archive, remove } = useHabitMutations();

  const progress = useMemo(() => {
    const scheduledToday = habits.filter((habit) => habit.todayStatus !== 'not_scheduled');
    const done = scheduledToday.filter((habit) => habit.todayStatus === 'done').length;
    return { done, total: scheduledToday.length };
  }, [habits]);

  const items = useMemo<ListItem[]>(() => {
    const routineItems: ListItem[] = routines.map((routine) => ({ type: 'routine', routine }));
    const routinedIds = new Set(routines.flatMap((routine) => routine.habits.map((habit) => habit.id)));
    const standalone = habits.filter((habit) => !routinedIds.has(habit.id));

    const byCategory = new Map<string | null, HabitWithToday[]>();
    for (const habit of standalone) {
      byCategory.set(habit.categoryId, [...(byCategory.get(habit.categoryId) ?? []), habit]);
    }

    const groupedItems: ListItem[] = [];
    for (const category of categories) {
      const group = byCategory.get(category.id);
      if (!group?.length) continue;
      groupedItems.push({ type: 'header', key: category.id, label: category.name, count: group.length, dotColor: category.colorToken });
      groupedItems.push(...group.map((habit) => ({ type: 'habit', habit }) as const));
    }

    const uncategorized = byCategory.get(null) ?? [];
    if (uncategorized.length > 0) {
      if (routineItems.length > 0 || groupedItems.length > 0) {
        groupedItems.push({ type: 'header', key: 'other', label: 'Other', count: uncategorized.length });
      }
      groupedItems.push(...uncategorized.map((habit) => ({ type: 'habit', habit }) as const));
    }

    return [...routineItems, ...groupedItems];
  }, [routines, habits, categories]);

  const openQuickLog = (habit: HabitWithToday) => {
    setQuickLogHabit(habit);
    requestAnimationFrame(() => quickLogRef.current?.present());
  };

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="gap-3 px-4 pb-2">
        <View className="flex-row items-center justify-between">
          <Text variant="heading">Habits</Text>
          {progress.total > 0 && (
            <Text variant="muted" className="font-sora-medium">
              {progress.done}/{progress.total} today
            </Text>
          )}
        </View>

        {progress.total > 0 && (
          <View className="h-1.5 overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full"
              style={{ width: `${(progress.done / progress.total) * 100}%`, backgroundColor: habitDoneColor }}
            />
          </View>
        )}

        <View className="flex-row items-center gap-2 rounded-full bg-muted px-4 py-2.5">
          <Search size={16} color={colors[scheme].mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search habits"
            placeholderTextColor={colors[scheme].mutedForeground}
            className="flex-1 text-foreground"
          />
        </View>
      </View>

      {isLoading ? (
        <View className="gap-2.5 px-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No habits yet"
          description="Build routines you can actually keep — start with one habit."
          tint={habitDoneColor}
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => (item.type === 'header' ? `header-${item.key}` : item.type === 'routine' ? `routine-${item.routine.id}` : item.habit.id)}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
          renderItem={({ item }) => {
            if (item.type === 'header') return <ListSectionHeader label={item.label} count={item.count} dotColor={item.dotColor} />;
            if (item.type === 'routine') {
              return (
                <RoutineCard
                  routine={item.routine}
                  onEdit={() => router.push(`/routine/${item.routine.id}`)}
                  onOpenHabit={(habitId) => router.push(`/habit/${habitId}`)}
                  onToggleHabit={(habitId, done) => (done ? unlogToday.mutate(habitId) : logToday.mutate({ habitId }))}
                />
              );
            }
            const habit = item.habit;
            return (
              <HabitRow
                habit={habit}
                onPress={() => router.push(`/habit/${habit.id}`)}
                onToggleDone={() => (habit.todayStatus === 'done' ? unlogToday.mutate(habit.id) : logToday.mutate({ habitId: habit.id }))}
                onQuickLog={() => openQuickLog(habit)}
                onArchive={() => archive.mutate(habit.id)}
                onDelete={() => remove.mutate(habit.id)}
              />
            );
          }}
        />
      )}

      <QuickLogSheet
        ref={quickLogRef}
        habit={quickLogHabit}
        onSubmit={(value) => {
          if (quickLogHabit) logDate.mutate({ habitId: quickLogHabit.id, logDate: toDateKey(new Date()), value });
        }}
      />

      <HabitsFabSheet ref={fabSheetRef} />
      <Fab onPress={() => fabSheetRef.current?.present()} accessibilityLabel="Add habit or routine" />
    </View>
  );
}
