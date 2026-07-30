import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { HandCoins, Plus, Receipt, UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { QueryError } from '@/components/ui/query-error';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { moduleTint, colors as dsColors } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { formatMoney } from '@/features/budget/services/money';
import { useGroupBalances, useGroupDetail } from '@/features/split/hooks/use-split';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

export default function SplitGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const tint = moduleTint('budget', scheme);

  const { data, isLoading, isError, refetch } = useGroupDetail(id);
  const { balances, spendCents, mine } = useGroupBalances(data);

  const currency = data?.group?.currency ?? 'USD';
  const memberName = (memberId: string) => {
    const m = data?.members.find((x) => x.id === memberId);
    return m?.displayName || m?.email || t('split.someone');
  };

  if (isError) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader eyebrow={t('split.title')} tint={tint} />
        <QueryError onRetry={() => refetch()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title={data?.group?.name}
        eyebrow={t('split.title')}
        tint={tint}
        actions={[
          {
            icon: UserPlus,
            label: t('split.addPeople'),
            onPress: () => router.push(`/split/${id}/members`),
          },
        ]}
      />

      {isLoading || !data ? (
        <View className="gap-3 px-5 pt-2">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="gap-6 px-5 pb-28 pt-1"
          showsVerticalScrollIndicator={false}
        >
          {/* Your position first — the question people open this for — with
              total spend beside it. */}
          <View className="gap-3 rounded-2xl border border-border bg-card p-4">
            <View className="flex-row">
              <View className="flex-1 gap-0.5">
                <Text variant="micro">{t('split.yourPosition')}</Text>
                <Text
                  className="font-sora-extrabold text-2xl"
                  style={{
                    color:
                      !mine || mine.netCents === 0
                        ? colors[scheme].foreground
                        : mine.netCents > 0
                          ? dsColors[scheme].success
                          : dsColors[scheme].error,
                  }}
                >
                  {formatMoney(Math.abs(mine?.netCents ?? 0), currency)}
                </Text>
                <Text variant="caption">
                  {!mine || mine.netCents === 0
                    ? t('split.allSquare')
                    : mine.netCents > 0
                      ? t('split.youAreOwed')
                      : t('split.youOwe')}
                </Text>
              </View>
              <View className="w-px bg-border" />
              <View className="flex-1 gap-0.5 ps-4">
                <Text variant="micro">{t('split.totalSpend')}</Text>
                <Text className="font-sora-extrabold text-2xl text-foreground">
                  {formatMoney(spendCents, currency)}
                </Text>
                <Text variant="caption">
                  {t('split.membersCount', { count: data.members.length })}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => router.push(`/split/${id}/expense`)}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3"
                style={{ backgroundColor: alpha(tint, 0.12) }}
              >
                <Plus size={16} color={tint} />
                <Text className="font-sora-semibold" style={{ color: tint }}>
                  {t('split.addExpense')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/split/${id}/settle`)}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border py-3"
              >
                <HandCoins size={16} color={colors[scheme].foreground} />
                <Text className="font-sora-semibold text-foreground">{t('split.settleUp')}</Text>
              </Pressable>
            </View>
          </View>

          {/* Who owes what */}
          <View className="gap-2">
            <SectionHeader title={t('split.balances')} />
            <View className="rounded-2xl border border-border bg-card px-4">
              {balances.map((b, index) => (
                <View
                  key={b.memberId}
                  className={
                    index === 0
                      ? 'flex-row items-center justify-between py-3'
                      : 'flex-row items-center justify-between border-t border-border py-3'
                  }
                >
                  <Text className="flex-1 text-foreground" numberOfLines={1}>
                    {memberName(b.memberId)}
                  </Text>
                  <Text
                    className="font-sora-semibold"
                    style={{
                      color:
                        b.netCents === 0
                          ? colors[scheme].mutedForeground
                          : b.netCents > 0
                            ? dsColors[scheme].success
                            : dsColors[scheme].error,
                    }}
                  >
                    {b.netCents === 0
                      ? t('split.settled')
                      : formatMoney(Math.abs(b.netCents), currency)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Expenses */}
          <View className="gap-2">
            <SectionHeader title={t('split.expenses')} />
            {data.expenses.length === 0 ? (
              <View style={{ minHeight: 160 }}>
                <EmptyState
                  icon={Receipt}
                  title={t('split.noExpensesTitle')}
                  description={t('split.noExpensesBody')}
                  tint={tint}
                  actionLabel={t('split.addExpense')}
                  onAction={() => router.push(`/split/${id}/expense`)}
                />
              </View>
            ) : (
              <View className="rounded-2xl border border-border bg-card px-4">
                {data.expenses.map((expense, index) => (
                  <Pressable
                    key={expense.id}
                    onPress={() => router.push(`/split/${id}/expense?expense=${expense.id}`)}
                    className={
                      index === 0
                        ? 'flex-row items-center gap-3 py-3'
                        : 'flex-row items-center gap-3 border-t border-border py-3'
                    }
                  >
                    <View className="flex-1 gap-0.5">
                      <Text className="font-sora-medium text-foreground" numberOfLines={1}>
                        {expense.description}
                      </Text>
                      <Text variant="caption">
                        {t('split.paidBy', { name: memberName(expense.paidByMemberId) })} ·{' '}
                        {format(expense.spentAt, 'MMM d')}
                      </Text>
                    </View>
                    <Text className="font-sora-semibold text-foreground">
                      {formatMoney(expense.amountCents, currency)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Activity — who did what, which is what makes "anyone can edit" safe */}
          {data.activity.length > 0 && (
            <View className="gap-2">
              <SectionHeader title={t('split.activity')} />
              <View className="gap-2.5">
                {data.activity.slice(0, 12).map((entry) => (
                  <View key={entry.id} className="flex-row items-baseline gap-2">
                    <Text variant="caption" className="flex-1">
                      {t(`split.action.${entry.action}`, {
                        actor: entry.actorName ?? t('split.someone'),
                        description: String(entry.meta?.description ?? ''),
                      })}
                    </Text>
                    <Text variant="caption">{format(entry.createdAt, 'MMM d')}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
