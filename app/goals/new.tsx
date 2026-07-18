import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { GoalForm } from '@/features/goals/components/goal-form';
import { useGoalMutations } from '@/features/goals/hooks/use-goal-mutations';
import { goalFormDefaults } from '@/features/goals/schemas/goal-form-schema';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function NewGoalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { create } = useGoalMutations();

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <X size={17} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
          New Goal
        </Text>
        <View className="h-8 w-8" />
      </View>

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
