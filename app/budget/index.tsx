import { addMonths, format, isSameMonth, subMonths } from 'date-fns';
import { useRouter } from 'expo-router';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  PiggyBank,
  Plus,
  Settings2,
  Wallet,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { HeroCard } from '@/components/ui/hero-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { ACCOUNTS } from '@/features/budget/config/budget-config';
import { ExpenseDonut } from '@/features/budget/components/expense-donut';
import { SavingsGoalCard } from '@/features/budget/components/savings-goal-card';
import { TransactionRow } from '@/features/budget/components/transaction-row';
import { formatMoney } from '@/features/budget/services/money';
import { useBudgetOverview, useSavingsGoals } from '@/features/budget/hooks/use-budget';
import { useDebts } from '@/features/budget/hooks/use-debts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

const DEBT_TINT = '#6366f1';

export default function BudgetScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const budgetTint = moduleTint('budget', scheme);
  const [anchorTime, setAnchorTime] = useState(() => Date.now());

  const overview = useBudgetOverview('month', anchorTime);
  const { data: savingsGoals = [] } = useSavingsGoals();
  const { totals: debtTotals } = useDebts();
  const { currency, summary, categories, accounts, periodTransactions, hasAny, isLoading, monthlyBudgetCents } = overview;

  const budgetRatio = monthlyBudgetCents && monthlyBudgetCents > 0 ? summary.expenseCents / monthlyBudgetCents : 0;
  const overBudget = monthlyBudgetCents != null && summary.expenseCents > monthlyBudgetCents;

  const anchor = new Date(anchorTime);
  const isCurrentMonth = isSameMonth(anchor, new Date());

  const accountMeta = new Map(ACCOUNTS.map((a) => [a.id, a]));

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Budget"
        eyebrow="Finance"
        tint={budgetTint}
        actions={[
          { icon: BarChart3, label: 'Reports', onPress: () => router.push('/budget/reports') },
          { icon: Settings2, label: 'Budget settings', onPress: () => router.push('/budget/settings') },
        ]}
      />

      {isLoading ? (
        <View className="gap-3 px-5 pt-2">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </View>
      ) : !hasAny ? (
        <EmptyState
          icon={Wallet}
          title="Track your money"
          description="Add your income and expenses to see where it goes and grow your savings."
          tint={budgetTint}
          actionLabel="Add transaction"
          onAction={() => router.push('/budget/transaction')}
        />
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-5 pb-28" showsVerticalScrollIndicator={false}>
          {/* Month selector */}
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => setAnchorTime(subMonths(anchor, 1).getTime())} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-muted">
              <ChevronLeft size={18} color={colors[scheme].foreground} />
            </Pressable>
            <Text className="font-sora-semibold text-foreground">{format(anchor, 'MMMM yyyy')}</Text>
            <Pressable
              onPress={() => !isCurrentMonth && setAnchorTime(addMonths(anchor, 1).getTime())}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-muted"
              style={{ opacity: isCurrentMonth ? 0.4 : 1 }}
            >
              <ChevronRight size={18} color={colors[scheme].foreground} />
            </Pressable>
          </View>

          {/* Balance hero */}
          <HeroCard tint={budgetTint}>
            <View className="gap-4">
              <View className="items-center gap-1">
                <Text className="font-sora-semibold uppercase tracking-wide" style={{ color: alpha('#ffffff', 0.85), fontSize: 12 }}>
                  Remaining balance
                </Text>
                <Text className="font-sora-extrabold text-4xl" style={{ color: '#ffffff' }}>
                  {formatMoney(summary.balanceCents, currency)}
                </Text>
              </View>
              <View className="flex-row rounded-2xl p-3" style={{ backgroundColor: alpha('#ffffff', 0.15) }}>
                {[
                  { label: 'Income', value: summary.incomeCents, dot: '#dcfce7' },
                  { label: 'Expenses', value: summary.expenseCents, dot: '#fee2e2' },
                  { label: 'Savings', value: summary.savingsCents, dot: '#e0e7ff' },
                ].map((item) => (
                  <View key={item.label} className="flex-1 items-center gap-1">
                    <Text className="font-sora-bold" style={{ color: '#ffffff' }}>
                      {formatMoney(item.value, currency)}
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.dot }} />
                      <Text style={{ color: alpha('#ffffff', 0.85), fontSize: 11 }}>{item.label}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </HeroCard>

          {/* Account balances */}
          <View className="flex-row gap-2.5">
            {accounts.map((entry) => {
              const meta = accountMeta.get(entry.account);
              const Icon = meta?.icon ?? Wallet;
              return (
                <View key={entry.account} className="flex-1 items-center gap-1.5 rounded-2xl border border-border bg-card py-3.5">
                  <Icon size={16} color={colors[scheme].mutedForeground} />
                  <Text className="font-sora-bold text-foreground">{formatMoney(entry.balanceCents, currency)}</Text>
                  <Text variant="caption">{meta?.label}</Text>
                </View>
              );
            })}
          </View>

          {/* Borrow & Lend */}
          <Pressable
            onPress={() => router.push('/budget/debts')}
            className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: alpha(DEBT_TINT, 0.14) }}>
              <HandCoins size={20} color={DEBT_TINT} />
            </View>
            <View className="flex-1">
              <Text className="font-sora-semibold text-foreground">Borrow & Lend</Text>
              <Text variant="caption">
                {debtTotals.activeCount === 0
                  ? 'Track IOUs, deadlines & reminders'
                  : `You owe ${formatMoney(debtTotals.oweCents, currency)} · Owed ${formatMoney(debtTotals.owedCents, currency)}`}
              </Text>
            </View>
            <ChevronRight size={18} color={colors[scheme].mutedForeground} />
          </Pressable>

          {/* Budget vs actual */}
          {monthlyBudgetCents != null && monthlyBudgetCents > 0 && (
            <View className="gap-2.5 rounded-2xl border border-border bg-card p-4">
              <View className="flex-row items-center justify-between">
                <Text variant="subheading">Monthly budget</Text>
                <Text variant="caption">
                  {formatMoney(summary.expenseCents, currency)} of {formatMoney(monthlyBudgetCents, currency)}
                </Text>
              </View>
              <ProgressBar progress={Math.min(1, budgetRatio)} color={overBudget ? '#ef4444' : '#22c55e'} height={8} />
              <Text variant="caption" style={{ color: overBudget ? '#dc2626' : '#16a34a' }} className="font-sora-medium">
                {overBudget
                  ? `Over budget by ${formatMoney(summary.expenseCents - monthlyBudgetCents, currency)}`
                  : `${formatMoney(monthlyBudgetCents - summary.expenseCents, currency)} left this month`}
              </Text>
            </View>
          )}

          {/* Expense donut */}
          {categories.length > 0 && (
            <View className="gap-3 rounded-2xl border border-border bg-card p-4">
              <Text variant="subheading">Where it went</Text>
              <ExpenseDonut categories={categories} totalCents={summary.expenseCents} currency={currency} />
            </View>
          )}

          {/* Savings goals */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text variant="subheading">Savings goals</Text>
              <Pressable onPress={() => router.push('/budget/savings/new')} hitSlop={8} className="flex-row items-center gap-1">
                <Plus size={15} color={budgetTint} />
                <Text variant="caption" style={{ color: budgetTint }} className="font-sora-semibold">
                  New
                </Text>
              </Pressable>
            </View>
            {savingsGoals.length === 0 ? (
              <Pressable
                onPress={() => router.push('/budget/savings/new')}
                className="flex-row items-center gap-3 rounded-2xl border border-dashed border-border p-4"
              >
                <PiggyBank size={20} color={colors[scheme].mutedForeground} />
                <Text variant="muted" className="flex-1">
                  Set a savings goal — a rainy-day fund, a trip, anything.
                </Text>
              </Pressable>
            ) : (
              savingsGoals.map((goal) => (
                <SavingsGoalCard
                  key={goal.id}
                  goal={goal}
                  currency={currency}
                  onPress={(g) => router.push(`/budget/savings/${g.id}`)}
                  onAdd={(g) => router.push(`/budget/transaction?savingsGoalId=${g.id}`)}
                />
              ))
            )}
          </View>

          {/* Recent transactions */}
          <View className="gap-3">
            <SectionHeader
              title="Transactions"
              actionLabel={periodTransactions.length > 0 ? 'View all' : undefined}
              onAction={periodTransactions.length > 0 ? () => router.push('/budget/transactions') : undefined}
              actionTint={budgetTint}
            />
            {periodTransactions.length === 0 ? (
              <Text variant="muted">No transactions this month yet.</Text>
            ) : (
              <View className="gap-2.5">
                {periodTransactions.slice(0, 25).map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    currency={currency}
                    onPress={(t) => router.push(`/budget/transaction?id=${t.id}`)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <Fab onPress={() => router.push('/budget/transaction')} accessibilityLabel="Add transaction" />
    </View>
  );
}
