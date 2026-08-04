import { format, parseISO } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { ChipRow, PrivateScreen } from '@/features/private/components/private-screen';
import { privateModule } from '@/features/private/config/private-modules';
import {
  addCycleEntry,
  listCycleEntries,
  removeCycleEntry,
} from '@/features/private/services/cycle';
import {
  SYMPTOMS,
  averageCycleLength,
  dayOfCycle,
  periodsFrom,
  predictedNextStart,
  type Flow,
  type Symptom,
} from '@/features/private/services/cycle-math';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

const FLOWS: Flow[] = ['spotting', 'light', 'medium', 'heavy'];
const TINT = privateModule('cycle')?.tint ?? '#e0518a';

export default function CycleScreen() {
  const scheme = useColorScheme() ?? 'light';
  const theme = colors[scheme];
  const { t } = useTranslation();

  // Entries are held in state and reloaded explicitly rather than derived
  // from a counter: the repository read is a synchronous SQLite call, so
  // there is nothing to memoise, and a `version` dep that the body never
  // reads is exactly the kind of lie exhaustive-deps exists to catch.
  const [entries, setEntries] = useState(listCycleEntries);
  const reload = useCallback(() => setEntries(listCycleEntries()), []);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [note, setNote] = useState('');

  const periods = useMemo(() => periodsFrom(entries), [entries]);
  const average = useMemo(() => averageCycleLength(periods), [periods]);
  const nextStart = useMemo(() => predictedNextStart(periods, average), [periods, average]);
  const currentDay = useMemo(() => dayOfCycle(periods), [periods]);

  const save = useCallback(() => {
    if (!flow && symptoms.length === 0 && !note.trim()) return;
    addCycleEntry({
      date: format(new Date(), 'yyyy-MM-dd'),
      flow,
      symptoms,
      mood: null,
      note: note.trim(),
    });
    setFlow(null);
    setSymptoms([]);
    setNote('');
    reload();
  }, [flow, symptoms, note, reload]);

  const confirmDelete = (id: string) =>
    Alert.alert(t('private.deleteEntry'), t('private.deleteEntryBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          removeCycleEntry(id);
          reload();
        },
      },
    ]);

  return (
    <PrivateScreen
      title={t('private.cycleTitle')}
      subtitle={t('private.cycleSubtitle')}
      tint={TINT}
      footer={
        <Button
          variant="accent"
          size="lg"
          label={t('private.logToday')}
          disabled={!flow && symptoms.length === 0 && !note.trim()}
          onPress={save}
        />
      }
    >
      {/* Summary */}
      <View className="flex-row gap-3">
        <View
          className="flex-1 gap-1 rounded-2xl px-4 py-3.5"
          style={{ backgroundColor: alpha(TINT, 0.12) }}
        >
          <Text variant="caption">{t('private.dayOfCycle')}</Text>
          <Text className="font-sora-extrabold text-2xl" style={{ color: TINT }}>
            {currentDay ?? '—'}
          </Text>
        </View>
        <View className="flex-1 gap-1 rounded-2xl border border-border px-4 py-3.5">
          <Text variant="caption">{t('private.averageCycle')}</Text>
          <Text className="font-sora-extrabold text-2xl text-foreground">
            {average ? t('private.days', { count: average }) : '—'}
          </Text>
        </View>
      </View>

      {nextStart ? (
        <Text variant="caption" className="px-1">
          {/* Explicitly an estimate from her own history — see cycle-math.ts
              for why this module makes no medical claims. */}
          {t('private.estimatedNext', { date: format(parseISO(nextStart), 'd MMM') })}
        </Text>
      ) : (
        <Text variant="caption" className="px-1">
          {t('private.needMoreCycles')}
        </Text>
      )}

      {/* Today's log */}
      <View className="gap-3">
        <Text variant="micro">{t('private.flow')}</Text>
        <View className="flex-row gap-2">
          {FLOWS.map((option) => {
            const active = flow === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setFlow(active ? null : option)}
                className="flex-1 items-center rounded-2xl border py-3"
                style={{
                  borderColor: active ? TINT : theme.border,
                  backgroundColor: active ? alpha(TINT, 0.12) : 'transparent',
                }}
              >
                <Text
                  className="font-sora-medium text-sm"
                  style={{ color: active ? TINT : theme.foreground }}
                >
                  {t(`private.flow_${option}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-3">
        <Text variant="micro">{t('private.symptoms')}</Text>
        <ChipRow
          options={SYMPTOMS}
          selected={symptoms}
          tint={TINT}
          labelFor={(s) => t(`private.symptom_${s}`)}
          onToggle={(s) =>
            setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
          }
        />
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={t('private.notePlaceholder')}
        placeholderTextColor={theme.mutedForeground}
        multiline
        className="min-h-[88px] rounded-2xl border border-border bg-card px-4 py-3 text-foreground"
        style={{ fontFamily: 'Sora_400Regular', textAlignVertical: 'top' }}
      />

      {/* History */}
      {periods.length > 0 ? (
        <View className="gap-3">
          <Text variant="micro">{t('private.recentPeriods')}</Text>
          {periods.slice(0, 6).map((period) => (
            <View
              key={period.start}
              className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
            >
              <Text className="font-sora-medium text-foreground">
                {format(parseISO(period.start), 'd MMM yyyy')}
              </Text>
              <Text variant="caption">{t('private.days', { count: period.days })}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {entries.length > 0 ? (
        <View className="gap-3">
          <Text variant="micro">{t('private.allEntries')}</Text>
          {entries.slice(0, 20).map((entry) => (
            <Pressable
              key={entry.id}
              onLongPress={() => confirmDelete(entry.id)}
              accessibilityRole="button"
              accessibilityHint={t('private.longPressDelete')}
              className="gap-1 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-sora-medium text-foreground">
                  {format(parseISO(entry.date), 'd MMM yyyy')}
                </Text>
                {entry.flow ? (
                  <Text variant="caption" style={{ color: TINT }}>
                    {t(`private.flow_${entry.flow}`)}
                  </Text>
                ) : null}
              </View>
              {entry.symptoms.length > 0 ? (
                <Text variant="caption">
                  {entry.symptoms.map((s) => t(`private.symptom_${s}`)).join(' · ')}
                </Text>
              ) : null}
              {entry.note ? <Text variant="caption">{entry.note}</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </PrivateScreen>
  );
}
