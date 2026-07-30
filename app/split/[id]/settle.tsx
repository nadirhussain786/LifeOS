import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowRight, HandCoins } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { formatMoney } from '@/features/budget/services/money';
import {
  useGroupBalances,
  useGroupDetail,
  useSplitMutations,
} from '@/features/split/hooks/use-split';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

/**
 * Settling up.
 *
 * The suggestions come from simplifyDebts, which minimises the number of
 * payments rather than preserving who-owed-whom — so a transfer here may be to
 * somebody you never directly shared a bill with. That is the point: it clears
 * the group in at most n−1 payments instead of everyone paying everyone.
 */
export default function SettleUpScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const tint = moduleTint('budget', scheme);

  const { data } = useGroupDetail(id);
  const { transfers } = useGroupBalances(data);
  const { settleUp } = useSplitMutations(id);

  const currency = data?.group?.currency ?? '$';
  const memberName = (memberId: string) => {
    const m = data?.members.find((x) => x.id === memberId);
    return m?.displayName || m?.email || t('split.someone');
  };

  const record = (fromMemberId: string, toMemberId: string, amountCents: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    settleUp.mutate(
      { fromMemberId, toMemberId, amountCents, currency, note: null },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <View className="flex-1 bg-background">
      <SheetHeader title={t('split.settleUp')} />

      {transfers.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={t('split.allSquareTitle')}
          description={t('split.allSquareBody')}
          tint={tint}
        />
      ) : (
        <ScrollView contentContainerClassName="gap-3 px-5 pt-3 pb-10">
          <Text variant="caption">{t('split.settleHint')}</Text>

          {transfers.map((transfer, index) => (
            <Pressable
              key={`${transfer.fromMemberId}-${transfer.toMemberId}-${index}`}
              onPress={() =>
                record(transfer.fromMemberId, transfer.toMemberId, transfer.amountCents)
              }
              disabled={settleUp.isPending}
              accessibilityRole="button"
              className="gap-3 rounded-2xl border border-border bg-card p-4"
              style={{ opacity: settleUp.isPending ? 0.6 : 1 }}
            >
              <View className="flex-row items-center gap-2">
                <Text className="flex-1 font-sora-medium text-foreground" numberOfLines={1}>
                  {memberName(transfer.fromMemberId)}
                </Text>
                <ArrowRight size={15} color={colors[scheme].mutedForeground} />
                <Text
                  className="flex-1 text-end font-sora-medium text-foreground"
                  numberOfLines={1}
                >
                  {memberName(transfer.toMemberId)}
                </Text>
              </View>
              <View
                className="items-center rounded-xl py-2"
                style={{ backgroundColor: alpha(tint, 0.12) }}
              >
                <Text className="font-sora-bold" style={{ color: tint }}>
                  {t('split.markPaid', {
                    amount: formatMoney(transfer.amountCents, currency),
                  })}
                </Text>
              </View>
            </Pressable>
          ))}

          {settleUp.isError && (
            <Text variant="caption" className="text-destructive">
              {t('split.saveFailed')}
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
