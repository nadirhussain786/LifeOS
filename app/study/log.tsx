import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, set } from 'date-fns';
import { useRouter } from 'expo-router';
import { CalendarDays, Clock, Minus, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { SubjectPicker } from '@/features/study/components/subject-picker';
import { formatStudyDuration } from '@/features/study/services/study-stats';
import { useStudySubjects } from '@/features/study/hooks/use-study';
import { useStudyMutations } from '@/features/study/hooks/use-study-mutations';
import { useColorScheme } from '@/hooks/use-color-scheme';

const QUICK_MINUTES = [15, 25, 50, 90];

/** Manually logs a past / offline study session — the tracker for time spent
 * away from the live timer (studying from a book, class, etc.). */
export default function StudyLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const studyTint = moduleTint('study', scheme);
  const { data: subjects = [] } = useStudySubjects();
  const { logSession, addSubject } = useStudyMutations();

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date());
  const [startTime, setStartTime] = useState(() => set(new Date(), { seconds: 0, milliseconds: 0 }));
  const [minutes, setMinutes] = useState(25);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const handleDate = (event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (event.type === 'set' && value) setDate(value);
  };
  const handleTime = (event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS === 'android') setShowTime(false);
    if (event.type === 'set' && value) setStartTime(value);
  };

  const adjust = (delta: number) => setMinutes((m) => Math.min(600, Math.max(5, m + delta)));

  const save = () => {
    const startedAt = set(date, {
      hours: startTime.getHours(),
      minutes: startTime.getMinutes(),
      seconds: 0,
      milliseconds: 0,
    }).getTime();
    if (startedAt > Date.now()) {
      Alert.alert("That's in the future", 'Pick a start date and time that have already happened.');
      return;
    }
    logSession.mutate({
      subjectId,
      logDate: format(date, 'yyyy-MM-dd'),
      startedAt,
      endedAt: startedAt + minutes * 60_000,
      durationSeconds: minutes * 60,
      mode: 'custom',
      focusRating: rating,
      note: note.trim() || null,
    });
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-5 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full border border-border bg-surface">
          <X size={17} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="micro">Log Study Time</Text>
        <View className="h-8 w-8" />
      </View>

      <ScrollView contentContainerClassName="gap-5 px-5 pt-3 pb-10" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="gap-2.5">
          <Text variant="micro">Subject</Text>
          <SubjectPicker
            subjects={subjects}
            value={subjectId}
            onChange={setSubjectId}
            onCreate={(name, colorToken) => addSubject.mutate({ name, colorToken }, { onSuccess: (created) => setSubjectId(created.id) })}
          />
        </View>

        {/* Duration */}
        <View className="items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-e1">
          <Text variant="micro">How long did you study?</Text>
          <View className="flex-row items-center gap-6">
            <Pressable onPress={() => adjust(-5)} className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface" accessibilityLabel="Less">
              <Minus size={20} color={colors[scheme].foreground} />
            </Pressable>
            <Text className="font-sora-extrabold text-3xl" style={{ color: studyTint, minWidth: 120, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
              {formatStudyDuration(minutes * 60)}
            </Text>
            <Pressable onPress={() => adjust(5)} className="h-11 w-11 items-center justify-center rounded-2xl bg-study" accessibilityLabel="More">
              <Plus size={20} color="#ffffff" />
            </Pressable>
          </View>
          <View className="flex-row flex-wrap justify-center gap-2">
            {QUICK_MINUTES.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMinutes(m)}
                className="rounded-full border border-border px-3.5 py-1.5"
                style={minutes === m ? { backgroundColor: STUDY_TINT, borderColor: STUDY_TINT } : undefined}
              >
                <Text className={minutes === m ? 'font-sora-semibold text-white' : 'text-muted-foreground'}>{m}m</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* When */}
        <View className="flex-row gap-3">
          <View className="flex-1 flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <CalendarDays size={16} color={colors[scheme].mutedForeground} />
            {Platform.OS === 'ios' ? (
              <DateTimePicker value={date} mode="date" display="compact" maximumDate={new Date()} onChange={handleDate} />
            ) : (
              <Pressable onPress={() => setShowDate(true)}>
                <Text className="font-sora-semibold text-foreground">{format(date, 'MMM d')}</Text>
              </Pressable>
            )}
          </View>
          <View className="flex-1 flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <Clock size={16} color={colors[scheme].mutedForeground} />
            {Platform.OS === 'ios' ? (
              <DateTimePicker value={startTime} mode="time" display="compact" onChange={handleTime} />
            ) : (
              <Pressable onPress={() => setShowTime(true)}>
                <Text className="font-sora-semibold text-foreground">{format(startTime, 'h:mm a')}</Text>
              </Pressable>
            )}
          </View>
        </View>
        {Platform.OS === 'android' && showDate && (
          <DateTimePicker value={date} mode="date" display="default" maximumDate={new Date()} onChange={handleDate} />
        )}
        {Platform.OS === 'android' && showTime && <DateTimePicker value={startTime} mode="time" display="default" onChange={handleTime} />}

        <View className="items-center gap-2">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            How focused were you? (optional)
          </Text>
          <StarRating value={rating} onChange={setRating} />
        </View>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What did you work on? (optional)"
          placeholderTextColor={colors[scheme].mutedForeground}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-foreground"
        />

        <Button label="Save session" onPress={save} size="lg" variant="accent" />
      </ScrollView>
    </View>
  );
}
