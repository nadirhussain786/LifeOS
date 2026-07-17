import * as Haptics from 'expo-haptics';
import { Archive, Check, Flame, Plus, Trash2 } from 'lucide-react-native';
import { Pressable, useColorScheme, View } from 'react-native';

import { SwipeableRow } from '@/components/ui/swipeable-row';
import { Text } from '@/components/ui/text';
import { colors, habitDoneColor } from '@/constants/theme';
import type { HabitWithToday } from '@/features/habits/types/habit.types';

type Props = {
  habit: HabitWithToday;
  onPress: () => void;
  onToggleDone: () => void;
  onQuickLog: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

const QUANTIFIED_TYPES = new Set(['count', 'duration', 'distance', 'time']);
const STREAK_COLOR = '#f59e0b';

export function HabitRow({ habit, onPress, onToggleDone, onQuickLog, onArchive, onDelete }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const isDone = habit.todayStatus === 'done';
  const isQuantified = QUANTIFIED_TYPES.has(habit.type);
  const tint = habit.colorToken ?? colors[scheme].accent;

  const handleToggle = () => {
    Haptics.impactAsync(isDone ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    onToggleDone();
  };

  const streakLabel = habit.type === 'negative' ? `${habit.currentStreak}d without` : `${habit.currentStreak}d streak`;

  return (
    <SwipeableRow
      actions={
        <>
          <Pressable
            onPress={onArchive}
            accessibilityLabel={`Archive "${habit.name}"`}
            className="flex-1 items-center justify-center bg-secondary"
          >
            <Archive color={colors[scheme].foreground} size={18} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            accessibilityLabel={`Delete "${habit.name}"`}
            className="flex-1 items-center justify-center bg-destructive"
          >
            <Trash2 color={colors[scheme].primaryForeground} size={18} />
          </Pressable>
        </>
      }
    >
      <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3 pl-4 pr-4">
        <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${tint}1f` }}>
          <Text className="text-xl">{habit.emoji ?? '🔥'}</Text>
        </View>

        <View className="flex-1 gap-1">
          <Text className="font-sora-medium" numberOfLines={1}>
            {habit.name}
          </Text>
          {habit.currentStreak > 0 && (
            <View className="flex-row items-center gap-1">
              <Flame size={12} color={STREAK_COLOR} fill={STREAK_COLOR} />
              <Text variant="caption" style={{ color: STREAK_COLOR }} className="font-sora-medium">
                {streakLabel}
              </Text>
            </View>
          )}
        </View>

        {isQuantified ? (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onQuickLog();
            }}
            className="flex-row items-center gap-1 rounded-full border border-border px-3 py-1.5"
          >
            {habit.todayValue ? (
              <Text variant="caption" className="font-sora-medium">
                {habit.todayValue}
                {habit.unit ? ` ${habit.unit}` : ''}
              </Text>
            ) : null}
            <Plus size={14} color={colors[scheme].mutedForeground} />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleToggle}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isDone }}
            accessibilityLabel={isDone ? `Mark "${habit.name}" as not done` : `Mark "${habit.name}" as done`}
            className="h-9 w-9 items-center justify-center rounded-full border"
            style={{
              borderColor: isDone ? habitDoneColor : colors[scheme].border,
              backgroundColor: isDone ? habitDoneColor : 'transparent',
            }}
          >
            {isDone ? <Check size={17} color="#ffffff" /> : null}
          </Pressable>
        )}
      </Pressable>
    </SwipeableRow>
  );
}
