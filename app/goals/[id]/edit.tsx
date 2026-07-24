import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { SheetHeader } from '@/components/ui/sheet-header';
import { GoalForm } from '@/features/goals/components/goal-form';
import { useGoal } from '@/features/goals/hooks/use-goals';
import { useGoalMutations } from '@/features/goals/hooks/use-goal-mutations';
import { type GoalFormValues } from '@/features/goals/schemas/goal-form-schema';

export default function EditGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
      <SheetHeader title="Edit Goal" />

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
