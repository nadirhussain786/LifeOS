import * as Haptics from 'expo-haptics';
import { Battery, Moon, Target, Waves } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors, habitDoneColor } from '@/constants/theme';
import { MOOD_EMOJI, MOOD_LABEL, MOOD_TINT } from '@/features/journal/constants';
import { MOOD_REASONS, type MoodOption } from '@/features/journal/types/journal.types';

const MOODS: { value: MoodOption; emoji: string; label: string; tint: string }[] = (
  ['great', 'good', 'okay', 'low', 'rough'] as const
).map((value) => ({ value, emoji: MOOD_EMOJI[value], label: MOOD_LABEL[value], tint: MOOD_TINT[value] }));

const ENERGY_LABELS = ['Depleted', 'Low', 'Moderate', 'Energized', 'Peak'] as const;
const STRESS_LABELS = ['Calm', 'Mild', 'Noticeable', 'High', 'Overwhelmed'] as const;
const FOCUS_LABELS = ['Scattered', 'Distracted', 'Steady', 'Sharp', 'Locked in'] as const;
const SLEEP_QUALITY_LABELS = ['Poor', 'Rough', 'Okay', 'Good', 'Great'] as const;

const ENERGY_TINT = '#22c55e';
const STRESS_TINT = '#f97316';
const FOCUS_TINT = '#0ea5e9';
const SLEEP_TINT = '#8b5cf6';

function MoodButton({ option, selected, onPress }: { option: (typeof MOODS)[number]; selected: boolean; onPress: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const scale = useSharedValue(1);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (selected) scale.value = withSequence(withSpring(1.25, { damping: 7, stiffness: 400 }), withSpring(1, { damping: 9, stiffness: 300 }));
  }, [selected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={option.label}
      className="items-center gap-1.5 rounded-2xl px-2 py-3"
      style={{ backgroundColor: selected ? `${option.tint}1f` : 'transparent' }}
    >
      <Animated.View style={[{ height: 40, alignItems: 'center', justifyContent: 'center' }, animatedStyle]}>
        <Text style={{ fontSize: 28, lineHeight: 34 }}>{option.emoji}</Text>
      </Animated.View>
      <Text variant="caption" className="font-sora-medium" style={{ color: selected ? option.tint : colors[scheme].mutedForeground }}>
        {option.label}
      </Text>
    </Pressable>
  );
}

type ScaleRowProps = {
  icon: typeof Battery;
  label: string;
  value: number | null;
  levelLabels: readonly string[];
  tint: string;
  onChange: (value: number) => void;
};

function ScaleRow({ icon: Icon, label, value, levelLabels, tint, onChange }: ScaleRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const descriptor = value ? levelLabels[value - 1] : null;

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Icon size={13} color={tint} />
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            {label}
          </Text>
        </View>
        <Text variant="caption" className="font-sora-medium" style={{ color: descriptor ? tint : colors[scheme].mutedForeground }}>
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
                borderColor: selected ? tint : colors[scheme].border,
                backgroundColor: selected ? tint : 'transparent',
              }}
            >
              <Text
                variant="caption"
                className="font-sora-semibold"
                style={{ color: selected ? '#ffffff' : colors[scheme].mutedForeground }}
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
  const [sleepHoursText, setSleepHoursText] = useState(sleepHours !== null ? String(sleepHours) : '');
  const reasons = new Set(moodReasons ?? []);

  return (
    <View className="gap-5 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row justify-between" accessibilityRole="radiogroup">
        {MOODS.map((option) => (
          <MoodButton key={option.value} option={option} selected={mood === option.value} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChangeMood(option.value);
          }} />
        ))}
      </View>

      <ScaleRow icon={Battery} label="Energy" value={energy} levelLabels={ENERGY_LABELS} tint={ENERGY_TINT} onChange={onChangeEnergy} />
      <ScaleRow icon={Waves} label="Stress" value={stress} levelLabels={STRESS_LABELS} tint={STRESS_TINT} onChange={onChangeStress} />
      <ScaleRow icon={Target} label="Focus" value={focus} levelLabels={FOCUS_LABELS} tint={FOCUS_TINT} onChange={onChangeFocus} />
      <ScaleRow
        icon={Moon}
        label="Sleep quality"
        value={sleepQuality}
        levelLabels={SLEEP_QUALITY_LABELS}
        tint={SLEEP_TINT}
        onChange={onChangeSleepQuality}
      />

      <View className="flex-row items-center gap-2">
        <Moon size={13} color={SLEEP_TINT} />
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
          Hours slept
        </Text>
        <TextInput
          value={sleepHoursText}
          onChangeText={(text) => {
            setSleepHoursText(text);
            const parsed = parseFloat(text);
            onChangeSleepHours(Number.isFinite(parsed) ? parsed : null);
          }}
          keyboardType="decimal-pad"
          placeholder="7.5"
          placeholderTextColor={colors[scheme].mutedForeground}
          className="w-16 rounded-lg border border-border px-2 py-1.5 text-center text-foreground"
        />
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
