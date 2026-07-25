import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Pencil, RotateCcw, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { ProgressRing } from '@/components/ui/progress-ring';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { statusLabel, statusTint } from '@/features/budget/services/debt-status';
import { formatMoney, parseAmountToCents } from '@/features/budget/services/money';
import { useDebtMutations, useDebts } from '@/features/budget/hooks/use-debts';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { debts } = useDebts();
  const { addPayment, markSettled, markReopened, removeDebt } = useDebtMutations();

  const [payText, setPayText] = useState('');

  const debt = debts.find((d) => d.id === id);
  if (!debt) return null;

  const tint = debt.isSettled ? '#22c55e' : statusTint(debt.status);
  const borrowed = debt.direction === 'borrowed';
  const payCents = parseAmountToCents(payText);

  const recordPayment = () => {
    if (payCents <= 0) return;
    addPayment.mutate({ id: debt.id, amountCents: payCents });
    setPayText('');
  };

  const confirmDelete = () => {
    Alert.alert('Delete this IOU?', `The record for "${debt.counterparty}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => (removeDebt.mutate(debt.id), router.back()) },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        eyebrow="Borrow & Lend"
        tint={moduleTint('budget', scheme)}
        actions={[
          { icon: Pencil, label: 'Edit IOU', onPress: () => router.push(`/budget/debts/new?id=${debt.id}`) },
          { icon: Trash2, label: 'Delete IOU', onPress: confirmDelete, tint: colors[scheme].destructive },
        ]}
      />

      <ScrollView contentContainerClassName="gap-6 px-5 pt-2 pb-10" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="items-center gap-4">
          <ProgressRing progress={debt.progress} size={180} strokeWidth={14} color={tint} gradient>
            <View className="items-center">
              <Text className="font-sora-extrabold text-2xl text-foreground">
                {formatMoney(debt.isSettled ? debt.principalCents : debt.remainingCents, debt.currency)}
              </Text>
              <Text variant="caption">{debt.isSettled ? 'settled' : 'remaining'}</Text>
            </View>
          </ProgressRing>
          <View className="items-center gap-1">
            <Text className="font-sora-bold text-2xl text-foreground">{debt.counterparty}</Text>
            <Text variant="muted">
              {borrowed ? 'You owe' : 'Owes you'} {formatMoney(debt.principalCents, debt.currency)}
              {debt.dueDate ? ` · due ${format(debt.dueDate, 'MMM d, yyyy')}` : ''}
            </Text>
            <Text className="font-sora-semibold" style={{ color: tint }}>
              {statusLabel(debt)}
            </Text>
          </View>
        </View>

        {debt.note && (
          <View className="rounded-2xl border border-border bg-card p-4">
            <Text className="text-foreground">{debt.note}</Text>
          </View>
        )}

        {debt.isSettled ? (
          <View className="gap-3">
            <View className="flex-row items-center justify-center gap-2">
              <CheckCircle2 size={18} color="#22c55e" />
              <Text className="font-sora-medium text-foreground">
                Settled{debt.settledAt ? ` on ${format(debt.settledAt, 'MMM d, yyyy')}` : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => markReopened.mutate(debt.id)}
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-border py-3"
            >
              <RotateCcw size={15} color={colors[scheme].mutedForeground} />
              <Text className="font-sora-medium text-muted-foreground">Reopen this IOU</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-3">
            <View className="gap-2.5">
              <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
                Record a payment
              </Text>
              <View className="flex-row items-center gap-2">
                <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
                  <Text className="font-sora-bold text-lg" style={{ color: tint }}>
                    {debt.currency}
                  </Text>
                  <TextInput
                    value={payText}
                    onChangeText={setPayText}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors[scheme].mutedForeground}
                    className="flex-1 text-foreground"
                    style={{ fontSize: 18, fontFamily: 'Sora_600SemiBold' }}
                  />
                </View>
                <Button label="Add" onPress={recordPayment} disabled={payCents <= 0} size="md" variant="accent" />
              </View>
              <Text variant="caption">
                {borrowed ? 'Log what you paid back' : 'Log what they paid you'} — {formatMoney(debt.remainingCents, debt.currency)} left.
              </Text>
            </View>

            <GradientButton label="Mark fully settled" tint="#22c55e" icon={CheckCircle2} onPress={() => markSettled.mutate(debt.id)} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
