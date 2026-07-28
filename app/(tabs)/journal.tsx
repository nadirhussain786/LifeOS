import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Bell, BookOpen, Flame } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { QueryError } from '@/components/ui/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { DayCard } from '@/features/journal/components/day-card';
import { MoodMonthStrip } from '@/features/journal/components/mood-month-strip';
import { useJournalMonth, useJournalStreak } from '@/features/journal/hooks/use-journal';
import { useJournalEntry } from '@/features/journal/hooks/use-journal-entry';
import { toDateKey } from '@/lib/date';

const STREAK_COLOR = '#f59e0b';

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const todayKey = toDateKey(new Date());

  const { data: entries = [], isLoading, isError, refetch } = useJournalMonth();
  const { data: streak = 0 } = useJournalStreak();
  const { data: todayEntry } = useJournalEntry(todayKey);

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="gap-5 px-5 pb-2">
        <View className="flex-row items-center justify-between">
          <Text variant="heading">{t('tabs.journal')}</Text>
          <View className="flex-row items-center gap-3">
            {streak > 0 && (
              <View className="flex-row items-center gap-1">
                <Flame size={14} color={STREAK_COLOR} fill={STREAK_COLOR} />
                <Text variant="muted" className="font-sora-medium" style={{ color: STREAK_COLOR }}>
                  {t('dashboard.dayStreak', { count: streak })}
                </Text>
              </View>
            )}
            <Pressable onPress={() => router.push('/journal/reminder-settings')} hitSlop={8}>
              <Bell size={19} color={colors[scheme].foreground} />
            </Pressable>
          </View>
        </View>

        <Button
          label={todayEntry ? t('journal.continueEntry') : t('journal.writeEntry')}
          variant="accent"
          onPress={() => router.push(`/journal/${todayKey}`)}
        />
      </View>

      {isError ? (
        <QueryError onRetry={() => refetch()} />
      ) : isLoading ? (
        <View className="gap-2.5 px-5">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </View>
      ) : (
        <FlashList
          data={entries}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 40 }}
          ListHeaderComponent={
            <View className="mx-5 mb-4">
              <MoodMonthStrip
                monthAnchor={new Date()}
                entries={entries}
                onSelectDate={(dateKey) => router.push(`/journal/${dateKey}`)}
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon={BookOpen}
              title={t('journal.startTimeline')}
              description={t('journal.emptyBody')}
            />
          }
          renderItem={({ item: entry }) => (
            <DayCard entry={entry} onPress={() => router.push(`/journal/${entry.entryDate}`)} />
          )}
        />
      )}
    </View>
  );
}
