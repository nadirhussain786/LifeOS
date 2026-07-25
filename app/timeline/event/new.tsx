import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { addMinutes, format, parseISO, set } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bell, Clock, Palette, StickyNote } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AttributeRow } from '@/components/ui/attribute-row';
import { Button } from '@/components/ui/button';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Text } from '@/components/ui/text';
import { categoryColorPalette, colors } from '@/constants/theme';
import { useCalendarEventMutations } from '@/features/timeline/hooks/use-calendar-event-mutations';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';

const DURATIONS = [
  { label: 'None', minutes: null },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
] as const;

const REMINDER_OPTIONS = [
  { label: 'None', minutesBefore: null },
  { label: 'At time', minutesBefore: 0 },
  { label: '10m before', minutesBefore: 10 },
  { label: '30m before', minutesBefore: 30 },
  { label: '1h before', minutesBefore: 60 },
] as const;

export default function NewCalendarEventScreen() {
  const { date: dateKey } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const keyboardHeight = useKeyboardHeight();
  const { create } = useCalendarEventMutations();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [time, setTime] = useState(() => set(parseISO(dateKey), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [colorToken, setColorToken] = useState<string>(categoryColorPalette[3]);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number | null>(30);

  const wash = `${colorToken}33`;

  const handleTimeChange = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'set' && next) {
      setTime(set(parseISO(dateKey), { hours: next.getHours(), minutes: next.getMinutes(), seconds: 0, milliseconds: 0 }));
    }
  };

  const handleAdd = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    create.mutate({
      title: trimmed,
      startAt: time.getTime(),
      endAt: durationMinutes ? addMinutes(time, durationMinutes).getTime() : null,
      colorToken,
      notes: notes.trim() || null,
      reminderMinutesBefore,
    });
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      <LinearGradient colors={[wash, 'transparent']} style={[StyleSheet.absoluteFillObject, { height: 220 }]} />

      <SheetHeader title="New Event" />

      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            {format(parseISO(dateKey), 'EEEE, MMM d')}
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Team meeting, dentist appointment…"
            placeholderTextColor={colors[scheme].mutedForeground}
            autoFocus
            multiline
            style={{ fontSize: 26, lineHeight: 32, minHeight: 64, fontFamily: 'Sora_700Bold', color: colors[scheme].foreground }}
          />
        </View>

        <View className="rounded-2xl border border-border bg-card px-4">
          <AttributeRow icon={Clock} label="Time" isFirst>
            {Platform.OS === 'ios' ? (
              <DateTimePicker value={time} mode="time" display="compact" onChange={handleTimeChange} />
            ) : (
              <Pressable
                onPress={() => setShowTimePicker(true)}
                className="flex-row items-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5"
              >
                <Clock size={14} color={colors[scheme].mutedForeground} />
                <Text variant="muted">{format(time, 'h:mm a')}</Text>
              </Pressable>
            )}
          </AttributeRow>

          <AttributeRow icon={Clock} label="Duration">
            <View className="flex-row gap-2">
              {DURATIONS.map((option) => {
                const selected = durationMinutes === option.minutes;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDurationMinutes(option.minutes);
                    }}
                    className="flex-1 items-center rounded-full border py-1.5"
                    style={{
                      borderColor: selected ? colorToken : colors[scheme].border,
                      backgroundColor: selected ? colorToken : 'transparent',
                    }}
                  >
                    <Text
                      variant="caption"
                      className="font-sora-medium"
                      style={{ color: selected ? '#ffffff' : colors[scheme].mutedForeground }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </AttributeRow>

          <AttributeRow icon={Palette} label="Color">
            <View className="flex-row gap-2.5">
              {categoryColorPalette.map((swatch) => {
                const selected = swatch === colorToken;
                return (
                  <Pressable
                    key={swatch}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setColorToken(swatch);
                    }}
                    accessibilityLabel={`Color ${swatch}`}
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: swatch, borderWidth: selected ? 2 : 0, borderColor: colors[scheme].foreground }}
                  />
                );
              })}
            </View>
          </AttributeRow>

          <AttributeRow icon={Bell} label="Reminder">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {REMINDER_OPTIONS.map((option) => {
                const selected = reminderMinutesBefore === option.minutesBefore;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setReminderMinutesBefore(option.minutesBefore);
                    }}
                    className="items-center rounded-full border px-3 py-1.5"
                    style={{
                      borderColor: selected ? colorToken : colors[scheme].border,
                      backgroundColor: selected ? colorToken : 'transparent',
                    }}
                  >
                    <Text
                      variant="caption"
                      className="font-sora-medium"
                      style={{ color: selected ? '#ffffff' : colors[scheme].mutedForeground }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </AttributeRow>
        </View>

        <View className="gap-2.5">
          <View className="flex-row items-center gap-1.5">
            <StickyNote size={13} color={colors[scheme].mutedForeground} />
            <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
              Notes
            </Text>
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Add details…"
            placeholderTextColor={colors[scheme].mutedForeground}
            className="min-h-20 rounded-2xl border border-border bg-card p-4 text-base text-foreground"
            textAlignVertical="top"
          />
        </View>

        {Platform.OS === 'android' && showTimePicker ? (
          <DateTimePicker value={time} mode="time" display="default" onChange={handleTimeChange} />
        ) : null}

        <Button label="Add event" onPress={handleAdd} disabled={!title.trim()} size="lg" variant="accent" />
      </ScrollView>
    </View>
  );
}
