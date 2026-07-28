import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { SheetHeader } from '@/components/ui/sheet-header';
import { HabitForm } from '@/features/habits/components/habit-form';
import { useHabitMutations } from '@/features/habits/hooks/use-habit-mutations';
import { habitFormDefaults } from '@/features/habits/schemas/habit-form-schema';

export default function NewHabitScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { create } = useHabitMutations();

  return (
    <View className="flex-1 bg-background">
      <SheetHeader title={t('habits.newHabit')} />

      <HabitForm
        defaultValues={habitFormDefaults}
        submitLabel={t('habits.createHabit')}
        onSubmit={(values) => {
          create.mutate(values);
          router.back();
        }}
      />
    </View>
  );
}
