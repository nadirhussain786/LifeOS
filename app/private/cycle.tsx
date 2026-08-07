import { format, parseISO } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { ChipRow, PrivateScreen } from '@/features/private/components/private-screen';
import { tinted, useVaultTheme } from '@/features/private/components/vault-theme';
import {
  StatStrip,
  VaultButton,
  VaultField,
  VaultLabel,
  Well,
} from '@/features/private/components/well';
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
import { confirm } from '@/lib/dialog-store';

const FLOWS: Flow[] = ['spotting', 'light', 'medium', 'heavy'];
const TINT = privateModule('cycle')?.tint ?? '#e0518a';

export default function CycleScreen() {
  const vault = useVaultTheme();
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
    void confirm({
      title: t('private.deleteEntry'),
      message: t('private.deleteEntryBody'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    }).then(async (ok) => {
      if (!ok) return;
      removeCycleEntry(id);
      reload();
    });

  return (
    <PrivateScreen
      title={t('private.cycleTitle')}
      subtitle={t('private.cycleSubtitle')}
      tint={TINT}
      stamp={t('private.stampCycle')}
      footer={
        <VaultButton
          label={t('private.logToday')}
          tint={TINT}
          disabled={!flow && symptoms.length === 0 && !note.trim()}
          onPress={save}
        />
      }
    >
      {/* The two figures this module exists to answer, set on the ground. */}
      <StatStrip
        tint={TINT}
        items={[
          { label: t('private.dayOfCycle'), value: currentDay ? String(currentDay) : '—' },
          {
            label: t('private.averageCycle'),
            value: average ? t('private.days', { count: average }) : '—',
          },
        ]}
      />

      {nextStart ? (
        <Text className="text-xs" style={{ color: vault.faint, lineHeight: 17 }}>
          {/* Explicitly an estimate from her own history — see cycle-math.ts
              for why this module makes no medical claims. */}
          {t('private.estimatedNext', { date: format(parseISO(nextStart), 'd MMM') })}
        </Text>
      ) : (
        <Text className="text-xs" style={{ color: vault.faint, lineHeight: 17 }}>
          {t('private.needMoreCycles')}
        </Text>
      )}

      {/* Today's log */}
      <View className="gap-3">
        <VaultLabel>{t('private.flow')}</VaultLabel>
        <View className="flex-row gap-2">
          {FLOWS.map((option) => {
            const active = flow === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setFlow(active ? null : option)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 46,
                  borderRadius: 14,
                  backgroundColor: active ? tinted(TINT, 0.22) : vault.well,
                  borderTopWidth: 1,
                  borderTopColor: active ? tinted(TINT, 0.4) : vault.wellEdge,
                }}
              >
                <Text
                  className="font-sora-medium text-sm"
                  style={{ color: active ? TINT : vault.mute }}
                >
                  {t(`private.flow_${option}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-3">
        <VaultLabel>{t('private.symptoms')}</VaultLabel>
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

      <VaultField
        value={note}
        onChangeText={setNote}
        placeholder={t('private.notePlaceholder')}
        accessibilityLabel={t('private.notePlaceholder')}
        multiline
        tint={TINT}
        containerStyle={{ minHeight: 92 }}
      />

      {/* History */}
      {periods.length > 0 ? (
        <View className="gap-3">
          <VaultLabel>{t('private.recentPeriods')}</VaultLabel>
          {periods.slice(0, 6).map((period) => (
            <Well
              key={period.start}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text className="font-sora-medium text-sm" style={{ color: vault.ink }}>
                {format(parseISO(period.start), 'd MMM yyyy')}
              </Text>
              <Text className="text-xs" style={{ color: vault.faint }}>
                {t('private.days', { count: period.days })}
              </Text>
            </Well>
          ))}
        </View>
      ) : null}

      {entries.length > 0 ? (
        <View className="gap-3">
          <VaultLabel>{t('private.allEntries')}</VaultLabel>
          {entries.slice(0, 20).map((entry) => (
            <Well key={entry.id} style={{ gap: 4 }}>
              <Pressable
                onLongPress={() => confirmDelete(entry.id)}
                accessibilityRole="button"
                accessibilityLabel={format(parseISO(entry.date), 'd MMM yyyy')}
                accessibilityHint={t('private.longPressDelete')}
                style={{ gap: 4 }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text className="font-sora-medium text-sm" style={{ color: vault.ink }}>
                    {format(parseISO(entry.date), 'd MMM yyyy')}
                  </Text>
                  {entry.flow ? (
                    <Text className="text-xs" style={{ color: TINT }}>
                      {t(`private.flow_${entry.flow}`)}
                    </Text>
                  ) : null}
                </View>
                {entry.symptoms.length > 0 ? (
                  <Text className="text-xs" style={{ color: vault.mute, lineHeight: 17 }}>
                    {entry.symptoms.map((s) => t(`private.symptom_${s}`)).join(' · ')}
                  </Text>
                ) : null}
                {entry.note ? (
                  <Text className="text-xs" style={{ color: vault.mute, lineHeight: 17 }}>
                    {entry.note}
                  </Text>
                ) : null}
              </Pressable>
            </Well>
          ))}
        </View>
      ) : null}
    </PrivateScreen>
  );
}
