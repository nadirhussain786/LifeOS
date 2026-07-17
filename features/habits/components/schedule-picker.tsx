import * as Haptics from 'expo-haptics';
import { Pressable, TextInput, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import type { HabitScheduleType } from '@/features/habits/types/habit.types';

const SCHEDULE_OPTIONS: { value: HabitScheduleType; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom_days', label: 'Certain days' },
  { value: 'every_x_days', label: 'Every X days' },
  { value: 'flexible', label: 'Flexible' },
];

const WEEKDAYS = [
  { value: 0, label: 'S' },
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
];

type Props = {
  scheduleType: HabitScheduleType;
  scheduleDays: number[] | null;
  scheduleIntervalDays: number | null;
  onChangeType: (value: HabitScheduleType) => void;
  onChangeDays: (value: number[]) => void;
  onChangeInterval: (value: number | null) => void;
};

export function SchedulePicker({
  scheduleType,
  scheduleDays,
  scheduleIntervalDays,
  onChangeType,
  onChangeDays,
  onChangeInterval,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const selectedDays = new Set(scheduleDays ?? []);

  const toggleDay = (day: number) => {
    Haptics.selectionAsync();
    const next = new Set(selectedDays);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onChangeDays([...next].sort());
  };

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {SCHEDULE_OPTIONS.map((option) => {
          const selected = option.value === scheduleType;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                Haptics.selectionAsync();
                onChangeType(option.value);
              }}
              className="rounded-full border px-3 py-1.5"
              style={{
                borderColor: selected ? colors[scheme].accent : colors[scheme].border,
                backgroundColor: selected ? colors[scheme].accent : 'transparent',
              }}
            >
              <Text
                variant="caption"
                className="font-sora-medium"
                style={{ color: selected ? colors[scheme].accentForeground : colors[scheme].mutedForeground }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {scheduleType === 'custom_days' && (
        <View className="flex-row gap-2">
          {WEEKDAYS.map((day) => {
            const selected = selectedDays.has(day.value);
            return (
              <Pressable
                key={day.value}
                onPress={() => toggleDay(day.value)}
                className="h-9 w-9 items-center justify-center rounded-full border"
                style={{
                  borderColor: selected ? colors[scheme].accent : colors[scheme].border,
                  backgroundColor: selected ? colors[scheme].accent : 'transparent',
                }}
              >
                <Text
                  variant="caption"
                  className="font-sora-semibold"
                  style={{ color: selected ? colors[scheme].accentForeground : colors[scheme].mutedForeground }}
                >
                  {day.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {scheduleType === 'every_x_days' && (
        <View className="flex-row items-center gap-2">
          <Text variant="muted">Repeat every</Text>
          <TextInput
            value={scheduleIntervalDays ? String(scheduleIntervalDays) : ''}
            onChangeText={(text) => {
              const parsed = parseInt(text, 10);
              onChangeInterval(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
            }}
            keyboardType="number-pad"
            placeholder="3"
            placeholderTextColor={colors[scheme].mutedForeground}
            className="w-14 rounded-lg border border-border px-2 py-1.5 text-center text-foreground"
          />
          <Text variant="muted">days</Text>
        </View>
      )}
    </View>
  );
}
