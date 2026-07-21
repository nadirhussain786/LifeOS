import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { HabitForm } from '@/features/habits/components/habit-form';
import { useHabitMutations } from '@/features/habits/hooks/use-habit-mutations';
import { habitFormDefaults } from '@/features/habits/schemas/habit-form-schema';

export default function NewHabitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { create } = useHabitMutations();

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-5 pb-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          className="h-8 w-8 items-center justify-center rounded-full border border-border bg-surface"
        >
          <X size={17} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="micro" className="font-sora-semibold">
          New Habit
        </Text>
        <View className="h-8 w-8" />
      </View>

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
