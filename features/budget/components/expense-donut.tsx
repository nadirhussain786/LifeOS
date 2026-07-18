import { View } from 'react-native';

import { DonutChart } from '@/components/ui/donut-chart';
import { Text } from '@/components/ui/text';
import { formatMoney } from '@/features/budget/services/money';
import type { CategorySlice } from '@/features/budget/types/budget.types';

type Props = {
  categories: CategorySlice[];
  totalCents: number;
  currency: string;
};

/** Expense breakdown donut plus a two-column legend. Top 6 categories get
 * their own slice; the rest fold into a neutral "Other" wedge so the ring never
 * fragments into hairline slivers. */
export function ExpenseDonut({ categories, totalCents, currency }: Props) {
  const top = categories.slice(0, 6);
  const restCents = categories.slice(6).reduce((sum, c) => sum + c.amountCents, 0);
  const slices = [
    ...top.map((c) => ({ value: c.amountCents, color: c.tint })),
    ...(restCents > 0 ? [{ value: restCents, color: '#94a3b8' }] : []),
  ];

  const legend = [
    ...top,
    ...(restCents > 0
      ? [{ categoryId: 'rest', label: 'Other', tint: '#94a3b8', amountCents: restCents, share: restCents / totalCents }]
      : []),
  ];

  return (
    <View className="items-center gap-4">
      <DonutChart data={slices} size={180} strokeWidth={26}>
        <View className="items-center">
          <Text variant="caption">Spent</Text>
          <Text className="font-sora-extrabold text-xl text-foreground">{formatMoney(totalCents, currency)}</Text>
        </View>
      </DonutChart>

      <View className="w-full flex-row flex-wrap">
        {legend.map((item) => (
          <View key={item.categoryId} className="w-1/2 flex-row items-center gap-2 py-1">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.tint }} />
            <Text variant="caption" className="flex-1" numberOfLines={1}>
              {item.label}
            </Text>
            <Text variant="caption" className="font-sora-semibold">
              {Math.round(item.share * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
