import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/utils';
import type { TaskRecurrenceFrequency } from '@/features/tasks/types/task.types';

const OPTIONS: { value: TaskRecurrenceFrequency; labelKey: string }[] = [
  { value: 'none', labelKey: 'recurrence.oneTime' },
  { value: 'daily', labelKey: 'recurrence.daily' },
  { value: 'weekly', labelKey: 'recurrence.weekly' },
  { value: 'monthly', labelKey: 'recurrence.monthly' },
  { value: 'yearly', labelKey: 'recurrence.yearly' },
];

type Props = {
  value: TaskRecurrenceFrequency;
  onChange: (value: TaskRecurrenceFrequency) => void;
};

export function RecurrencePicker({ value, onChange }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="items-center gap-2"
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={
              selected
                ? { backgroundColor: colors[scheme].accent, borderColor: colors[scheme].accent }
                : undefined
            }
            className={cn('rounded-full border px-3 py-1.5', !selected && 'border-border')}
          >
            <Text
              className={cn('font-sora-medium', !selected && 'text-muted-foreground')}
              style={selected ? { color: colors[scheme].accentForeground } : undefined}
            >
              {t(option.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
