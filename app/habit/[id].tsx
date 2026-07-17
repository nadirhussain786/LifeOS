import { format, parseISO } from 'date-fns';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, ChevronLeft, Clock3, Pencil, Trash2 } from 'lucide-react-native';
import { useRef } from 'react';
import { Pressable, ScrollView, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { colors, habitDoneColor } from '@/constants/theme';
import { QuickLogSheet } from '@/features/habits/components/quick-log-sheet';
import { StreakHeatmap } from '@/features/habits/components/streak-heatmap';
import { useHabit, useHabitLogs } from '@/features/habits/hooks/use-habit';
import { useHabitMutations } from '@/features/habits/hooks/use-habit-mutations';
import { calculateHabitStreaks, toDateKey } from '@/features/habits/services/habit-streaks';
import type { HabitWithToday } from '@/features/habits/types/habit.types';

const QUANTIFIED_TYPES = new Set(['count', 'duration', 'distance', 'time']);

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const quickLogRef = useRef<BottomSheetModal>(null);

  const { data: habit } = useHabit(id);
  const { data: logData } = useHabitLogs(id);
  const { logToday, unlogToday, logDate, archive, remove } = useHabitMutations();

  if (!habit || !logData) return null;

  const { logs, skips } = logData;
  const streaks = calculateHabitStreaks(habit, logs, skips);
  const todayKey = toDateKey(new Date());
  const todayLog = logs.find((log) => log.logDate === todayKey);
  const isQuantified = QUANTIFIED_TYPES.has(habit.type);

  const recentLogs = [...logs].sort((a, b) => b.logDate.localeCompare(a.logDate)).slice(0, 14);

  const habitWithToday: HabitWithToday = {
    ...habit,
    todayStatus: todayLog ? 'done' : 'not_yet',
    todayValue: todayLog?.value ?? null,
    currentStreak: streaks.currentStreak,
    bestStreak: streaks.bestStreak,
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <ChevronLeft size={20} color={colors[scheme].foreground} />
        </Pressable>
        <View className="flex-row gap-4">
          <Pressable onPress={() => router.push(`/timeline/${todayKey}`)} hitSlop={8}>
            <Clock3 size={19} color={colors[scheme].foreground} />
          </Pressable>
          <Pressable onPress={() => router.push(`/habit/${habit.id}/edit`)} hitSlop={8}>
            <Pencil size={19} color={colors[scheme].foreground} />
          </Pressable>
          <Pressable onPress={() => archive.mutate(habit.id)} hitSlop={8}>
            <Archive size={19} color={colors[scheme].foreground} />
          </Pressable>
          <Pressable
            onPress={() => {
              remove.mutate(habit.id);
              router.back();
            }}
            hitSlop={8}
          >
            <Trash2 size={19} color={colors[scheme].destructive} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerClassName="gap-6 px-5 pt-3 pb-10" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3">
          <Text style={{ fontSize: 32 }}>{habit.emoji ?? '🔥'}</Text>
          <Text style={{ fontSize: 24, fontFamily: 'Sora_700Bold' }} className="flex-1 text-foreground">
            {habit.name}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 items-center gap-1 rounded-2xl border border-border bg-card py-4">
            <Text style={{ fontSize: 28, fontFamily: 'Sora_800ExtraBold' }} className="text-foreground">
              {streaks.currentStreak}
            </Text>
            <Text variant="caption">{habit.type === 'negative' ? 'Days without' : 'Current streak'}</Text>
          </View>
          <View className="flex-1 items-center gap-1 rounded-2xl border border-border bg-card py-4">
            <Text style={{ fontSize: 28, fontFamily: 'Sora_800ExtraBold' }} className="text-foreground">
              {streaks.bestStreak}
            </Text>
            <Text variant="caption">Best streak</Text>
          </View>
          <View className="flex-1 items-center gap-1 rounded-2xl border border-border bg-card py-4">
            <Text style={{ fontSize: 28, fontFamily: 'Sora_800ExtraBold' }} className="text-foreground">
              {Math.round(streaks.completionRate30d * 100)}%
            </Text>
            <Text variant="caption">Last 30 days</Text>
          </View>
        </View>

        {isQuantified ? (
          <Pressable
            onPress={() => quickLogRef.current?.present()}
            className="items-center rounded-2xl py-3.5"
            style={{ backgroundColor: habitDoneColor }}
          >
            <Text className="font-sora-semibold" style={{ color: '#ffffff' }}>
              {todayLog ? `Logged ${todayLog.value}${habit.unit ? ` ${habit.unit}` : ''} today · tap to edit` : 'Log today'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => (todayLog ? unlogToday.mutate(habit.id) : logToday.mutate({ habitId: habit.id }))}
            className="items-center rounded-2xl py-3.5"
            style={{ backgroundColor: todayLog ? habitDoneColor : colors[scheme].muted }}
          >
            <Text className="font-sora-semibold" style={{ color: todayLog ? '#ffffff' : colors[scheme].foreground }}>
              {todayLog ? 'Done today ✓' : 'Mark done today'}
            </Text>
          </Pressable>
        )}

        <View className="gap-3">
          <Text variant="subheading">Consistency</Text>
          <StreakHeatmap habit={habit} logs={logs} skips={skips} />
        </View>

        <View className="gap-2">
          <Text variant="subheading">Recent history</Text>
          {recentLogs.length === 0 && <Text variant="muted">No logs yet — mark today done to start the streak.</Text>}
          {recentLogs.map((log) => (
            <Pressable
              key={log.id}
              onPress={() => router.push(`/timeline/${log.logDate}`)}
              className="flex-row items-center justify-between border-t border-border py-2.5"
            >
              <Text variant="muted">{format(parseISO(log.logDate), 'EEE, MMM d')}</Text>
              <Text className="font-sora-medium">{log.value}{habit.unit ? ` ${habit.unit}` : ''}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <QuickLogSheet ref={quickLogRef} habit={habitWithToday} onSubmit={(value) => logDate.mutate({ habitId: habit.id, logDate: todayKey, value })} />
    </View>
  );
}
