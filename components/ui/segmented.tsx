import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type SegmentOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Fill color for the active segment — defaults to the app foreground. */
  activeColor?: string;
};

/**
 * Compact segmented control — a row of equal-width pills where the selected
 * one fills. Generic over its value type so any small enum choice (priority,
 * progress mode, chart range…) can use it consistently across modules.
 */
export function Segmented<T extends string>({ options, value, onChange, activeColor }: Props<T>) {
  return (
    <View className="flex-row rounded-full bg-muted p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(option.value);
            }}
            // Shadow is applied inline, NOT via a `shadow-*` className: NativeWind's
            // runtime parsing of shadow/opacity utilities races with expo-router's
            // navigation context init and throws "Couldn't find a navigation
            // context" on the screens this control appears on.
            style={[
              selected && activeColor ? { backgroundColor: activeColor } : undefined,
              selected ? { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 } : undefined,
            ]}
            className={cn('flex-1 items-center rounded-full py-1.5', selected && !activeColor && 'bg-background')}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text
              className={cn('text-sm font-sora-medium', selected ? (activeColor ? 'text-white' : 'text-foreground') : 'text-muted-foreground')}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
