import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { priorityColors } from '@/constants/theme';
import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/features/tasks/types/task.types';

const OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

// Priority is its own traffic-light color system (calm blue → amber → red),
// deliberately distinct from the brand accent — see constants/theme.ts.
type ColoredPriority = keyof typeof priorityColors;

function isColored(value: TaskPriority): value is ColoredPriority {
  return value !== 'none';
}

export function PriorityPicker({ value, onChange }: { value: TaskPriority; onChange: (value: TaskPriority) => void }) {
  return (
    <View className="flex-row gap-2">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        const color = isColored(option.value) ? priorityColors[option.value] : undefined;
        const textIsWhite = selected && !!color;

        return (
          <Pressable
            key={option.value}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(option.value);
            }}
            className={cn(
              'flex-1 flex-row items-center justify-center gap-1.5 rounded-full border py-2',
              !color && (selected ? 'border-border bg-surface' : 'border-border bg-transparent'),
            )}
            style={color ? { borderColor: color, backgroundColor: selected ? color : 'transparent' } : undefined}
          >
            {color && !selected && <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
            <Text
              variant="caption"
              className={cn('font-sora-medium', !textIsWhite && 'text-muted-foreground')}
              style={textIsWhite ? { color: '#ffffff' } : undefined}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
