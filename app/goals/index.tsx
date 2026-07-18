import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ArrowUpDown, ChevronLeft, Search, Target } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { GOAL_CATEGORIES } from '@/features/goals/config/goal-categories';
import { GoalCard } from '@/features/goals/components/goal-card';
import { GoalsStatsHeader } from '@/features/goals/components/goals-stats-header';
import { useGoals, useGoalStats } from '@/features/goals/hooks/use-goals';
import { useGoalsFilterStore, type GoalSort } from '@/features/goals/store/goals-filter-store';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'active' as const, label: 'Active' },
  { value: 'completed' as const, label: 'Completed' },
  { value: 'archived' as const, label: 'Archived' },
];

const SORT_LABELS: Record<GoalSort, string> = {
  manual: 'Default',
  progress: 'Progress',
  due: 'Due date',
  priority: 'Priority',
  created: 'Newest',
};

const SORT_CYCLE: GoalSort[] = ['manual', 'progress', 'due', 'priority', 'created'];

export default function GoalsScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const [showSearch, setShowSearch] = useState(false);

  const { data: goals = [], isLoading } = useGoals();
  const { data: stats } = useGoalStats();
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    sort,
    setSort,
  } = useGoalsFilterStore();

  const cycleSort = () => {
    const next = SORT_CYCLE[(SORT_CYCLE.indexOf(sort) + 1) % SORT_CYCLE.length];
    setSort(next);
  };

  const header = (
    <View className="gap-4 pb-2">
      {stats && (statusFilter === 'active' ? stats.activeCount > 0 : true) && (
        <GoalsStatsHeader
          activeCount={stats.activeCount}
          completedCount={stats.completedCount}
          avgProgress={stats.avgProgress}
          nextDue={stats.nextDue}
        />
      )}

      <Segmented options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />

      {showSearch && (
        <View className="flex-row items-center gap-2 rounded-full bg-muted px-4 py-2.5">
          <Search size={16} color={colors[scheme].mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search goals"
            placeholderTextColor={colors[scheme].mutedForeground}
            autoFocus
            className="flex-1 text-foreground"
          />
        </View>
      )}

      <CategoryChips categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} />
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center justify-between px-4 pb-2">
        <View className="flex-row items-center gap-1">
          <Pressable onPress={() => router.back()} hitSlop={8} className="-ml-1 p-1" accessibilityLabel="Back">
            <ChevronLeft size={24} color={colors[scheme].foreground} />
          </Pressable>
          <Text variant="heading">Goals</Text>
        </View>
        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => setShowSearch((s) => !s)} hitSlop={8} accessibilityLabel="Search">
            <Search size={20} color={colors[scheme].foreground} />
          </Pressable>
          <Pressable onPress={cycleSort} hitSlop={8} className="flex-row items-center gap-1" accessibilityLabel="Change sort">
            <ArrowUpDown size={18} color={colors[scheme].foreground} />
            <Text variant="caption">{SORT_LABELS[sort]}</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View className="gap-3 px-4 pt-2">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </View>
      ) : (
        <FlashList
          data={goals}
          keyExtractor={(goal) => goal.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            <View style={{ minHeight: 340 }}>
              <EmptyState
                icon={Target}
                title={statusFilter === 'active' ? 'No goals yet' : `No ${statusFilter} goals`}
                description={
                  statusFilter === 'active'
                    ? 'Set an ambition and track it to the finish line.'
                    : 'Goals you finish or archive will show up here.'
                }
                tint="#f97316"
                actionLabel={statusFilter === 'active' ? 'Create a goal' : undefined}
                onAction={statusFilter === 'active' ? () => router.push('/goals/new') : undefined}
              />
            </View>
          }
          renderItem={({ item }) => <GoalCard goal={item} onPress={(goal) => router.push(`/goals/${goal.id}`)} />}
        />
      )}

      <Fab onPress={() => router.push('/goals/new')} accessibilityLabel="Add goal" />
    </View>
  );
}

/** Horizontally-scrolling category filter chips (All + each category). */
function CategoryChips({
  categoryFilter,
  setCategoryFilter,
}: {
  categoryFilter: string;
  setCategoryFilter: (c: never) => void;
}) {
  const items = [{ id: 'all', label: 'All', tint: '#737373' }, ...GOAL_CATEGORIES];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-2">
      {items.map((item) => {
        const selected = categoryFilter === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => setCategoryFilter(item.id as never)}
            style={selected ? { backgroundColor: item.tint, borderColor: item.tint } : undefined}
            className={cn('rounded-full border px-3 py-1.5', !selected && 'border-border')}
          >
            <Text className={selected ? 'font-sora-medium text-white' : 'text-muted-foreground'}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
