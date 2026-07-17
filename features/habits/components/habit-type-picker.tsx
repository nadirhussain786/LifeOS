import * as Haptics from 'expo-haptics';
import { Ban, Clock, Gauge, Hash, MapPin, ToggleLeft } from 'lucide-react-native';
import { Pressable, useColorScheme, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import type { HabitType } from '@/features/habits/types/habit.types';

const OPTIONS: { value: HabitType; label: string; icon: typeof Hash }[] = [
  { value: 'boolean', label: 'Yes / No', icon: ToggleLeft },
  { value: 'count', label: 'Count', icon: Hash },
  { value: 'duration', label: 'Duration', icon: Clock },
  { value: 'distance', label: 'Distance', icon: MapPin },
  { value: 'time', label: 'Time of day', icon: Gauge },
  { value: 'negative', label: 'Avoid', icon: Ban },
];

export function HabitTypePicker({ value, onChange }: { value: HabitType; onChange: (value: HabitType) => void }) {
  const scheme = useColorScheme() ?? 'light';

  return (
    <View className="flex-row flex-wrap gap-2">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(option.value);
            }}
            className="flex-row items-center gap-1.5 rounded-full border px-3 py-2"
            style={{
              borderColor: selected ? colors[scheme].accent : colors[scheme].border,
              backgroundColor: selected ? colors[scheme].accent : 'transparent',
            }}
          >
            <Icon size={14} color={selected ? colors[scheme].accentForeground : colors[scheme].mutedForeground} />
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
  );
}
