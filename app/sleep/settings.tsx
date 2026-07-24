import { set } from 'date-fns';
import { useRouter } from 'expo-router';
import { BellRing, Minus, Moon, Plus, Sun } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { TimeField } from '@/features/sleep/components/time-field';
import { formatDuration } from '@/features/sleep/services/sleep-stats';
import { useSleepMutations } from '@/features/sleep/hooks/use-sleep-mutations';
import { useSleepSettings } from '@/features/sleep/hooks/use-sleep';
import { CategoryOffNotice } from '@/features/notifications/components/category-off-notice';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { notificationsAvailable } from '@/lib/notifications';

const MIN_GOAL = 240;
const MAX_GOAL = 720;
const STEP = 15;

/** Parses "HH:mm" into a carrier Date; falls back to a sensible default. */
function parseTime(value: string | null, fallbackHour: number): Date {
  if (value && /^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(':').map(Number);
    return set(new Date(), { hours: h, minutes: m, seconds: 0, milliseconds: 0 });
  }
  return set(new Date(), { hours: fallbackHour, minutes: 0, seconds: 0, milliseconds: 0 });
}

function toHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function SleepSettingsScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const sleepTint = moduleTint('sleep', scheme);
  const { data: settings } = useSleepSettings();
  const { saveSettings } = useSleepMutations();

  const [goal, setGoal] = useState(settings?.goalMinutes ?? 480);
  const [bedtime, setBedtime] = useState(() => parseTime(settings?.targetBedtime ?? null, 23));
  const [wake, setWake] = useState(() => parseTime(settings?.targetWakeTime ?? null, 7));
  const [reminderEnabled, setReminderEnabled] = useState(settings?.reminderEnabled ?? false);
  const [seeded, setSeeded] = useState(false);

  if (settings && !seeded) {
    setGoal(settings.goalMinutes);
    setBedtime(parseTime(settings.targetBedtime, 23));
    setWake(parseTime(settings.targetWakeTime, 7));
    setReminderEnabled(settings.reminderEnabled);
    setSeeded(true);
  }

  const adjust = (delta: number) => setGoal((g) => Math.min(MAX_GOAL, Math.max(MIN_GOAL, g + delta)));

  const save = () => {
    saveSettings.mutate({ goalMinutes: goal, targetBedtime: toHHmm(bedtime), targetWakeTime: toHHmm(wake), reminderEnabled });
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Sleep Goal" eyebrow="Sleep" tint={sleepTint} />

      <View className="gap-5 px-5 pt-3">
        <View className="items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-e1">
          <Text variant="micro">Nightly goal</Text>
          <View className="flex-row items-center gap-6">
            <Pressable
              onPress={() => adjust(-STEP)}
              className="h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface"
              accessibilityLabel="Decrease goal"
            >
              <Minus size={20} color={colors[scheme].foreground} />
            </Pressable>
            <Text
              className="font-sora-extrabold text-4xl text-sleep"
              style={{ minWidth: 130, textAlign: 'center', fontVariant: ['tabular-nums'] }}
            >
              {formatDuration(goal)}
            </Text>
            <Pressable
              onPress={() => adjust(STEP)}
              className="h-12 w-12 items-center justify-center rounded-2xl bg-sleep"
              accessibilityLabel="Increase goal"
            >
              <Plus size={20} color="#ffffff" />
            </Pressable>
          </View>
          <Text variant="muted">Adults typically need 7–9 hours.</Text>
        </View>

        <View className="gap-3">
          <Text variant="micro">Target schedule (optional)</Text>
          <View className="flex-row gap-3">
            <TimeField icon={Moon} label="Bedtime" value={bedtime} onChange={setBedtime} tint={sleepTint} />
            <TimeField icon={Sun} label="Wake up" value={wake} onChange={setWake} tint="#f59e0b" />
          </View>
        </View>

        <View className="gap-2">
          <CategoryOffNotice category="sleep" />
          <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-sleep/10">
              <BellRing size={18} color={sleepTint} />
            </View>
            <View className="flex-1">
              <Text className="font-sora-semibold text-foreground">Bedtime reminder</Text>
              <Text variant="caption">Daily nudge at {toHHmm(bedtime)} to start winding down.</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ true: sleepTint, false: colors[scheme].border }}
              thumbColor="#ffffff"
            />
          </View>
          {reminderEnabled && !notificationsAvailable && (
            <Text variant="caption">Reminders aren&apos;t available on this device.</Text>
          )}
        </View>

        <Button label="Save goal" onPress={save} size="lg" variant="accent" />
      </View>
    </View>
  );
}
