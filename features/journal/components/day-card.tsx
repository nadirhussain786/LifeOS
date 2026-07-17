import { format, isToday, parseISO } from 'date-fns';
import { Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { MOOD_EMOJI, MOOD_TINT } from '@/features/journal/constants';
import type { JournalEntry } from '@/features/journal/types/journal.types';

type Props = {
  entry: JournalEntry;
  onPress: () => void;
};

export function DayCard({ entry, onPress }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const date = parseISO(entry.entryDate);
  const snippet = entry.body.trim().slice(0, 90);
  const tint = entry.mood ? MOOD_TINT[entry.mood] : colors[scheme].mutedForeground;

  return (
    <View style={styles.shadowWrap}>
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 rounded-2xl border border-border bg-card py-3.5 pl-4 pr-4"
      >
        <View className="w-11 items-center">
          <Text variant="caption" className="font-sora-semibold uppercase">
            {format(date, 'EEE')}
          </Text>
          <Text style={{ fontSize: 20 }} className="font-sora-bold text-foreground">
            {format(date, 'd')}
          </Text>
        </View>

        <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${tint}1f` }}>
          <Text className="text-lg">{entry.mood ? MOOD_EMOJI[entry.mood] : '·'}</Text>
        </View>

        <View className="flex-1 gap-0.5">
          <Text
            numberOfLines={1}
            className={snippet ? 'font-journal text-[15px]' : 'font-journal-italic text-[15px] text-muted-foreground'}
          >
            {snippet || 'No reflection written'}
          </Text>
          {isToday(date) && <Text variant="caption">Today</Text>}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 0 },
    }),
  },
});
