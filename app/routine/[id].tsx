import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { useRoutineMutations } from '@/features/habits/hooks/use-routine-mutations';
import { useRoutines } from '@/features/habits/hooks/use-routines';
import { useHabits } from '@/features/habits/hooks/use-habits';

const AUTOSAVE_DELAY_MS = 500;

export default function RoutineDetailScreen() {
  const { id: routineId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';

  const { data: routines = [] } = useRoutines();
  const { data: allHabits = [] } = useHabits();
  const { rename, remove, addHabit, removeHabit, reorder } = useRoutineMutations();

  const routine = routines.find((item) => item.id === routineId);
  const [name, setName] = useState(routine?.name ?? '');

  useEffect(() => {
    if (routine) setName(routine.name);
  }, [routine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!routine || name === routine.name || !name.trim()) return;
    const timeout = setTimeout(() => rename.mutate({ id: routine.id, name: name.trim() }), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!routine) return null;

  const habitIdsInRoutine = new Set(routine.habits.map((habit) => habit.id));
  const availableHabits = allHabits.filter((habit) => !habitIdsInRoutine.has(habit.id));
  const orderedIds = routine.habits.map((habit) => habit.id);

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedIds.length) return;
    Haptics.selectionAsync();
    const next = [...orderedIds];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    reorder.mutate({ routineId: routine.id, orderedHabitIds: next });
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Edit Routine"
        eyebrow="Routine"
        tint={moduleTint('habit', scheme)}
        actions={[
          {
            icon: Trash2,
            label: 'Delete routine',
            onPress: () => {
              remove.mutate(routine.id);
              router.back();
            },
            tint: colors[scheme].destructive,
          },
        ]}
      />

      <ScrollView contentContainerClassName="gap-6 px-5 pt-3 pb-10" keyboardShouldPersistTaps="handled">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Routine name"
          placeholderTextColor={colors[scheme].mutedForeground}
          style={{ fontSize: 24, fontFamily: 'Sora_700Bold', color: colors[scheme].foreground }}
        />

        <View className="gap-2">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            In this routine
          </Text>
          {routine.habits.length === 0 ? (
            <Text variant="muted">Add habits below to build the chain.</Text>
          ) : (
            <View className="rounded-2xl border border-border bg-card px-4">
              {routine.habits.map((habit, index) => (
                <View
                  key={habit.id}
                  className={index === 0 ? 'flex-row items-center gap-3 py-3' : 'flex-row items-center gap-3 border-t border-border py-3'}
                >
                  <Text className="text-lg">{habit.emoji ?? '🔥'}</Text>
                  <Text className="flex-1 font-sora-medium" numberOfLines={1}>
                    {habit.name}
                  </Text>
                  <Pressable onPress={() => move(index, -1)} disabled={index === 0} hitSlop={8} className={index === 0 ? 'opacity-30' : ''}>
                    <ChevronUp size={18} color={colors[scheme].mutedForeground} />
                  </Pressable>
                  <Pressable
                    onPress={() => move(index, 1)}
                    disabled={index === routine.habits.length - 1}
                    hitSlop={8}
                    className={index === routine.habits.length - 1 ? 'opacity-30' : ''}
                  >
                    <ChevronDown size={18} color={colors[scheme].mutedForeground} />
                  </Pressable>
                  <Pressable onPress={() => removeHabit.mutate({ routineId: routine.id, habitId: habit.id })} hitSlop={8}>
                    <X size={18} color={colors[scheme].destructive} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="gap-2">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            Add a habit
          </Text>
          {availableHabits.length === 0 ? (
            <Text variant="muted">Every habit is already in this routine.</Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {availableHabits.map((habit) => (
                <Pressable
                  key={habit.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    addHabit.mutate({ routineId: routine.id, habitId: habit.id });
                  }}
                  className="flex-row items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-2"
                >
                  <Text className="text-base">{habit.emoji ?? '🔥'}</Text>
                  <Text variant="caption" className="font-sora-medium">
                    {habit.name}
                  </Text>
                  <Plus size={13} color={colors[scheme].mutedForeground} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
