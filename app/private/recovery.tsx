import { format, parseISO } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { ChipRow, PrivateScreen } from '@/features/private/components/private-screen';
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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

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
  const scheme = useColorScheme() ?? 'light';
  const theme = colors[scheme];
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
    Alert.alert(t('private.deleteEntry'), t('private.deleteEntryBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          removeRecoveryEntry(id);
          reload();
        },
      },
    ]);

  const forTarget = entries.filter((e) => e.target === target);

  return (
    <PrivateScreen
      title={t('private.recoveryTitle')}
      subtitle={t('private.recoverySubtitle')}
      tint={TINT}
      footer={
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              variant="accent"
              size="lg"
              label={t('private.resisted')}
              onPress={() => log('resisted')}
            />
          </View>
          <View className="flex-1">
            {/* Not styled as a failure. A relapse being easy and unjudged to
                record is the difference between honest data and a deleted app. */}
            <Button
              variant="secondary"
              size="lg"
              label={t('private.relapsed')}
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
                className="rounded-full border px-4 py-2"
                style={{
                  borderColor: active ? TINT : theme.border,
                  backgroundColor: active ? alpha(TINT, 0.12) : 'transparent',
                }}
              >
                <Text
                  className="font-sora-medium text-sm"
                  style={{ color: active ? TINT : theme.foreground }}
                >
                  {t(`private.target_${option}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="flex-row gap-3">
        <View
          className="flex-1 gap-1 rounded-2xl px-4 py-3.5"
          style={{ backgroundColor: alpha(TINT, 0.12) }}
        >
          <Text variant="caption">{t('private.currentStreak')}</Text>
          <Text className="font-sora-extrabold text-2xl" style={{ color: TINT }}>
            {stats.currentStreak === null
              ? t('private.noRelapses')
              : t('private.days', { count: stats.currentStreak })}
          </Text>
        </View>
        <View className="flex-1 gap-1 rounded-2xl border border-border px-4 py-3.5">
          <Text variant="caption">{t('private.longestStreak')}</Text>
          <Text className="font-sora-extrabold text-2xl text-foreground">
            {t('private.days', { count: stats.longestStreak })}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 gap-1 rounded-2xl border border-border px-4 py-3">
          <Text variant="caption">{t('private.urgesResisted')}</Text>
          <Text className="font-sora-semibold text-lg text-foreground">{stats.resisted}</Text>
        </View>
        <View className="flex-1 gap-1 rounded-2xl border border-border px-4 py-3">
          <Text variant="caption">{t('private.relapsesLogged')}</Text>
          <Text className="font-sora-semibold text-lg text-foreground">{stats.relapsed}</Text>
        </View>
      </View>

      {stats.topRelapseTriggers.length > 0 ? (
        <View className="gap-2 rounded-2xl border border-border bg-card px-4 py-3.5">
          <Text variant="micro">{t('private.watchFor')}</Text>
          <Text className="text-foreground">
            {stats.topRelapseTriggers.map((x) => t(`private.trigger_${x.trigger}`)).join(' · ')}
          </Text>
          <Text variant="caption">{t('private.watchForHint')}</Text>
        </View>
      ) : null}

      <View className="gap-3">
        <Text variant="micro">{t('private.howStrong')}</Text>
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
                  borderColor: active ? TINT : theme.border,
                  backgroundColor: active ? alpha(TINT, 0.12) : 'transparent',
                }}
              >
                <Text
                  className="font-sora-medium"
                  style={{ color: active ? TINT : theme.foreground }}
                >
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-3">
        <Text variant="micro">{t('private.triggers')}</Text>
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

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={t('private.notePlaceholder')}
        placeholderTextColor={theme.mutedForeground}
        multiline
        className="min-h-[80px] rounded-2xl border border-border bg-card px-4 py-3 text-foreground"
        style={{ fontFamily: 'Sora_400Regular', textAlignVertical: 'top' }}
      />

      {forTarget.length > 0 ? (
        <View className="gap-3">
          <Text variant="micro">{t('private.history')}</Text>
          {forTarget.slice(0, 20).map((entry) => (
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
                <Text
                  variant="caption"
                  style={{ color: entry.outcome === 'resisted' ? TINT : theme.mutedForeground }}
                >
                  {t(`private.${entry.outcome}`)}
                </Text>
              </View>
              {entry.triggers.length > 0 ? (
                <Text variant="caption">
                  {entry.triggers.map((x) => t(`private.trigger_${x}`)).join(' · ')}
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
