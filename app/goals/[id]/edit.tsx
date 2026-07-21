import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { GoalForm } from '@/features/goals/components/goal-form';
import { useGoal } from '@/features/goals/hooks/use-goals';
import { useGoalMutations } from '@/features/goals/hooks/use-goal-mutations';
import { type GoalFormValues } from '@/features/goals/schemas/goal-form-schema';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function EditGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { data: goal } = useGoal(id);
  const { update } = useGoalMutations();

  if (!goal) return null;

  const defaults: GoalFormValues = {
    title: goal.title,
    description: goal.description,
    category: goal.category,
    categoryLabel: goal.categoryLabel,
    priority: goal.priority,
    progressMode: goal.progressMode,
    targetValue: goal.targetValue,
    unit: goal.unit,
    dueDate: goal.dueDate,
    milestones: [],
  };

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-5 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full border border-border bg-surface">
          <X size={17} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="micro">Edit Goal</Text>
        <View className="h-8 w-8" />
      </View>

      <GoalForm
        defaultValues={defaults}
        submitLabel="Save changes"
        showMilestones={false}
        onSubmit={(values) => {
          update.mutate({
            id: goal.id,
            input: {
              title: values.title,
              description: values.description,
              category: values.category,
              categoryLabel: values.categoryLabel,
              priority: values.priority,
              progressMode: values.progressMode,
              targetValue: values.targetValue,
              unit: values.unit,
              dueDate: values.dueDate,
            },
          });
          router.back();
        }}
      />
    </View>
  );
}
