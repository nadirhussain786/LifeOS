import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { CategoryGrid } from '@/features/budget/components/category-grid';
import { ACCOUNTS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/features/budget/config/budget-config';
import { formatMoney, parseAmountToCents } from '@/features/budget/services/money';
import { useBudgetMutations } from '@/features/budget/hooks/use-budget-mutations';
import { useBudgetSettings, useSavingsGoals, useTransaction } from '@/features/budget/hooks/use-budget';
import type { BudgetAccount, TransactionType } from '@/features/budget/types/budget.types';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TYPE_OPTIONS = [
  { value: 'expense' as const, label: 'Expense' },
  { value: 'income' as const, label: 'Income' },
  { value: 'savings' as const, label: 'Savings' },
];
const ACCOUNT_OPTIONS = ACCOUNTS.map((a) => ({ value: a.id, label: a.label }));
const TYPE_TINT: Record<TransactionType, string> = { income: '#22c55e', expense: '#ef4444', savings: '#6366f1' };

export default function TransactionScreen() {
  const { id, savingsGoalId: presetGoalId } = useLocalSearchParams<{ id?: string; savingsGoalId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { addTransaction, editTransaction, removeTransaction } = useBudgetMutations();
  const { data: settings } = useBudgetSettings();
  const { data: savingsGoals = [] } = useSavingsGoals();
  const { data: existing } = useTransaction(id);
  const currency = settings?.currency ?? '$';
  const isEdit = !!id;

  const [type, setType] = useState<TransactionType>(presetGoalId ? 'savings' : 'expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(presetGoalId ? 'savings' : 'food');
  const [account, setAccount] = useState<BudgetAccount>('cash');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => Date.now());
  const [savingsGoalId, setSavingsGoalId] = useState<string | null>(presetGoalId ?? null);
  const [showDate, setShowDate] = useState(false);
  const [seeded, setSeeded] = useState(false);

  if (isEdit && existing && !seeded) {
    setType(existing.type);
    setAmount((existing.amountCents / 100).toString());
    setCategory(existing.category);
    setAccount(existing.account);
    setNote(existing.note ?? '');
    setOccurredAt(existing.occurredAt);
    setSavingsGoalId(existing.savingsGoalId);
    setSeeded(true);
  }

  const changeType = (next: TransactionType) => {
    setType(next);
    // Reset category to a valid default for the new type.
    if (next === 'expense') setCategory('food');
    else if (next === 'income') setCategory('salary');
    else setCategory('savings');
  };

  const amountCents = parseAmountToCents(amount);
  const canSave = amountCents > 0;

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (event.type === 'set' && date) setOccurredAt(date.getTime());
  };

  const save = () => {
    if (!canSave) return;
    const payload = {
      type,
      amountCents,
      category: type === 'savings' ? 'savings' : category,
      account,
      note: note.trim() || null,
      occurredAt,
      savingsGoalId: type === 'savings' ? savingsGoalId : null,
    };
    if (isEdit && existing) {
      editTransaction.mutate({
        id: existing.id,
        input: {
          amountCents,
          category: payload.category,
          account,
          note: payload.note,
          occurredAt,
          savingsGoalId: payload.savingsGoalId,
        },
      });
    } else {
      addTransaction.mutate(payload);
    }
    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Delete transaction?', 'This entry will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => (removeTransaction.mutate(existing.id), router.back()) },
    ]);
  };

  const tint = TYPE_TINT[type];

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <X size={17} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
          {isEdit ? 'Edit Transaction' : 'New Transaction'}
        </Text>
        {isEdit ? (
          <Pressable onPress={confirmDelete} hitSlop={10} className="h-8 w-8 items-center justify-center" accessibilityLabel="Delete">
            <Trash2 size={18} color={colors[scheme].destructive} />
          </Pressable>
        ) : (
          <View className="h-8 w-8" />
        )}
      </View>

      <ScrollView contentContainerClassName="gap-5 px-5 pt-3 pb-10" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Segmented options={TYPE_OPTIONS} value={type} onChange={changeType} activeColor={tint} />

        <View className="items-center gap-1 py-2">
          <View className="flex-row items-end">
            <Text className="font-sora-bold text-3xl" style={{ color: tint, marginBottom: 6 }}>
              {currency}
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors[scheme].mutedForeground}
              keyboardType="decimal-pad"
              autoFocus={!isEdit}
              style={{ fontSize: 48, fontFamily: 'Sora_800ExtraBold', color: colors[scheme].foreground, minWidth: 80, textAlign: 'center' }}
            />
          </View>
          {amountCents > 0 && <Text variant="caption">{formatMoney(amountCents, currency)}</Text>}
        </View>

        {type === 'savings' ? (
          <View className="gap-2.5">
            <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
              Toward a goal (optional)
            </Text>
            {savingsGoals.length === 0 ? (
              <Text variant="muted">Create a savings goal to earmark this. It still counts as savings without one.</Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {savingsGoals.map((goal) => {
                  const selected = goal.id === savingsGoalId;
                  return (
                    <Pressable
                      key={goal.id}
                      onPress={() => setSavingsGoalId(selected ? null : goal.id)}
                      style={selected ? { backgroundColor: goal.colorToken, borderColor: goal.colorToken } : undefined}
                      className="rounded-full border border-border px-3 py-2"
                    >
                      <Text className={selected ? 'font-sora-medium text-white' : 'text-muted-foreground'}>{goal.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <View className="gap-2.5">
            <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
              Category
            </Text>
            <CategoryGrid items={type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES} value={category} onChange={setCategory} />
          </View>
        )}

        <View className="gap-2.5">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            Account
          </Text>
          <Segmented options={ACCOUNT_OPTIONS} value={account} onChange={setAccount} activeColor={tint} />
        </View>

        <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <View className="flex-row items-center gap-2">
            <CalendarDays size={16} color={colors[scheme].mutedForeground} />
            <Text className="font-sora-medium text-foreground">Date</Text>
          </View>
          {Platform.OS === 'ios' ? (
            <DateTimePicker value={new Date(occurredAt)} mode="date" display="compact" onChange={handleDateChange} />
          ) : (
            <Pressable onPress={() => setShowDate(true)} className="rounded-lg bg-muted px-3 py-1.5">
              <Text className="font-sora-semibold text-foreground">{format(occurredAt, 'MMM d, yyyy')}</Text>
            </Pressable>
          )}
        </View>
        {Platform.OS === 'android' && showDate && (
          <DateTimePicker value={new Date(occurredAt)} mode="date" display="default" onChange={handleDateChange} />
        )}

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note (optional)"
          placeholderTextColor={colors[scheme].mutedForeground}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-foreground"
        />

        <Button label={isEdit ? 'Save changes' : 'Add transaction'} onPress={save} disabled={!canSave} size="lg" variant="accent" />
      </ScrollView>
    </View>
  );
}
