import { eachDayOfInterval, endOfMonth, format, getDay, isToday, startOfMonth } from 'date-fns';
import { Pressable, useColorScheme, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { MOOD_TINT } from '@/features/journal/constants';
import type { JournalEntry, MoodOption } from '@/features/journal/types/journal.types';
import { toDateKey } from '@/lib/date';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  monthAnchor: Date;
  entries: JournalEntry[];
  onSelectDate: (dateKey: string) => void;
};

/** A month-at-a-glance mood grid — the "replay a month of your life" view,
 * distinct from the day-by-day timeline list below it. */
export function MoodMonthStrip({ monthAnchor, entries, onSelectDate }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const moodByDate = new Map(entries.filter((entry) => entry.mood).map((entry) => [entry.entryDate, entry.mood as MoodOption]));
  const todayKey = toDateKey(new Date());

  const start = startOfMonth(monthAnchor);
  const end = endOfMonth(monthAnchor);
  const days = eachDayOfInterval({ start, end });
  const leadingBlanks = getDay(start);

  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-4">
      <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
        {format(monthAnchor, 'MMMM')}
      </Text>

      <View className="flex-row">
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={`${label}-${index}`} className="flex-1 items-center">
            <Text variant="caption">{label}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {Array.from({ length: leadingBlanks }).map((_, index) => (
          <View key={`blank-${index}`} style={{ width: `${100 / 7}%` }} className="aspect-square p-0.5" />
        ))}
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const mood = moodByDate.get(dateKey);
          const tint = mood ? MOOD_TINT[mood] : undefined;
          const today = isToday(day);
          const isFuture = dateKey > todayKey;

          return (
            <View key={dateKey} style={{ width: `${100 / 7}%` }} className="aspect-square p-0.5">
              <Pressable
                onPress={() => onSelectDate(dateKey)}
                disabled={isFuture}
                accessibilityLabel={format(day, 'MMMM d')}
                accessibilityState={{ disabled: isFuture }}
                className="flex-1 items-center justify-center rounded-full"
                style={{
                  backgroundColor: tint ? `${tint}33` : colors[scheme].muted,
                  borderWidth: today ? 1.5 : 0,
                  borderColor: colors[scheme].accent,
                  opacity: isFuture ? 0.35 : 1,
                }}
              >
                <Text
                  variant="caption"
                  className="font-sora-medium"
                  style={{ color: tint ?? colors[scheme].mutedForeground }}
                >
                  {format(day, 'd')}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
