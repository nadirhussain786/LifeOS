import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Minus, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientButton } from '@/components/ui/gradient-button';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { goalCategoryMeta } from '@/features/goals/config/goal-categories';
import { formatProgressPercent } from '@/features/goals/services/goal-format';
import { useGoal } from '@/features/goals/hooks/use-goals';
import { useGoalMutations } from '@/features/goals/hooks/use-goal-mutations';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

export default function LogProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { data: goal } = useGoal(id);
  const { logProgress } = useGoalMutations();

  const [pct, setPct] = useState<number | null>(null);
  const [addCount, setAddCount] = useState(0);
  const [note, setNote] = useState('');

  if (!goal) return null;
  const meta = goalCategoryMeta(goal.category);
  const isCount = goal.progressMode === 'count';

  // Percent mode works on a 0–1 fraction; count mode adds to currentValue.
  const currentPct = Math.round(goal.manualProgress * 100);
  const targetPct = pct ?? currentPct;
  const resultingCount = Math.max(0, goal.currentValue + addCount);

  const resultingFraction = isCount
    ? goal.targetValue && goal.targetValue > 0
      ? Math.min(1, resultingCount / goal.targetValue)
      : 0
    : targetPct / 100;
  const currentFraction = isCount
    ? goal.targetValue && goal.targetValue > 0
      ? Math.min(1, goal.currentValue / goal.targetValue)
      : 0
    : goal.manualProgress;

  const delta = isCount ? addCount : resultingFraction - goal.manualProgress;
  const canSave = isCount ? addCount !== 0 : Math.abs(delta) > 0.001;

  const countStep = goal.targetValue ? Math.max(1, Math.round(goal.targetValue / 20)) : 1;

  const save = () => {
    if (!canSave) return;
    logProgress.mutate({
      goal,
      resultingValue: isCount ? resultingCount : resultingFraction,
      delta,
      note: note.trim() || null,
    });
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-5 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full border border-border bg-surface">
          <X size={17} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="micro">Log Progress</Text>
        <View className="h-8 w-8" />
      </View>

      <ScrollView contentContainerClassName="gap-6 px-5 pt-3 pb-10" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="items-center gap-1">
          <Text className="text-center font-sora-bold text-xl text-foreground">{goal.title}</Text>
          <View className="flex-row items-center gap-2">
            <Text variant="muted">{formatProgressPercent(currentFraction)}</Text>
            <Text style={{ color: meta.tint }}>→</Text>
            <Text className="font-sora-bold" style={{ color: meta.tint }}>
              {formatProgressPercent(resultingFraction)}
            </Text>
            {delta !== 0 && (
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: alpha(meta.tint, 0.15) }}>
                <Text className="font-sora-semibold" style={{ color: meta.tint, fontSize: 12 }}>
                  {isCount ? `${addCount > 0 ? '+' : ''}${addCount} ${goal.unit ?? ''}` : `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}%`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {isCount ? (
          <View className="gap-4 rounded-2xl border border-border bg-card p-5 shadow-e1">
            <View className="flex-row items-center justify-center gap-6">
              <Pressable onPress={() => setAddCount((a) => a - countStep)} className="h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface">
                <Minus size={20} color={colors[scheme].foreground} />
              </Pressable>
              <View className="items-center" style={{ minWidth: 90 }}>
                <Text className="font-sora-extrabold text-3xl" style={{ color: meta.tint, fontVariant: ['tabular-nums'] }}>
                  {resultingCount}
                </Text>
                <Text variant="caption">of {goal.targetValue} {goal.unit ?? ''}</Text>
              </View>
              <Pressable onPress={() => setAddCount((a) => a + countStep)} className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: meta.tint }}>
                <Plus size={20} color="#ffffff" />
              </Pressable>
            </View>
            <View className="flex-row justify-center gap-2">
              {[1, 5, 10].map((n) => (
                <Pressable key={n} onPress={() => setAddCount((a) => a + n)} className="rounded-full border border-border px-3 py-1.5">
                  <Text className="font-sora-medium text-foreground">+{n}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View className="gap-4 rounded-2xl border border-border bg-card p-5 shadow-e1">
            <Text className="text-center font-sora-extrabold text-4xl" style={{ color: meta.tint, fontVariant: ['tabular-nums'] }}>
              {targetPct}%
            </Text>
            <Slider
              value={currentPct}
              minimumValue={0}
              maximumValue={100}
              step={1}
              minimumTrackTintColor={meta.tint}
              maximumTrackTintColor={colors[scheme].border}
              thumbTintColor={meta.tint}
              onValueChange={(v) => setPct(Math.round(v))}
            />
            <View className="flex-row justify-center gap-2">
              {[5, 10, 25].map((n) => (
                <Pressable key={n} onPress={() => setPct(Math.min(100, targetPct + n))} className="rounded-full border border-border px-3 py-1.5">
                  <Text className="font-sora-medium text-foreground">+{n}%</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setPct(100)} className="rounded-full px-3 py-1.5" style={{ backgroundColor: alpha(meta.tint, 0.15) }}>
                <Text className="font-sora-medium" style={{ color: meta.tint }}>
                  100%
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View className="gap-2">
          <Text variant="micro">Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What did you get done?"
            placeholderTextColor={colors[scheme].mutedForeground}
            multiline
            className="min-h-12 rounded-2xl border border-border bg-card px-4 py-3 text-foreground"
          />
        </View>

        <GradientButton label="Save update" tint={meta.tint} onPress={save} disabled={!canSave} />
      </ScrollView>
    </View>
  );
}
