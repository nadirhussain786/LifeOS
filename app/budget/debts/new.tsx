import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BellRing, CalendarDays, X } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { REMINDER_DAY_OPTIONS } from '@/features/budget/services/debt-status';
import { formatMoney, parseAmountToCents } from '@/features/budget/services/money';
import { useBudgetSettings } from '@/features/budget/hooks/use-budget';
import { useDebtMutations, useDebts } from '@/features/budget/hooks/use-debts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { notificationsAvailable } from '@/lib/notifications';
import type { DebtDirection } from '@/features/budget/types/budget.types';

const DIRECTION_OPTIONS = [
  { value: 'borrowed' as const, label: 'I borrowed' },
  { value: 'lent' as const, label: 'I lent' },
];

const DEBT_TINT = '#6366f1';

function reminderLabel(days: number): string {
  if (days === 0) return 'On the day';
  if (days === 7) return '1 week';
  return `${days} day${days === 1 ? '' : 's'}`;
}

export default function DebtFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { data: settings } = useBudgetSettings();
  const { debts } = useDebts();
  const { addDebt, editDebt } = useDebtMutations();
  const currency = settings?.currency ?? '$';
  const isEdit = !!id;

  const [direction, setDirection] = useState<DebtDirection>('borrowed');
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState<number | null>(null);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number | null>(1);
  const [showDate, setShowDate] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const existing = isEdit ? debts.find((d) => d.id === id) : undefined;
  if (isEdit && existing && !seeded) {
    setDirection(existing.direction);
    setCounterparty(existing.counterparty);
    setAmount((existing.principalCents / 100).toString());
    setNote(existing.note ?? '');
    setDueDate(existing.dueDate);
    setReminderDaysBefore(existing.reminderDaysBefore);
    setSeeded(true);
  }

  const principalCents = parseAmountToCents(amount);
  const canSave = counterparty.trim().length > 0 && principalCents > 0;

  const handleDate = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (event.type === 'set' && date) setDueDate(date.getTime());
  };

  const save = () => {
    if (!canSave) return;
    const effectiveReminder = dueDate ? reminderDaysBefore : null;
    if (isEdit && existing) {
      editDebt.mutate({
        id: existing.id,
        input: {
          counterparty: counterparty.trim(),
          principalCents,
          note: note.trim() || null,
          dueDate,
          reminderDaysBefore: effectiveReminder,
        },
      });
    } else {
      addDebt.mutate({
        direction,
        counterparty: counterparty.trim(),
        principalCents,
        currency,
        note: note.trim() || null,
        dueDate,
        reminderDaysBefore: effectiveReminder,
      });
    }
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      <SheetHeader title={isEdit ? 'Edit IOU' : 'New IOU'} />

      <ScrollView contentContainerClassName="gap-5 px-5 pt-3 pb-10" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {isEdit ? (
          <View className="items-center">
            <Text variant="muted">{direction === 'borrowed' ? 'You borrowed from' : 'You lent to'}</Text>
          </View>
        ) : (
          <Segmented options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} activeColor={DEBT_TINT} />
        )}

        <TextInput
          value={counterparty}
          onChangeText={setCounterparty}
          placeholder="Person's name"
          placeholderTextColor={colors[scheme].mutedForeground}
          autoFocus={!isEdit}
          style={{ fontSize: 22, fontFamily: 'Sora_700Bold', color: colors[scheme].foreground }}
        />

        <View className="gap-2.5">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            Amount
          </Text>
          <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
            <Text className="font-sora-bold text-xl" style={{ color: DEBT_TINT }}>
              {currency}
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor={colors[scheme].mutedForeground}
              className="flex-1 text-foreground"
              style={{ fontSize: 20, fontFamily: 'Sora_600SemiBold' }}
            />
            {principalCents > 0 && <Text variant="caption">{formatMoney(principalCents, currency)}</Text>}
          </View>
        </View>

        <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <View className="flex-row items-center gap-2">
            <CalendarDays size={16} color={colors[scheme].mutedForeground} />
            <Text className="font-sora-medium text-foreground">Payback deadline</Text>
          </View>
          <View className="flex-row items-center gap-2">
            {Platform.OS === 'ios' ? (
              <DateTimePicker value={dueDate ? new Date(dueDate) : new Date()} mode="date" display="compact" onChange={handleDate} />
            ) : (
              <Pressable onPress={() => setShowDate(true)} className="rounded-lg bg-muted px-3 py-1.5">
                <Text className="font-sora-semibold text-foreground">{dueDate ? format(dueDate, 'MMM d, yyyy') : 'None'}</Text>
              </Pressable>
            )}
            {dueDate != null && (
              <Pressable onPress={() => setDueDate(null)} hitSlop={8} className="h-6 w-6 items-center justify-center rounded-full bg-muted">
                <X size={13} color={colors[scheme].mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>
        {Platform.OS === 'android' && showDate && (
          <DateTimePicker value={dueDate ? new Date(dueDate) : new Date()} mode="date" display="default" onChange={handleDate} />
        )}

        {dueDate != null && (
          <View className="gap-2.5">
            <View className="flex-row items-center gap-2">
              <BellRing size={14} color={colors[scheme].mutedForeground} />
              <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
                Remind me before
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {[null, ...REMINDER_DAY_OPTIONS].map((days) => {
                const selected = reminderDaysBefore === days;
                return (
                  <Pressable
                    key={days ?? 'off'}
                    onPress={() => setReminderDaysBefore(days)}
                    style={selected ? { backgroundColor: DEBT_TINT, borderColor: DEBT_TINT } : undefined}
                    className="rounded-full border border-border px-3.5 py-2"
                  >
                    <Text className={selected ? 'font-sora-medium text-white' : 'text-muted-foreground'}>
                      {days == null ? 'Off' : reminderLabel(days)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!notificationsAvailable && reminderDaysBefore != null && (
              <Text variant="caption">Reminders aren&apos;t available on this device.</Text>
            )}
          </View>
        )}

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What's it for? (optional)"
          placeholderTextColor={colors[scheme].mutedForeground}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-foreground"
        />

        <Button label={isEdit ? 'Save changes' : 'Add IOU'} onPress={save} disabled={!canSave} size="lg" variant="accent" />
      </ScrollView>
    </View>
  );
}
