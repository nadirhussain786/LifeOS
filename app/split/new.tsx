import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { useBudgetSettings } from '@/features/budget/hooks/use-budget';
import { useSplitMutations } from '@/features/split/hooks/use-split';
import type { GroupKind } from '@/features/split/types/split.types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/utils';

const KINDS: GroupKind[] = ['trip', 'home', 'family', 'work', 'other'];

export default function NewSplitGroupScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const tint = moduleTint('budget', scheme);
  // Groups settle in one currency; default to the one Budget already uses.
  const { data: budgetSettings } = useBudgetSettings();
  const currency = budgetSettings?.currency ?? '$';
  const { createGroup } = useSplitMutations();

  const [name, setName] = useState('');
  const [kind, setKind] = useState<GroupKind>('trip');

  const canSave = name.trim().length > 0 && !createGroup.isPending;

  const save = () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    createGroup.mutate(
      { name: name.trim(), kind, currency },
      { onSuccess: (groupId) => router.replace(`/split/${groupId}`) },
    );
  };

  return (
    <View className="flex-1 bg-background">
      <SheetHeader title={t('split.newGroup')} />

      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-3 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={name}
          onChangeText={setName}
          accessibilityLabel={t('split.groupName')}
          placeholder={t('split.groupNamePlaceholder')}
          placeholderTextColor={colors[scheme].mutedForeground}
          autoFocus
          style={{ fontSize: 24, fontFamily: 'Sora_700Bold', color: colors[scheme].foreground }}
        />

        <View className="gap-2.5">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            {t('split.groupKind')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {KINDS.map((option) => {
              const selected = option === kind;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setKind(option);
                  }}
                  style={selected ? { backgroundColor: tint, borderColor: tint } : undefined}
                  className={cn('rounded-full border px-3.5 py-2', !selected && 'border-border')}
                >
                  <Text
                    className={selected ? 'font-sora-medium text-white' : 'text-muted-foreground'}
                  >
                    {t(`split.kind.${option}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {createGroup.isError && (
          <Text variant="caption" className="text-destructive">
            {t('split.saveFailed')}
          </Text>
        )}

        <Button
          label={createGroup.isPending ? t('common.saving') : t('split.createGroup')}
          onPress={save}
          disabled={!canSave}
          size="lg"
          variant="accent"
        />
      </ScrollView>
    </View>
  );
}
