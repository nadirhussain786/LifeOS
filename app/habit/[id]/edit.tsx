import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { SheetHeader } from '@/components/ui/sheet-header';
import { HabitForm } from '@/features/habits/components/habit-form';
import { useHabit } from '@/features/habits/hooks/use-habit';
import { useHabitMutations } from '@/features/habits/hooks/use-habit-mutations';
import type { HabitFormValues } from '@/features/habits/schemas/habit-form-schema';

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: habit } = useHabit(id);
  const { update } = useHabitMutations();

  if (!habit) return null;

  const defaultValues: HabitFormValues = {
    name: habit.name,
    emoji: habit.emoji,
    categoryId: habit.categoryId,
    type: habit.type,
    unit: habit.unit,
    targetValue: habit.targetValue,
    scheduleType: habit.scheduleType,
    scheduleDays: habit.scheduleDays,
    scheduleIntervalDays: habit.scheduleIntervalDays,
    reminderTime: habit.reminderTime,
    reminderAdaptive: habit.reminderAdaptive,
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <SheetHeader title="Edit Habit" />

      <HabitForm
        defaultValues={defaultValues}
        submitLabel="Save changes"
        onSubmit={(values) => {
          update.mutate({ id: habit.id, input: values });
          router.back();
        }}
      />
    </View>
  );
}
