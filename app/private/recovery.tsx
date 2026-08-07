import { format, parseISO } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

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
  addRecoveryEntry,
  listRecoveryEntries,
  removeRecoveryEntry,
} from '@/features/private/services/recovery';
import {
  TRIGGERS,
  statsFor,
  type RecoveryTarget,
  type Trigger,
} from '@/features/private/services/recovery-math';
import { confirm } from '@/lib/dialog-store';

const TARGETS: RecoveryTarget[] = [
  'porn',
  'masturbation',
  'alcohol',
  'smoking',
  'vaping',
  'gambling',
  'other',
];
const TINT = privateModule('recovery')?.tint ?? '#2f9e73';

export default function RecoveryScreen() {
  const vault = useVaultTheme();
  const { t } = useTranslation();

  // See cycle.tsx: explicit reload rather than a counter dependency.
  const [entries, setEntries] = useState(listRecoveryEntries);
  const reload = useCallback(() => setEntries(listRecoveryEntries()), []);
  const [target, setTarget] = useState<RecoveryTarget>('porn');
  const [intensity, setIntensity] = useState(3);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [note, setNote] = useState('');

  const stats = useMemo(() => statsFor(entries, target), [entries, target]);

  const log = useCallback(
    (outcome: 'resisted' | 'relapsed') => {
      addRecoveryEntry({
        target,
        date: format(new Date(), 'yyyy-MM-dd'),
        outcome,
        intensity,
        triggers,
        note: note.trim(),
      });
      setTriggers([]);
      setNote('');
      setIntensity(3);
      reload();
    },
    [target, intensity, triggers, note, reload],
  );

  const confirmDelete = (id: string) =>
    void confirm({
      title: t('private.deleteEntry'),
      message: t('private.deleteEntryBody'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    }).then(async (ok) => {
      if (!ok) return;
      removeRecoveryEntry(id);
      reload();
    });

  const forTarget = entries.filter((e) => e.target === target);

  return (
    <PrivateScreen
      title={t('private.recoveryTitle')}
      subtitle={t('private.recoverySubtitle')}
      tint={TINT}
      stamp={t('private.stampRecovery')}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <VaultButton
              label={t('private.resisted')}
              tint={TINT}
              onPress={() => log('resisted')}
            />
          </View>
          <View style={{ flex: 1 }}>
            {/* Not styled as a failure — same weight, same shape, a neutral
                grey rather than an alarm. A relapse being easy and unjudged to
                record is the difference between honest data and a deleted app. */}
            <VaultButton
              label={t('private.relapsed')}
              tint={vault.mute}
              onPress={() => log('relapsed')}
            />
          </View>
        </View>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5">
        <View className="flex-row gap-2 px-5">
          {TARGETS.map((option) => {
            const active = target === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setTarget(option)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  minHeight: 38,
                  justifyContent: 'center',
                  backgroundColor: active ? tinted(TINT, 0.22) : vault.well,
                  borderTopWidth: 1,
                  borderTopColor: active ? tinted(TINT, 0.4) : vault.wellEdge,
                }}
              >
                <Text
                  className="font-sora-medium text-sm"
                  style={{ color: active ? TINT : vault.mute }}
                >
                  {t(`private.target_${option}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* The streak is the number this module exists for, so it is the only
          one set large. The rest are context, not headlines. */}
      <StatStrip
        tint={TINT}
        items={[
          {
            label: t('private.currentStreak'),
            value:
              stats.currentStreak === null
                ? t('private.noRelapses')
                : t('private.days', { count: stats.currentStreak }),
          },
          {
            label: t('private.longestStreak'),
            value: t('private.days', { count: stats.longestStreak }),
          },
        ]}
      />

      <Well style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text className="text-[11px]" style={{ color: vault.faint }}>
            {t('private.urgesResisted')}
          </Text>
          <Text className="font-sora-semibold text-lg" style={{ color: vault.ink }}>
            {stats.resisted}
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: vault.line, marginHorizontal: 14 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text className="text-[11px]" style={{ color: vault.faint }}>
            {t('private.relapsesLogged')}
          </Text>
          <Text className="font-sora-semibold text-lg" style={{ color: vault.ink }}>
            {stats.relapsed}
          </Text>
        </View>
      </Well>

      {stats.topRelapseTriggers.length > 0 ? (
        <Well style={{ gap: 7 }}>
          <VaultLabel>{t('private.watchFor')}</VaultLabel>
          <Text className="text-sm" style={{ color: vault.ink, lineHeight: 20 }}>
            {stats.topRelapseTriggers.map((x) => t(`private.trigger_${x.trigger}`)).join(' · ')}
          </Text>
          <Text className="text-xs" style={{ color: vault.faint, lineHeight: 17 }}>
            {t('private.watchForHint')}
          </Text>
        </Well>
      ) : null}

      <View className="gap-3">
        <VaultLabel>{t('private.howStrong')}</VaultLabel>
        <View className="flex-row gap-2">
          {[1, 2, 3, 4, 5].map((level) => {
            const active = intensity === level;
            return (
              <Pressable
                key={level}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setIntensity(level)}
                className="flex-1 items-center rounded-2xl border py-3"
                style={{
                  backgroundColor: active ? tinted(TINT, 0.22) : vault.well,
                  borderTopWidth: 1,
                  borderTopColor: active ? tinted(TINT, 0.4) : vault.wellEdge,
                }}
              >
                <Text className="font-sora-medium" style={{ color: active ? TINT : vault.mute }}>
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-3">
        <VaultLabel>{t('private.triggers')}</VaultLabel>
        <ChipRow
          options={TRIGGERS}
          selected={triggers}
          tint={TINT}
          labelFor={(x) => t(`private.trigger_${x}`)}
          onToggle={(x) =>
            setTriggers((prev) => (prev.includes(x) ? prev.filter((y) => y !== x) : [...prev, x]))
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
        containerStyle={{ minHeight: 84 }}
      />

      {forTarget.length > 0 ? (
        <View className="gap-3">
          <VaultLabel>{t('private.history')}</VaultLabel>
          {forTarget.slice(0, 20).map((entry) => (
            <Well key={entry.id}>
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
                  {/* A relapse is muted, never red. The colour of this word is
                      the whole difference between a log and a verdict. */}
                  <Text
                    className="text-xs"
                    style={{ color: entry.outcome === 'resisted' ? TINT : vault.faint }}
                  >
                    {t(`private.${entry.outcome}`)}
                  </Text>
                </View>
                {entry.triggers.length > 0 ? (
                  <Text className="text-xs" style={{ color: vault.mute, lineHeight: 17 }}>
                    {entry.triggers.map((x) => t(`private.trigger_${x}`)).join(' · ')}
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
