import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { SheetHeader } from '@/components/ui/sheet-header';
import { HabitForm } from '@/features/habits/components/habit-form';
import { useHabitMutations } from '@/features/habits/hooks/use-habit-mutations';
import { habitFormDefaults } from '@/features/habits/schemas/habit-form-schema';

export default function NewHabitScreen() {
  const router = useRouter();
  const { create } = useHabitMutations();

  return (
    <View className="flex-1 bg-background">
      <SheetHeader title="New Habit" />

      <HabitForm
        defaultValues={habitFormDefaults}
        submitLabel="Create habit"
        onSubmit={(values) => {
          create.mutate(values);
          router.back();
        }}
      />
    </View>
  );
}
