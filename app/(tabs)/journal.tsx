import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { BookOpen, Flame } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { DayCard } from '@/features/journal/components/day-card';
import { useJournalMonth, useJournalStreak } from '@/features/journal/hooks/use-journal';
import { useJournalEntry } from '@/features/journal/hooks/use-journal-entry';
import { toDateKey } from '@/lib/date';

const STREAK_COLOR = '#f59e0b';

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const todayKey = toDateKey(new Date());

  const { data: entries = [], isLoading } = useJournalMonth();
  const { data: streak = 0 } = useJournalStreak();
  const { data: todayEntry } = useJournalEntry(todayKey);

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="gap-3 px-4 pb-2">
        <View className="flex-row items-center justify-between">
          <Text variant="heading">Journal</Text>
          {streak > 0 && (
            <View className="flex-row items-center gap-1">
              <Flame size={14} color={STREAK_COLOR} fill={STREAK_COLOR} />
              <Text variant="muted" className="font-sora-medium" style={{ color: STREAK_COLOR }}>
                {streak}-day streak
              </Text>
            </View>
          )}
        </View>

        <Button
          label={todayEntry ? "Continue today's entry" : "Write today's entry"}
          variant="accent"
          onPress={() => router.push(`/journal/${todayKey}`)}
        />
      </View>

      {isLoading ? (
        <View className="gap-2.5 px-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </View>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Start your timeline"
          description="Every entry becomes part of your life's story — start with today."
        />
      ) : (
        <FlashList
          data={entries}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 40 }}
          renderItem={({ item: entry }) => (
            <DayCard entry={entry} onPress={() => router.push(`/journal/${entry.entryDate}`)} />
          )}
        />
      )}
    </View>
  );
}
