import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, useColorScheme } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/utils';
import type { TaskRecurrenceFrequency } from '@/features/tasks/types/task.types';

const OPTIONS: { value: TaskRecurrenceFrequency; label: string }[] = [
  { value: 'none', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

type Props = {
  value: TaskRecurrenceFrequency;
  onChange: (value: TaskRecurrenceFrequency) => void;
};

export function RecurrencePicker({ value, onChange }: Props) {
  const scheme = useColorScheme() ?? 'light';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-2">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={selected ? { backgroundColor: colors[scheme].accent, borderColor: colors[scheme].accent } : undefined}
            className={cn('rounded-full border px-3 py-1.5', !selected && 'border-border')}
          >
            <Text
              className={cn('font-sora-medium', !selected && 'text-muted-foreground')}
              style={selected ? { color: colors[scheme].accentForeground } : undefined}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
