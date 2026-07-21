import { format } from 'date-fns';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { categoryMetaFor } from '@/features/budget/config/budget-config';
import { formatMoney } from '@/features/budget/services/money';
import type { BudgetTransaction } from '@/features/budget/types/budget.types';

const AMOUNT_COLOR: Record<BudgetTransaction['type'], string> = {
  income: '#22c55e',
  expense: '#ef4444',
  savings: '#6366f1',
};

const SIGN: Record<BudgetTransaction['type'], string> = { income: '+', expense: '−', savings: '→' };

type Props = {
  transaction: BudgetTransaction;
  currency: string;
  onPress: (transaction: BudgetTransaction) => void;
};

export function TransactionRow({ transaction, currency, onPress }: Props) {
  const meta = categoryMetaFor(transaction.type, transaction.category);
  const Icon = meta.icon;

  return (
    <Pressable
      onPress={() => onPress(transaction)}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-e1"
      accessibilityRole="button"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${meta.tint}1f` }}>
        <Icon size={18} color={meta.tint} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sora-medium text-foreground" numberOfLines={1}>
          {transaction.note?.trim() || meta.label}
        </Text>
        <Text variant="caption" className="capitalize">
          {meta.label} · {transaction.account} · {format(transaction.occurredAt, 'MMM d')}
        </Text>
      </View>
      <Text className="font-sora-bold" style={{ color: AMOUNT_COLOR[transaction.type] }}>
        {SIGN[transaction.type]}
        {formatMoney(transaction.amountCents, currency)}
      </Text>
    </Pressable>
  );
}
