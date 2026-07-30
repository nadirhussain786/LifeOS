import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';

import { GradientButton } from '@/components/ui/gradient-button';
import { ProgressRing } from '@/components/ui/progress-ring';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { TransactionRow } from '@/features/budget/components/transaction-row';
import { formatMoney } from '@/features/budget/services/money';
import { useBudgetMutations } from '@/features/budget/hooks/use-budget-mutations';
import {
  useBudgetSettings,
  useSavingsGoals,
  useTransactions,
} from '@/features/budget/hooks/use-budget';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SavingsGoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const { data: goals = [] } = useSavingsGoals();
  const { data: transactions = [] } = useTransactions();
  const { data: settings } = useBudgetSettings();
  const { removeSavingsGoal } = useBudgetMutations();
  const currency = settings?.currency ?? '$';

  const goal = goals.find((g) => g.id === id);
  if (!goal) return null;

  const contributions = transactions.filter((t) => t.type === 'savings' && t.savingsGoalId === id);
  const remaining = Math.max(0, goal.targetCents - goal.savedCents);

  const confirmDelete = () => {
    Alert.alert(
      t('budget.deleteSavingsTitle'),
      t('budget.deleteSavingsBody', { name: goal.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => (removeSavingsGoal.mutate(goal.id), router.back()),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        eyebrow={t('budget.savings')}
        tint={moduleTint('budget', scheme)}
        actions={[
          {
            icon: Trash2,
            label: t('budget.deleteGoal'),
            onPress: confirmDelete,
            tint: colors[scheme].destructive,
          },
        ]}
      />

      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-2 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-4">
          <ProgressRing
            progress={goal.progress}
            size={180}
            strokeWidth={14}
            color={goal.colorToken}
            gradient
          >
            <View className="items-center">
              <Text className="font-sora-extrabold text-2xl text-foreground">
                {formatMoney(goal.savedCents, currency)}
              </Text>
              <Text variant="caption">
                {t('budget.ofAmount', { amount: formatMoney(goal.targetCents, currency) })}
              </Text>
            </View>
          </ProgressRing>
          <View className="items-center gap-1">
            <Text className="font-sora-bold text-2xl text-foreground">{goal.name}</Text>
            <Text variant="muted">
              {goal.progress >= 1
                ? t('budget.goalReached')
                : t('budget.amountToGo', { amount: formatMoney(remaining, currency) }) +
                  (goal.deadline
                    ? ` · ${t('budget.byDate', { date: format(goal.deadline, 'MMM yyyy') })}`
                    : '')}
            </Text>
          </View>
        </View>

        <GradientButton
          label={t('budget.addToGoal')}
          tint={goal.colorToken}
          icon={Plus}
          onPress={() => router.push(`/budget/transaction?savingsGoalId=${goal.id}`)}
        />

        <View className="gap-3">
          <Text variant="subheading">{t('budget.contributions')}</Text>
          {contributions.length === 0 ? (
            <Text variant="muted">{t('budget.noContributions')}</Text>
          ) : (
            <View className="gap-2.5">
              {contributions.map((transaction) => (
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
    </View>
  );
}
