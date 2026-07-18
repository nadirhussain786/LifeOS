import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { ChevronLeft, Receipt, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { categoryMetaFor } from '@/features/budget/config/budget-config';
import { TransactionRow } from '@/features/budget/components/transaction-row';
import { formatMoney } from '@/features/budget/services/money';
import { useBudgetSettings, useTransactions } from '@/features/budget/hooks/use-budget';
import type { BudgetTransaction, TransactionType } from '@/features/budget/types/budget.types';
import { useColorScheme } from '@/hooks/use-color-scheme';

const FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'expense' as const, label: 'Expense' },
  { value: 'income' as const, label: 'Income' },
  { value: 'savings' as const, label: 'Savings' },
];

function dayLabel(logDate: string): string {
  const date = parseISO(logDate);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, MMM d');
}

export default function TransactionsScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | TransactionType>('all');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { data: transactions = [] } = useTransactions();
  const { data: settings } = useBudgetSettings();
  const currency = settings?.currency ?? '$';

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = transactions.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false;
      if (q) {
        const label = categoryMetaFor(t.type, t.category).label.toLowerCase();
        if (!(t.note ?? '').toLowerCase().includes(q) && !label.includes(q)) return false;
      }
      return true;
    });

    const byDay = new Map<string, BudgetTransaction[]>();
    for (const t of filtered) {
      if (!byDay.has(t.logDate)) byDay.set(t.logDate, []);
      byDay.get(t.logDate)!.push(t);
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions, filter, query]);

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center justify-between px-4 pb-2">
        <View className="flex-row items-center gap-1">
          <Pressable onPress={() => router.back()} hitSlop={8} className="-ml-1 p-1" accessibilityLabel="Back">
            <ChevronLeft size={24} color={colors[scheme].foreground} />
          </Pressable>
          <Text variant="heading">Transactions</Text>
        </View>
        <Pressable onPress={() => setShowSearch((s) => !s)} hitSlop={8} accessibilityLabel="Search">
          <Search size={20} color={colors[scheme].foreground} />
        </Pressable>
      </View>

      <View className="gap-3 px-4 pb-2">
        <Segmented options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
        {showSearch && (
          <View className="flex-row items-center gap-2 rounded-full bg-muted px-4 py-2.5">
            <Search size={16} color={colors[scheme].mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search notes & categories"
              placeholderTextColor={colors[scheme].mutedForeground}
              autoFocus
              className="flex-1 text-foreground"
            />
          </View>
        )}
      </View>

      {groups.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nothing here"
          description={query || filter !== 'all' ? 'No transactions match this filter.' : 'Your transactions will appear here.'}
          tint="#22c55e"
        />
      ) : (
        <ScrollView contentContainerClassName="gap-4 px-4 pb-10" showsVerticalScrollIndicator={false}>
          {groups.map(([logDate, dayTx]) => {
            const dayNet = dayTx.reduce((sum, t) => sum + (t.type === 'income' ? t.amountCents : -t.amountCents), 0);
            return (
              <View key={logDate} className="gap-2">
                <View className="flex-row items-center justify-between px-1">
                  <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
                    {dayLabel(logDate)}
                  </Text>
                  <Text variant="caption" style={{ color: dayNet >= 0 ? '#16a34a' : '#dc2626' }} className="font-sora-semibold">
                    {dayNet >= 0 ? '+' : ''}
                    {formatMoney(dayNet, currency)}
                  </Text>
                </View>
                <View className="gap-2.5">
                  {dayTx.map((t) => (
                    <TransactionRow key={t.id} transaction={t} currency={currency} onPress={(tx) => router.push(`/budget/transaction?id=${tx.id}`)} />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
