import { format, parseISO } from 'date-fns';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { ChipRow, PrivateScreen } from '@/features/private/components/private-screen';
import { tinted, useVaultTheme } from '@/features/private/components/vault-theme';
import { VaultButton, VaultField, VaultLabel, Well } from '@/features/private/components/well';
import { privateModule } from '@/features/private/config/private-modules';
import {
  INTIMACY_TAGS,
  addIntimacyEntry,
  listIntimacyEntries,
  removeIntimacyEntry,
  type IntimacyTag,
} from '@/features/private/services/intimacy';
import { confirm } from '@/lib/dialog-store';

const TINT = privateModule('intimacy')?.tint ?? '#d4653f';

export default function IntimacyScreen() {
  const vault = useVaultTheme();
  const { t } = useTranslation();

  // See cycle.tsx: explicit reload rather than a counter dependency.
  const [entries, setEntries] = useState(listIntimacyEntries);
  const reload = useCallback(() => setEntries(listIntimacyEntries()), []);
  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<IntimacyTag[]>([]);
  const [note, setNote] = useState('');

  const save = useCallback(() => {
    if (mood === null && tags.length === 0 && !note.trim()) return;
    addIntimacyEntry({
      date: format(new Date(), 'yyyy-MM-dd'),
      mood,
      tags,
      note: note.trim(),
    });
    setMood(null);
    setTags([]);
    setNote('');
    reload();
  }, [mood, tags, note, reload]);

  const confirmDelete = (id: string) =>
    void confirm({
      title: t('private.deleteEntry'),
      message: t('private.deleteEntryBody'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    }).then(async (ok) => {
      if (!ok) return;
      removeIntimacyEntry(id);
      reload();
    });

  return (
    <PrivateScreen
      title={t('private.intimacyTitle')}
      subtitle={t('private.intimacySubtitle')}
      tint={TINT}
      stamp={t('private.stampIntimacy')}
      footer={
        <VaultButton
          label={t('private.saveEntry')}
          tint={TINT}
          disabled={mood === null && tags.length === 0 && !note.trim()}
          onPress={save}
        />
      }
    >
      <View className="gap-3">
        <VaultLabel>{t('private.howWasToday')}</VaultLabel>
        <View className="flex-row gap-2">
          {[1, 2, 3, 4, 5].map((level) => {
            const active = mood === level;
            return (
              <Pressable
                key={level}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setMood(active ? null : level)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 50,
                  borderRadius: 14,
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
        <VaultLabel>{t('private.whatHappened')}</VaultLabel>
        <ChipRow
          options={INTIMACY_TAGS}
          selected={tags}
          tint={TINT}
          labelFor={(x) => t(`private.intimacyTag_${x}`)}
          onToggle={(x) =>
            setTags((prev) => (prev.includes(x) ? prev.filter((y) => y !== x) : [...prev, x]))
          }
        />
      </View>

      <VaultField
        value={note}
        onChangeText={setNote}
        placeholder={t('private.intimacyNotePlaceholder')}
        accessibilityLabel={t('private.intimacyNotePlaceholder')}
        multiline
        tint={TINT}
        containerStyle={{ minHeight: 124 }}
      />

      {entries.length > 0 ? (
        <View className="gap-3">
          <VaultLabel>{t('private.history')}</VaultLabel>
          {entries.slice(0, 30).map((entry) => (
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
                  {entry.mood !== null ? (
                    <Text className="text-xs" style={{ color: TINT }}>
                      {entry.mood}/5
                    </Text>
                  ) : null}
                </View>
                {entry.tags.length > 0 ? (
                  <Text className="text-xs" style={{ color: vault.mute, lineHeight: 17 }}>
                    {entry.tags.map((x) => t(`private.intimacyTag_${x}`)).join(' · ')}
                  </Text>
                ) : null}
                {entry.note ? (
                  <Text className="text-sm" style={{ color: vault.ink, lineHeight: 20 }}>
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
