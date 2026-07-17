import * as Haptics from 'expo-haptics';
import { Pressable, TextInput, useColorScheme, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors, habitDoneColor } from '@/constants/theme';
import { MOOD_REASONS, type MoodOption } from '@/features/journal/types/journal.types';

const MOODS: { value: MoodOption; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'low', emoji: '😕', label: 'Low' },
  { value: 'rough', emoji: '😣', label: 'Rough' },
];

const ENERGY_LABELS = ['Depleted', 'Low', 'Moderate', 'Energized', 'Peak'] as const;
const STRESS_LABELS = ['Calm', 'Mild', 'Noticeable', 'High', 'Overwhelmed'] as const;
const FOCUS_LABELS = ['Scattered', 'Distracted', 'Steady', 'Sharp', 'Locked in'] as const;
const SLEEP_QUALITY_LABELS = ['Poor', 'Rough', 'Okay', 'Good', 'Great'] as const;

type ScaleRowProps = {
  label: string;
  value: number | null;
  levelLabels: readonly string[];
  onChange: (value: number) => void;
};

function ScaleRow({ label, value, levelLabels, onChange }: ScaleRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const descriptor = value ? levelLabels[value - 1] : null;

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
          {label}
        </Text>
        <Text variant="caption" className="font-sora-medium" style={{ color: descriptor ? colors[scheme].accent : colors[scheme].mutedForeground }}>
          {descriptor ?? 'Not set'}
        </Text>
      </View>
      <View className="flex-row gap-2">
        {[1, 2, 3, 4, 5].map((level) => {
          const selected = value !== null && level <= value;
          const isCurrent = value === level;
          return (
            <Pressable
              key={level}
              onPress={() => {
                Haptics.selectionAsync();
                onChange(level);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: isCurrent }}
              accessibilityLabel={`${label}: ${levelLabels[level - 1]}`}
              className="h-9 flex-1 items-center justify-center rounded-full border"
              style={{
                borderColor: selected ? colors[scheme].accent : colors[scheme].border,
                backgroundColor: selected ? colors[scheme].accent : 'transparent',
              }}
            >
              <Text
                variant="caption"
                className="font-sora-semibold"
                style={{ color: selected ? colors[scheme].accentForeground : colors[scheme].mutedForeground }}
              >
                {level}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type Props = {
  mood: MoodOption | null;
  energy: number | null;
  stress: number | null;
  focus: number | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  moodReasons: string[] | null;
  onChangeMood: (mood: MoodOption) => void;
  onChangeEnergy: (value: number) => void;
  onChangeStress: (value: number) => void;
  onChangeFocus: (value: number) => void;
  onChangeSleepHours: (value: number | null) => void;
  onChangeSleepQuality: (value: number) => void;
  onToggleReason: (reason: string) => void;
};

export function MoodCheckin({
  mood,
  energy,
  stress,
  focus,
  sleepHours,
  sleepQuality,
  moodReasons,
  onChangeMood,
  onChangeEnergy,
  onChangeStress,
  onChangeFocus,
  onChangeSleepHours,
  onChangeSleepQuality,
  onToggleReason,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const reasons = new Set(moodReasons ?? []);

  return (
    <View className="gap-5 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row justify-between" accessibilityRole="radiogroup">
        {MOODS.map((option) => {
          const selected = mood === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChangeMood(option.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={option.label}
              className="items-center gap-1 rounded-2xl px-2 py-2"
              style={{ backgroundColor: selected ? colors[scheme].muted : 'transparent' }}
            >
              <Text className="text-2xl">{option.emoji}</Text>
              <Text variant="caption">{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScaleRow label="Energy" value={energy} levelLabels={ENERGY_LABELS} onChange={onChangeEnergy} />
      <ScaleRow label="Stress" value={stress} levelLabels={STRESS_LABELS} onChange={onChangeStress} />
      <ScaleRow label="Focus" value={focus} levelLabels={FOCUS_LABELS} onChange={onChangeFocus} />
      <ScaleRow label="Sleep quality" value={sleepQuality} levelLabels={SLEEP_QUALITY_LABELS} onChange={onChangeSleepQuality} />

      <View className="flex-row items-center gap-2">
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
          Sleep
        </Text>
        <TextInput
          value={sleepHours !== null ? String(sleepHours) : ''}
          onChangeText={(text) => {
            const parsed = parseFloat(text);
            onChangeSleepHours(Number.isFinite(parsed) ? parsed : null);
          }}
          keyboardType="decimal-pad"
          placeholder="7.5"
          placeholderTextColor={colors[scheme].mutedForeground}
          className="w-16 rounded-lg border border-border px-2 py-1.5 text-center text-foreground"
        />
        <Text variant="muted">hours</Text>
      </View>

      <View className="gap-1.5">
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
          What influenced today?
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {MOOD_REASONS.map((reason) => {
            const selected = reasons.has(reason);
            return (
              <Pressable
                key={reason}
                onPress={() => {
                  Haptics.selectionAsync();
                  onToggleReason(reason);
                }}
                className="rounded-full border px-3 py-1.5"
                style={{
                  borderColor: selected ? habitDoneColor : colors[scheme].border,
                  backgroundColor: selected ? habitDoneColor : 'transparent',
                }}
              >
                <Text
                  variant="caption"
                  className="font-sora-medium capitalize"
                  style={{ color: selected ? '#ffffff' : colors[scheme].mutedForeground }}
                >
                  {reason}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
