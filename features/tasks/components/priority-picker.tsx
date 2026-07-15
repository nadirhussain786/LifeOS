import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/features/tasks/types/task.types';

const OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

// Mirrors TaskRow's priority dot colors, so the picker and the list read as
// one consistent language: red means urgent everywhere, not just here.
const SELECTED_STYLE: Record<TaskPriority, string> = {
  none: 'border-border bg-muted',
  low: 'border-muted-foreground bg-background',
  medium: 'border-foreground bg-foreground',
  high: 'border-destructive bg-destructive',
};

const SELECTED_TEXT: Record<TaskPriority, string> = {
  none: 'text-muted-foreground',
  low: 'text-foreground',
  medium: 'text-background',
  high: 'text-primary-foreground',
};

const DOT_STYLE: Record<TaskPriority, string> = {
  none: 'border border-border',
  low: 'border border-muted-foreground',
  medium: 'bg-foreground',
  high: 'bg-destructive',
};

type Props = {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
};

export function PriorityPicker({ value, onChange }: Props) {
  return (
    <View className="flex-row gap-2">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(option.value);
            }}
            className={cn(
              'flex-1 flex-row items-center justify-center gap-1.5 rounded-full border py-2',
              selected ? SELECTED_STYLE[option.value] : 'border-border bg-transparent',
            )}
          >
            {!selected && option.value !== 'none' && <View className={cn('h-2 w-2 rounded-full', DOT_STYLE[option.value])} />}
            <Text
              variant="caption"
              className={cn('font-medium', selected ? SELECTED_TEXT[option.value] : 'text-muted-foreground')}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
