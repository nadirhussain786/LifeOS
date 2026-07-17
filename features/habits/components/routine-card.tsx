import * as Haptics from 'expo-haptics';
import { Pencil } from 'lucide-react-native';
import { Pressable, useColorScheme, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors, habitDoneColor } from '@/constants/theme';
import type { RoutineWithHabits } from '@/features/habits/types/habit.types';

type Props = {
  routine: RoutineWithHabits;
  onEdit: () => void;
  onToggleHabit: (habitId: string, done: boolean) => void;
  onOpenHabit: (habitId: string) => void;
};

const QUANTIFIED_TYPES = new Set(['count', 'duration', 'distance', 'time']);

export function RoutineCard({ routine, onEdit, onToggleHabit, onOpenHabit }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const doneCount = routine.habits.filter((habit) => habit.todayStatus === 'done').length;

  return (
    <View className="mx-4 mb-2.5 gap-3 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 gap-0.5">
          <Text className="font-sora-semibold">{routine.name}</Text>
          <Text variant="caption">
            {doneCount}/{routine.habits.length} done
          </Text>
        </View>
        <Pressable onPress={onEdit} hitSlop={8} accessibilityLabel={`Edit "${routine.name}" routine`}>
          <Pencil size={16} color={colors[scheme].mutedForeground} />
        </Pressable>
      </View>

      {routine.habits.length === 0 ? (
        <Text variant="muted">No habits in this routine yet.</Text>
      ) : (
        <View>
          {/* Continuous connector line behind the icon column, from the first to the last habit. */}
          <View
            className="absolute bottom-5 left-[15px] top-5 w-[2px]"
            style={{ backgroundColor: colors[scheme].border }}
          />
          {routine.habits.map((habit) => {
            const isDone = habit.todayStatus === 'done';
            const isQuantified = QUANTIFIED_TYPES.has(habit.type);
            return (
              <Pressable
                key={habit.id}
                onPress={() => onOpenHabit(habit.id)}
                className="flex-row items-center gap-3 py-2"
              >
                <View
                  className="h-8 w-8 items-center justify-center rounded-full border bg-card"
                  style={{ borderColor: isDone ? habitDoneColor : colors[scheme].border }}
                >
                  <Text className="text-sm">{habit.emoji ?? '🔥'}</Text>
                </View>
                <Text className={isDone ? 'flex-1 text-muted-foreground line-through' : 'flex-1'} numberOfLines={1}>
                  {habit.name}
                </Text>
                {!isQuantified && (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(isDone ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
                      onToggleHabit(habit.id, isDone);
                    }}
                    hitSlop={8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isDone }}
                    className="h-7 w-7 items-center justify-center rounded-full border"
                    style={{
                      borderColor: isDone ? habitDoneColor : colors[scheme].border,
                      backgroundColor: isDone ? habitDoneColor : 'transparent',
                    }}
                  >
                    {isDone && <Text style={{ color: '#ffffff', fontSize: 12 }}>✓</Text>}
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
