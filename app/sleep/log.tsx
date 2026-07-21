import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, set, subDays } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays, Moon, Sun, Trash2, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { TimeField } from '@/features/sleep/components/time-field';
import { durationBetween, formatDuration } from '@/features/sleep/services/sleep-stats';
import { useSleepMutations } from '@/features/sleep/hooks/use-sleep-mutations';
import { useSleepSession } from '@/features/sleep/hooks/use-sleep';
import { useColorScheme } from '@/hooks/use-color-scheme';

const FELL_ASLEEP_OPTIONS = [0, 5, 10, 15, 20, 30, 45];

/** Combines the night date with a time-of-day, rolling bedtime to the previous
 * day when it lands at/after the wake time (i.e. an overnight sleep). */
function buildTimestamps(nightDate: Date, bed: Date, wake: Date) {
  const wakeAt = set(nightDate, { hours: wake.getHours(), minutes: wake.getMinutes(), seconds: 0, milliseconds: 0 });
  let bedAt = set(nightDate, { hours: bed.getHours(), minutes: bed.getMinutes(), seconds: 0, milliseconds: 0 });
  if (bedAt.getTime() >= wakeAt.getTime()) bedAt = subDays(bedAt, 1);
  return { bedtime: bedAt.getTime(), wakeTime: wakeAt.getTime(), logDate: format(nightDate, 'yyyy-MM-dd') };
}

export default function SleepLogScreen() {
  const { id, bedtimeTs, wakeTs } = useLocalSearchParams<{ id?: string; bedtimeTs?: string; wakeTs?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const sleepTint = moduleTint('sleep', scheme);
  const { create, update, remove } = useSleepMutations();
  const { data: existing } = useSleepSession(id);

  const isEdit = !!id;

  // Prefill priority: existing record (edit) → tracker hand-off (bed/wake
  // timestamps) → sensible defaults.
  const bedParam = bedtimeTs ? Number(bedtimeTs) : null;
  const wakeParam = wakeTs ? Number(wakeTs) : null;

  const [nightDate, setNightDate] = useState(() => {
    if (existing) return new Date(`${existing.logDate}T00:00:00`);
    if (wakeParam) return set(new Date(wakeParam), { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
    return new Date();
  });
  const [bed, setBed] = useState(() =>
    existing ? new Date(existing.bedtime) : bedParam ? new Date(bedParam) : set(new Date(), { hours: 23, minutes: 0 }),
  );
  const [wake, setWake] = useState(() =>
    existing ? new Date(existing.wakeTime) : wakeParam ? new Date(wakeParam) : set(new Date(), { hours: 7, minutes: 0 }),
  );
  const [fellAsleep, setFellAsleep] = useState<number | null>(existing?.fellAsleepMinutes ?? null);
  const [quality, setQuality] = useState<number | null>(existing?.quality ?? null);
  const [note, setNote] = useState(existing?.note ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Re-seed state once the async session load resolves in edit mode.
  const [seeded, setSeeded] = useState(false);
  if (isEdit && existing && !seeded) {
    setNightDate(new Date(`${existing.logDate}T00:00:00`));
    setBed(new Date(existing.bedtime));
    setWake(new Date(existing.wakeTime));
    setFellAsleep(existing.fellAsleepMinutes ?? null);
    setQuality(existing.quality ?? null);
    setNote(existing.note ?? '');
    setSeeded(true);
  }

  const previewMinutes = useMemo(() => {
    const { bedtime, wakeTime } = buildTimestamps(nightDate, bed, wake);
    return durationBetween(bedtime, wakeTime);
  }, [nightDate, bed, wake]);

  const asleepMinutes = Math.max(0, previewMinutes - (fellAsleep ?? 0));

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && date) setNightDate(date);
  };

  const save = () => {
    const { bedtime, wakeTime, logDate } = buildTimestamps(nightDate, bed, wake);
    // Sleep can't happen in the future.
    if (wakeTime > Date.now()) {
      Alert.alert("That's in the future", "Your wake-up time hasn't happened yet. Pick a night and wake time that have already passed.");
      return;
    }
    if (isEdit && existing) {
      update.mutate({ id: existing.id, input: { bedtime, wakeTime, logDate, fellAsleepMinutes: fellAsleep, quality, note: note.trim() || null } });
    } else {
      create.mutate({ logDate, bedtime, wakeTime, fellAsleepMinutes: fellAsleep, quality, note: note.trim() || null });
    }
    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Delete sleep record?', 'This night will be removed from your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          remove.mutate(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-5 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full border border-border bg-surface">
          <X size={17} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="micro">{isEdit ? 'Edit Sleep' : 'Log Sleep'}</Text>
        {isEdit ? (
          <Pressable onPress={confirmDelete} hitSlop={10} className="h-8 w-8 items-center justify-center" accessibilityLabel="Delete">
            <Trash2 size={18} color={colors[scheme].destructive} />
          </Pressable>
        ) : (
          <View className="h-8 w-8" />
        )}
      </View>

      <ScrollView contentContainerClassName="gap-5 px-5 pt-3 pb-10" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <View className="flex-row items-center gap-2">
            <CalendarDays size={16} color={colors[scheme].mutedForeground} />
            <Text className="font-sora-medium text-foreground">Night of</Text>
          </View>
          {Platform.OS === 'ios' ? (
            <DateTimePicker value={nightDate} mode="date" display="compact" maximumDate={new Date()} onChange={handleDateChange} />
          ) : (
            <Pressable onPress={() => setShowDatePicker(true)} className="rounded-lg border border-border bg-surface px-3 py-1.5">
              <Text className="font-sora-semibold text-foreground">{format(nightDate, 'MMM d, yyyy')}</Text>
            </Pressable>
          )}
        </View>
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker value={nightDate} mode="date" display="default" maximumDate={new Date()} onChange={handleDateChange} />
        )}

        <View className="flex-row gap-3">
          <TimeField icon={Moon} label="Bedtime" value={bed} onChange={setBed} tint={sleepTint} />
          <TimeField icon={Sun} label="Wake up" value={wake} onChange={setWake} tint="#f59e0b" />
        </View>

        <View className="flex-row gap-3 rounded-2xl bg-surface p-4">
          <View className="flex-1 items-center gap-1">
            <Text variant="micro">In bed</Text>
            <Text className="font-sora-bold text-2xl text-foreground" style={{ fontVariant: ['tabular-nums'] }}>
              {formatDuration(previewMinutes)}
            </Text>
          </View>
          <View className="w-px bg-border" />
          <View className="flex-1 items-center gap-1">
            <Text variant="micro">Asleep</Text>
            <Text className="font-sora-extrabold text-2xl text-sleep" style={{ fontVariant: ['tabular-nums'] }}>
              {formatDuration(asleepMinutes)}
            </Text>
          </View>
        </View>

        <View className="gap-2.5">
          <Text variant="micro">Time to fall asleep (optional)</Text>
          <View className="flex-row flex-wrap gap-2">
            {FELL_ASLEEP_OPTIONS.map((minutes) => {
              const selected = fellAsleep === minutes;
              return (
                <Pressable
                  key={minutes}
                  onPress={() => setFellAsleep(selected ? null : minutes)}
                  className={`rounded-full border px-3.5 py-2 ${selected ? 'border-sleep bg-sleep' : 'border-border'}`}
                >
                  <Text className={selected ? 'font-sora-semibold text-white' : 'text-muted-foreground'}>
                    {minutes === 0 ? 'Instantly' : `${minutes}m`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2.5">
          <Text variant="micro">Quality (optional)</Text>
          <StarRating value={quality} onChange={setQuality} />
        </View>

        <View className="gap-2.5">
          <Text variant="micro">Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Dreams, disruptions, how you felt…"
            placeholderTextColor={colors[scheme].mutedForeground}
            multiline
            className="min-h-16 rounded-2xl border border-border bg-card px-4 py-3 text-foreground"
          />
        </View>

        <Button label={isEdit ? 'Save changes' : 'Save sleep'} onPress={save} size="lg" variant="accent" />
      </ScrollView>
    </View>
  );
}
