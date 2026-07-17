import { addDays, addHours, format, set } from 'date-fns';
import { Pressable, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
};

const QUICK_PICKS = [
  { label: 'In 1 hour', getDate: () => addHours(new Date(), 1).getTime() },
  { label: 'This evening', getDate: () => set(new Date(), { hours: 18, minutes: 0, seconds: 0, milliseconds: 0 }).getTime() },
  { label: 'Tomorrow 9am', getDate: () => set(addDays(new Date(), 1), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }).getTime() },
  { label: 'Next week', getDate: () => set(addDays(new Date(), 7), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }).getTime() },
] as const;

/** Quick-pick reminder chips rather than a raw date/time picker — covers the
 * common "remind me later" cases without the cross-platform hassle of
 * @react-native-community/datetimepicker's mode="datetime" (iOS-only; Android
 * needs a separate date then time dialog). */
export function ReminderPicker({ value, onChange }: Props) {
  const scheme = useColorScheme() ?? 'light';

  return (
    <View className="gap-2">
      {value !== null && (
        <View className="flex-row items-center justify-between">
          <Text variant="muted">{format(value, "EEE, MMM d 'at' h:mm a")}</Text>
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <Text variant="caption" className="font-sora-medium" style={{ color: colors[scheme].destructive }}>
              Clear
            </Text>
          </Pressable>
        </View>
      )}
      <View className="flex-row flex-wrap gap-2">
        {QUICK_PICKS.map((option) => (
          <Pressable key={option.label} onPress={() => onChange(option.getDate())} className="rounded-full border border-border px-3 py-1.5">
            <Text variant="caption" className="font-sora-medium">
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
