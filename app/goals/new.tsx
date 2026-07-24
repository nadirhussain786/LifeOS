import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { SheetHeader } from '@/components/ui/sheet-header';
import { GoalForm } from '@/features/goals/components/goal-form';
import { useGoalMutations } from '@/features/goals/hooks/use-goal-mutations';
import { goalFormDefaults } from '@/features/goals/schemas/goal-form-schema';

export default function NewGoalScreen() {
  const router = useRouter();
  const { create } = useGoalMutations();

  return (
    <View className="flex-1 bg-background">
      <SheetHeader title="New Goal" />

      <GoalForm
        defaultValues={goalFormDefaults}
        submitLabel="Create goal"
        onSubmit={(values) => {
          create.mutate({
            title: values.title,
            description: values.description,
            category: values.category,
            categoryLabel: values.categoryLabel,
            priority: values.priority,
            progressMode: values.progressMode,
            targetValue: values.targetValue,
            unit: values.unit,
            dueDate: values.dueDate,
            milestones: values.milestones,
          });
          router.back();
        }}
      />
    </View>
  );
}
