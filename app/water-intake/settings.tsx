import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, Minus, Plus, Target } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AttributeRow } from '@/components/ui/attribute-row';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { cancelWaterReminders, scheduleWaterReminders } from '@/features/water-intake/services/water-reminders';
import { GOAL_PRESETS_ML, useWaterSettingsStore } from '@/features/water-intake/store/water-settings-store';
import { REMINDER_INTERVALS_MIN } from '@/features/water-intake/types/water-intake.types';

const WATER_TINT = '#0ea5e9';

function formatHour(hour: number) {
  const period = hour < 12 ? 'AM' : 'PM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period}`;
}

function HourStepper({ label, hour, onChange }: { label: string; hour: number; onChange: (hour: number) => void }) {
  const scheme = useColorScheme() ?? 'light';
  return (
    <View className="flex-1 items-center gap-1.5">
      <Text variant="caption">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => onChange(Math.max(0, hour - 1))}
          className="h-8 w-8 items-center justify-center rounded-full border border-border"
        >
          <Minus size={14} color={colors[scheme].foreground} />
        </Pressable>
        <Text className="w-20 text-center font-sora-semibold">{formatHour(hour)}</Text>
        <Pressable
          onPress={() => onChange(Math.min(23, hour + 1))}
          className="h-8 w-8 items-center justify-center rounded-full border border-border"
        >
          <Plus size={14} color={colors[scheme].foreground} />
        </Pressable>
      </View>
    </View>
  );
}

export default function WaterSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';

  const goalMl = useWaterSettingsStore((state) => state.goalMl);
  const setGoal = useWaterSettingsStore((state) => state.setGoal);
  const reminders = useWaterSettingsStore((state) => state.reminders);
  const scheduledNotificationIds = useWaterSettingsStore((state) => state.scheduledNotificationIds);
  const setReminders = useWaterSettingsStore((state) => state.setReminders);

  const [draft, setDraft] = useState(reminders);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (draft.enabled && draft.startHour >= draft.endHour) {
      Alert.alert('Check your times', 'The start of your reminder window needs to be before the end.');
      return;
    }

    setSaving(true);
    await cancelWaterReminders(scheduledNotificationIds);
    const newIds = await scheduleWaterReminders(draft);
    setSaving(false);

    if (draft.enabled && newIds.length === 0) {
      Alert.alert('Notifications disabled', 'Enable notifications for LifeOS in your device settings to get water reminders.');
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReminders(draft, newIds);
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <ChevronLeft size={20} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
          Water Settings
        </Text>
        <View className="h-8 w-8" />
      </View>

      <ScrollView contentContainerClassName="gap-6 px-5 pt-3 pb-10" showsVerticalScrollIndicator={false}>
        <View className="rounded-2xl border border-border bg-card px-4">
          <AttributeRow icon={Target} label="Daily goal" isFirst>
            <View className="flex-row flex-wrap gap-2">
              {GOAL_PRESETS_ML.map((ml) => {
                const selected = ml === goalMl;
                return (
                  <Pressable
                    key={ml}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setGoal(ml);
                    }}
                    className="rounded-full border px-3 py-1.5"
                    style={{ borderColor: selected ? WATER_TINT : colors[scheme].border, backgroundColor: selected ? WATER_TINT : 'transparent' }}
                  >
                    <Text
                      variant="caption"
                      className="font-sora-medium"
                      style={{ color: selected ? '#ffffff' : colors[scheme].mutedForeground }}
                    >
                      {(ml / 1000).toFixed(1)}L
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </AttributeRow>
        </View>

        <View className="gap-3 rounded-2xl border border-border bg-card p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Bell size={16} color={colors[scheme].mutedForeground} />
              <Text className="font-sora-semibold">Reminders</Text>
            </View>
            <Switch
              value={draft.enabled}
              onValueChange={(enabled) => setDraft((prev) => ({ ...prev, enabled }))}
              trackColor={{ true: WATER_TINT, false: colors[scheme].border }}
            />
          </View>

          {draft.enabled && (
            <View className="gap-4 pt-1">
              <View className="gap-1.5">
                <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
                  Remind me every
                </Text>
                <View className="flex-row gap-2">
                  {REMINDER_INTERVALS_MIN.map((minutes) => {
                    const selected = draft.intervalMinutes === minutes;
                    return (
                      <Pressable
                        key={minutes}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setDraft((prev) => ({ ...prev, intervalMinutes: minutes }));
                        }}
                        className="flex-1 items-center rounded-full border py-1.5"
                        style={{ borderColor: selected ? WATER_TINT : colors[scheme].border, backgroundColor: selected ? WATER_TINT : 'transparent' }}
                      >
                        <Text
                          variant="caption"
                          className="font-sora-medium"
                          style={{ color: selected ? '#ffffff' : colors[scheme].mutedForeground }}
                        >
                          {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="flex-row gap-3">
                <HourStepper label="From" hour={draft.startHour} onChange={(startHour) => setDraft((prev) => ({ ...prev, startHour }))} />
                <HourStepper label="Until" hour={draft.endHour} onChange={(endHour) => setDraft((prev) => ({ ...prev, endHour }))} />
              </View>

              <Text variant="muted">
                You&apos;ll get a nudge every {draft.intervalMinutes < 60 ? `${draft.intervalMinutes} minutes` : `${draft.intervalMinutes / 60} hour${draft.intervalMinutes > 60 ? 's' : ''}`} between{' '}
                {formatHour(draft.startHour)} and {formatHour(draft.endHour)}.
              </Text>
            </View>
          )}
        </View>

        <Button label={saving ? 'Saving…' : 'Save'} onPress={handleSave} disabled={saving} size="lg" variant="accent" />
      </ScrollView>
    </View>
  );
}
