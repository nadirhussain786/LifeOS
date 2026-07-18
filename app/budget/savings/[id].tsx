import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientButton } from '@/components/ui/gradient-button';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { TransactionRow } from '@/features/budget/components/transaction-row';
import { formatMoney } from '@/features/budget/services/money';
import { useBudgetMutations } from '@/features/budget/hooks/use-budget-mutations';
import { useBudgetSettings, useSavingsGoals, useTransactions } from '@/features/budget/hooks/use-budget';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SavingsGoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
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
    Alert.alert('Delete savings goal?', `"${goal.name}" will be removed. Your savings transactions are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => (removeSavingsGoal.mutate(goal.id), router.back()) },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <ChevronLeft size={20} color={colors[scheme].foreground} />
        </Pressable>
        <Pressable onPress={confirmDelete} hitSlop={8} accessibilityLabel="Delete goal">
          <Trash2 size={19} color={colors[scheme].destructive} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="gap-6 px-5 pt-2 pb-10" showsVerticalScrollIndicator={false}>
        <View className="items-center gap-4">
          <ProgressRing progress={goal.progress} size={180} strokeWidth={14} color={goal.colorToken} gradient>
            <View className="items-center">
              <Text className="font-sora-extrabold text-2xl text-foreground">{formatMoney(goal.savedCents, currency)}</Text>
              <Text variant="caption">of {formatMoney(goal.targetCents, currency)}</Text>
            </View>
          </ProgressRing>
          <View className="items-center gap-1">
            <Text className="font-sora-bold text-2xl text-foreground">{goal.name}</Text>
            <Text variant="muted">
              {goal.progress >= 1
                ? 'Goal reached 🎉'
                : `${formatMoney(remaining, currency)} to go${goal.deadline ? ` · by ${format(goal.deadline, 'MMM yyyy')}` : ''}`}
            </Text>
          </View>
        </View>

        <GradientButton
          label="Add to this goal"
          tint={goal.colorToken}
          icon={Plus}
          onPress={() => router.push(`/budget/transaction?savingsGoalId=${goal.id}`)}
        />

        <View className="gap-3">
          <Text variant="subheading">Contributions</Text>
          {contributions.length === 0 ? (
            <Text variant="muted">No contributions yet — add your first deposit above.</Text>
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
