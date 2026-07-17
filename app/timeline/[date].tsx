import { FlashList } from '@shopify/flash-list';
import { addDays, format, parseISO, subDays } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Clock3, Plus } from 'lucide-react-native';
import { Pressable, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { TimelineEventRow } from '@/features/timeline/components/timeline-event-row';
import { useCalendarEventMutations } from '@/features/timeline/hooks/use-calendar-event-mutations';
import { useTimelineForDate } from '@/features/timeline/hooks/use-timeline';
import { toDateKey } from '@/lib/date';

export default function TimelineScreen() {
  const { date: dateKey } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';

  const date = parseISO(dateKey);
  const { data: events = [], isLoading } = useTimelineForDate(dateKey);
  const { remove } = useCalendarEventMutations();

  const goToDate = (next: Date) => router.setParams({ date: toDateKey(next) });

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <ChevronLeft size={20} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
          Life Timeline
        </Text>
        <Pressable
          onPress={() => router.push({ pathname: '/timeline/event/new', params: { date: dateKey } })}
          hitSlop={10}
        >
          <Plus size={20} color={colors[scheme].foreground} />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between px-4 pb-3">
        <Pressable onPress={() => goToDate(subDays(date, 1))} hitSlop={10} className="h-9 w-9 items-center justify-center">
          <ChevronLeft size={18} color={colors[scheme].mutedForeground} />
        </Pressable>
        <Text variant="heading">{format(date, 'EEEE, MMM d')}</Text>
        <Pressable onPress={() => goToDate(addDays(date, 1))} hitSlop={10} className="h-9 w-9 items-center justify-center">
          <ChevronRight size={18} color={colors[scheme].mutedForeground} />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="gap-2.5 px-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </View>
      ) : events.length === 0 ? (
        <EmptyState icon={Clock3} title="Nothing here yet" description="What you do today will show up here automatically." />
      ) : (
        <FlashList
          data={events}
          keyExtractor={(event) => event.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 }}
          renderItem={({ item }) => <TimelineEventRow event={item} onDeleteCalendarEvent={(id) => remove.mutate(id)} />}
        />
      )}
    </View>
  );
}
