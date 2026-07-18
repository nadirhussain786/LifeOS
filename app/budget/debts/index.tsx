import { useRouter } from 'expo-router';
import { ChevronLeft, HandCoins } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { HeroCard } from '@/components/ui/hero-card';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { DebtCard } from '@/features/budget/components/debt-card';
import { formatMoney } from '@/features/budget/services/money';
import { useBudgetSettings } from '@/features/budget/hooks/use-budget';
import { useDebts } from '@/features/budget/hooks/use-debts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';
import type { DebtDirection, DebtWithStatus } from '@/features/budget/types/budget.types';

const DEBT_TINT = '#6366f1';

const FILTER_OPTIONS = [
  { value: 'borrowed' as const, label: 'You owe' },
  { value: 'lent' as const, label: 'Owes you' },
];

/** Urgency ordering for the active list: overdue → due soon → upcoming → no date. */
const STATUS_ORDER: Record<string, number> = { overdue: 0, due_soon: 1, upcoming: 2, no_date: 3 };

function sortByUrgency(a: DebtWithStatus, b: DebtWithStatus): number {
  const s = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
  if (s !== 0) return s;
  if (a.daysLeft != null && b.daysLeft != null) return a.daysLeft - b.daysLeft;
  return b.createdAt - a.createdAt;
}

export default function DebtsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { data: settings } = useBudgetSettings();
  const { debts, totals, isLoading } = useDebts();
  const currency = settings?.currency ?? '$';

  const [filter, setFilter] = useState<DebtDirection>('borrowed');

  const { active, settled } = useMemo(() => {
    const inFilter = debts.filter((d) => d.direction === filter);
    return {
      active: inFilter.filter((d) => !d.isSettled).sort(sortByUrgency),
      settled: inFilter.filter((d) => d.isSettled).sort((a, b) => (b.settledAt ?? 0) - (a.settledAt ?? 0)),
    };
  }, [debts, filter]);

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center gap-1 px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="-ml-1 p-1" accessibilityLabel="Back">
          <ChevronLeft size={24} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="heading">Borrow & Lend</Text>
      </View>

      {isLoading ? (
        <View className="gap-3 px-4 pt-2">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </View>
      ) : debts.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Track who owes who"
          description="Log money you've borrowed or lent, set a payback deadline, and get reminded before it's due."
          tint={DEBT_TINT}
          actionLabel="Add an IOU"
          onAction={() => router.push('/budget/debts/new')}
        />
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-4 pb-28" showsVerticalScrollIndicator={false}>
          {/* Net position hero */}
          <HeroCard tint={DEBT_TINT}>
            <View className="gap-4">
              <View className="items-center gap-1">
                <Text className="font-sora-semibold uppercase tracking-wide" style={{ color: alpha('#ffffff', 0.85), fontSize: 12 }}>
                  Net position
                </Text>
                <Text className="font-sora-extrabold text-4xl" style={{ color: '#ffffff' }}>
                  {totals.netCents >= 0 ? '+' : '-'}
                  {formatMoney(Math.abs(totals.netCents), currency)}
                </Text>
                <Text style={{ color: alpha('#ffffff', 0.85), fontSize: 12 }}>
                  {totals.netCents >= 0 ? "you're owed more than you owe" : 'you owe more than you’re owed'}
                </Text>
              </View>
              <View className="flex-row rounded-2xl p-3" style={{ backgroundColor: alpha('#ffffff', 0.15) }}>
                {[
                  { label: 'You owe', value: totals.oweCents },
                  { label: 'Owes you', value: totals.owedCents },
                ].map((item) => (
                  <View key={item.label} className="flex-1 items-center gap-1">
                    <Text className="font-sora-bold" style={{ color: '#ffffff' }}>
                      {formatMoney(item.value, currency)}
                    </Text>
                    <Text style={{ color: alpha('#ffffff', 0.85), fontSize: 11 }}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </HeroCard>

          <Segmented options={FILTER_OPTIONS} value={filter} onChange={setFilter} activeColor={DEBT_TINT} />

          {active.length === 0 ? (
            <Text variant="muted" className="px-1">
              {filter === 'borrowed' ? 'Nothing outstanding — you owe no one right now.' : 'No one owes you right now.'}
            </Text>
          ) : (
            <View className="gap-2.5">
              {active.map((debt) => (
                <DebtCard key={debt.id} debt={debt} onPress={(d) => router.push(`/budget/debts/${d.id}`)} />
              ))}
            </View>
          )}

          {settled.length > 0 && (
            <View className="gap-2.5">
              <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
                Settled
              </Text>
              {settled.map((debt) => (
                <DebtCard key={debt.id} debt={debt} onPress={(d) => router.push(`/budget/debts/${d.id}`)} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <Fab onPress={() => router.push('/budget/debts/new')} accessibilityLabel="Add IOU" />
    </View>
  );
}
