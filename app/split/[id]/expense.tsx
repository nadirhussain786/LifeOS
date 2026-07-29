import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { formatMoney, parseAmountToCents } from '@/features/budget/services/money';
import { useGroupDetail, useSplitMutations } from '@/features/split/hooks/use-split';
import { splitEvenly } from '@/features/split/services/split-math';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

/**
 * Add or edit an expense.
 *
 * The split is always materialised into whole cents before it is sent — the
 * server rejects a split that does not sum to the amount, so the preview here
 * shows exactly what will be written, including which member absorbs the odd
 * cent when the amount does not divide.
 */
export default function SplitExpenseScreen() {
  const { id, expense: expenseId } = useLocalSearchParams<{ id: string; expense?: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const tint = moduleTint('budget', scheme);

  const { data } = useGroupDetail(id);
  const { addExpense, editExpense, removeExpense } = useSplitMutations(id);

  const existing = data?.expenses.find((e) => e.id === expenseId) ?? null;
  const members = data?.members ?? [];
  const currency = data?.group?.currency ?? '$';

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [seeded, setSeeded] = useState(false);

  // Seed once the group (and the expense being edited) have loaded.
  if (!seeded && data) {
    if (existing) {
      setDescription(existing.description);
      setAmount((existing.amountCents / 100).toString());
      setPaidBy(existing.paidByMemberId);
      setParticipants(
        data.shares.filter((s) => s.expenseId === existing.id).map((s) => s.memberId),
      );
    } else {
      setPaidBy(members[0]?.id ?? null);
      setParticipants(members.map((m) => m.id));
    }
    setSeeded(true);
  }

  const amountCents = parseAmountToCents(amount);
  const shares = splitEvenly(amountCents, participants);
  const canSave =
    description.trim().length > 0 &&
    amountCents > 0 &&
    !!paidBy &&
    participants.length > 0 &&
    !addExpense.isPending &&
    !editExpense.isPending;

  const toggle = (memberId: string) => {
    Haptics.selectionAsync();
    setParticipants((prev) =>
      prev.includes(memberId) ? prev.filter((m) => m !== memberId) : [...prev, memberId],
    );
  };

  const save = () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const payload = {
      paidByMemberId: paidBy!,
      description: description.trim(),
      amountCents,
      spentAt: existing?.spentAt ?? Date.now(),
      note: null,
      shares,
    };
    const onSuccess = () => router.back();
    if (existing) editExpense.mutate({ expenseId: existing.id, ...payload }, { onSuccess });
    else addExpense.mutate({ currency, ...payload }, { onSuccess });
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert(t('split.deleteExpenseTitle'), t('split.deleteExpenseBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => removeExpense.mutate(existing.id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  const memberName = (memberId: string) => {
    const m = members.find((x) => x.id === memberId);
    return m?.displayName || m?.email || t('split.someone');
  };

  return (
    <View className="flex-1 bg-background">
      <SheetHeader
        title={existing ? t('split.editExpense') : t('split.addExpense')}
        right={
          existing ? (
            <Pressable
              onPress={confirmDelete}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center"
              accessibilityLabel={t('common.delete')}
            >
              <Trash2 size={18} color={colors[scheme].destructive} />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-3 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={description}
          onChangeText={setDescription}
          accessibilityLabel={t('split.description')}
          placeholder={t('split.descriptionPlaceholder')}
          placeholderTextColor={colors[scheme].mutedForeground}
          autoFocus={!existing}
          style={{ fontSize: 22, fontFamily: 'Sora_700Bold', color: colors[scheme].foreground }}
        />

        <View className="gap-2">
          <Text variant="micro">{t('split.amount')}</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            accessibilityLabel={t('split.amount')}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor={colors[scheme].mutedForeground}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-2xl text-foreground"
          />
        </View>

        <View className="gap-2">
          <Text variant="micro">{t('split.paidByLabel')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {members.map((m) => {
              const selected = m.id === paidBy;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPaidBy(m.id);
                  }}
                  style={selected ? { backgroundColor: tint, borderColor: tint } : undefined}
                  className={`rounded-full border px-3 py-1.5 ${selected ? '' : 'border-border'}`}
                >
                  <Text
                    className={selected ? 'font-sora-medium text-white' : 'text-muted-foreground'}
                  >
                    {memberName(m.id)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Split preview: exactly the cents that will be written, so the odd
            cent is visible rather than a surprise. */}
        <View className="gap-2">
          <Text variant="micro">{t('split.splitBetween')}</Text>
          <View className="rounded-2xl border border-border bg-card px-4">
            {members.map((m, index) => {
              const included = participants.includes(m.id);
              const share = shares.find((s) => s.memberId === m.id);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => toggle(m.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: included }}
                  className={
                    index === 0
                      ? 'flex-row items-center gap-3 py-3'
                      : 'flex-row items-center gap-3 border-t border-border py-3'
                  }
                >
                  <View
                    className="h-5 w-5 items-center justify-center rounded-md border"
                    style={{
                      borderColor: included ? tint : colors[scheme].border,
                      backgroundColor: included ? tint : 'transparent',
                    }}
                  >
                    {included && <Check size={13} color="#ffffff" strokeWidth={3} />}
                  </View>
                  <Text className="flex-1 text-foreground" numberOfLines={1}>
                    {memberName(m.id)}
                  </Text>
                  <Text variant="caption">
                    {included && share ? formatMoney(share.shareCents, currency) : '—'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {participants.length > 0 && amountCents > 0 && (
            <Text variant="caption" style={{ color: alpha(tint, 1) }}>
              {t('split.splitSummary', {
                total: formatMoney(amountCents, currency),
                count: participants.length,
              })}
            </Text>
          )}
        </View>

        {(addExpense.isError || editExpense.isError) && (
          <Text variant="caption" className="text-destructive">
            {t('split.saveFailed')}
          </Text>
        )}

        <Button
          label={
            addExpense.isPending || editExpense.isPending ? t('common.saving') : t('common.save')
          }
          onPress={save}
          disabled={!canSave}
          size="lg"
          variant="accent"
        />
      </ScrollView>
    </View>
  );
}
