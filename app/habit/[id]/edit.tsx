import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { HabitForm } from '@/features/habits/components/habit-form';
import { useHabit } from '@/features/habits/hooks/use-habit';
import { useHabitMutations } from '@/features/habits/hooks/use-habit-mutations';
import type { HabitFormValues } from '@/features/habits/schemas/habit-form-schema';

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
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

      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-5 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full border border-border bg-surface">
          <X size={17} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="micro" className="font-sora-semibold">
          Edit Habit
        </Text>
        <View className="h-8 w-8" />
      </View>

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
