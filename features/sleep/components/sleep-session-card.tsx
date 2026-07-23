import { format, parseISO } from 'date-fns';
import { ArrowRight, Moon, Star, Sun } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { formatClock, formatDuration, minutesOfDay } from '@/features/sleep/services/sleep-stats';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { asleepMinutes, type SleepSession } from '@/features/sleep/types/sleep.types';

type Props = {
  session: SleepSession;
  goalMinutes: number;
  onPress: (session: SleepSession) => void;
};

export function SleepSessionCard({ session, goalMinutes, onPress }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const sleepTint = moduleTint('sleep', scheme);
  const metGoal = session.durationMinutes >= goalMinutes;

  return (
    <Pressable
      onPress={() => onPress(session)}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4"
      accessibilityRole="button"
      accessibilityLabel={`Sleep on ${session.logDate}`}
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${sleepTint}1f` }}>
        <Moon size={20} color={sleepTint} />
      </View>

      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-sora-semibold text-foreground">{format(parseISO(session.logDate), 'EEE, MMM d')}</Text>
          {metGoal && <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />}
        </View>
        <View className="flex-row items-center gap-1.5">
          <Moon size={12} color={colors[scheme].mutedForeground} />
          <Text variant="caption">{formatClock(minutesOfDay(session.bedtime))}</Text>
          <ArrowRight size={11} color={colors[scheme].mutedForeground} />
          <Sun size={12} color={colors[scheme].mutedForeground} />
          <Text variant="caption">{formatClock(minutesOfDay(session.wakeTime))}</Text>
        </View>
        {session.fellAsleepMinutes != null && (
          <Text variant="caption">
            {formatDuration(asleepMinutes(session))} asleep · {session.fellAsleepMinutes}m to nod off
          </Text>
        )}
      </View>

      <View className="items-end gap-1">
        <Text className="font-sora-bold" style={{ color: metGoal ? '#22c55e' : colors[scheme].foreground }}>
          {formatDuration(session.durationMinutes)}
        </Text>
        {session.quality ? (
          <View className="flex-row items-center gap-0.5">
            <Star size={11} color="#eab308" fill="#eab308" />
            <Text variant="caption">{session.quality}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
