import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BarChart, type BarDatum } from '@/components/ui/bar-chart';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { ExpenseDonut } from '@/features/budget/components/expense-donut';
import { periodLabel, type Period } from '@/features/budget/services/budget-stats';
import { formatMoney } from '@/features/budget/services/money';
import { useBudgetOverview } from '@/features/budget/hooks/use-budget';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PERIOD_OPTIONS = [
  { value: 'week' as const, label: 'Week' },
  { value: 'month' as const, label: 'Month' },
  { value: 'year' as const, label: 'Year' },
];

export default function BudgetReportsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const [period, setPeriod] = useState<Period>('month');
  const [anchorTime] = useState(() => Date.now());

  const { currency, summary, categories, trend } = useBudgetOverview(period, anchorTime);

  const incomeVsExpense: BarDatum[] = [
    { label: 'Income', value: summary.incomeCents / 100, color: '#22c55e' },
    { label: 'Expenses', value: summary.expenseCents / 100, color: '#ef4444' },
    { label: 'Savings', value: summary.savingsCents / 100, color: '#6366f1' },
  ];

  const expenseTrend: BarDatum[] = trend.map((point) => ({
    label: point.label,
    value: point.expenseCents / 100,
    color: '#ef4444',
  }));

  const summaryRows = [
    { label: 'Income', value: summary.incomeCents, color: '#22c55e' },
    { label: 'Expenses', value: summary.expenseCents, color: '#ef4444' },
    { label: 'Savings', value: summary.savingsCents, color: '#6366f1' },
    { label: 'Net balance', value: summary.balanceCents, color: colors[scheme].foreground },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Reports" eyebrow="Budget" tint={moduleTint('budget', scheme)} />

      <ScrollView contentContainerClassName="gap-5 px-5 pb-10" showsVerticalScrollIndicator={false}>
        <Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        <Text variant="muted" className="text-center">
          {periodLabel(period, new Date(anchorTime))}
        </Text>

        <View className="gap-2.5 rounded-2xl border border-border bg-card p-4">
          {summaryRows.map((row, index) => (
            <View
              key={row.label}
              className={index === summaryRows.length - 1 ? 'flex-row items-center justify-between border-t border-border pt-2.5' : 'flex-row items-center justify-between'}
            >
              <Text className={index === summaryRows.length - 1 ? 'font-sora-semibold text-foreground' : 'text-muted-foreground'}>
                {row.label}
              </Text>
              <Text className="font-sora-bold" style={{ color: row.color }}>
                {formatMoney(row.value, currency)}
              </Text>
            </View>
          ))}
        </View>

        <View className="gap-3 rounded-2xl border border-border bg-card p-4">
          <Text variant="subheading">Income vs Expenses</Text>
          <BarChart data={incomeVsExpense} height={160} />
        </View>

        <View className="gap-3 rounded-2xl border border-border bg-card p-4">
          <Text variant="subheading">Expenses · last 6 months</Text>
          <BarChart data={expenseTrend} color="#ef4444" height={160} />
        </View>

        {categories.length > 0 && (
          <View className="gap-3 rounded-2xl border border-border bg-card p-4">
            <Text variant="subheading">By category</Text>
            <ExpenseDonut categories={categories} totalCents={summary.expenseCents} currency={currency} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
