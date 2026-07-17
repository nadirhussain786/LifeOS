import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, set } from 'date-fns';
import { CalendarDays, Clock, X } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/utils';

type Props = {
  value: number | null;
  hasTime: boolean;
  onChange: (value: number | null, hasTime: boolean) => void;
};

/**
 * iOS's "compact" display renders its own always-visible tappable field
 * that opens a native popover — no show/hide state needed. Android's
 * picker is imperative-only: it opens as a dialog the instant it mounts
 * and has no persistent inline form, so it's conditionally mounted only
 * while `showPicker`/`showTimePicker` is true and unmounted again on close.
 */
export function DueDateField({ value, hasTime, onChange }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const [showPicker, setShowPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'set' && date) onChange(date.getTime(), hasTime);
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'set' && date && value) {
      const combined = set(new Date(value), { hours: date.getHours(), minutes: date.getMinutes(), seconds: 0 });
      onChange(combined.getTime(), true);
    }
  };

  const clearTime = () => {
    if (!value) return;
    onChange(set(new Date(value), { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }).getTime(), false);
  };

  return (
    <View className="flex-row flex-wrap items-center gap-2">
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display="compact"
          onChange={handleDateChange}
        />
      ) : (
        <Pressable
          onPress={() => setShowPicker(true)}
          className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5"
        >
          <CalendarDays size={14} color={colors[scheme].mutedForeground} />
          <Text variant="muted">{value ? format(value, 'MMM d, yyyy') : 'Due date'}</Text>
        </Pressable>
      )}

      {value ? (
        <Pressable onPress={() => onChange(null, false)} hitSlop={8}>
          <X size={16} color={colors[scheme].mutedForeground} />
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => value && setShowTimePicker(true)}
        disabled={!value}
        className={cn('flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5', !value && 'opacity-40')}
      >
        <Clock size={14} color={colors[scheme].mutedForeground} />
        <Text variant="muted">{hasTime && value ? format(value, 'h:mm a') : 'No time'}</Text>
      </Pressable>

      {hasTime ? (
        <Pressable onPress={clearTime} hitSlop={8}>
          <X size={16} color={colors[scheme].mutedForeground} />
        </Pressable>
      ) : null}

      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker value={value ? new Date(value) : new Date()} mode="date" display="default" onChange={handleDateChange} />
      ) : null}

      {showTimePicker && value ? (
        <DateTimePicker
          value={new Date(value)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      ) : null}
    </View>
  );
}
