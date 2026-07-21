import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { ChevronLeft, Hourglass, Moon, Settings2, Sun } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart, type BarDatum } from '@/components/ui/bar-chart';
import { Fab } from '@/components/ui/fab';
import { HeroCard } from '@/components/ui/hero-card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { SleepSessionCard } from '@/features/sleep/components/sleep-session-card';
import { SleepStatsRow } from '@/features/sleep/components/sleep-stats-row';
import { SleepTrackerCard } from '@/features/sleep/components/sleep-tracker-card';
import { formatClock, formatDuration } from '@/features/sleep/services/sleep-stats';
import { useSleepInsights } from '@/features/sleep/hooks/use-sleep';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

const RANGE_OPTIONS = [
  { value: 'week' as const, label: 'Week' },
  { value: 'month' as const, label: 'Month' },
];

export default function SleepScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<'week' | 'month'>('week');
  const sleepTint = moduleTint('sleep', scheme);

  const { isLoading, stats, trend, latest, goalMinutes, sessions } = useSleepInsights(range === 'week' ? 7 : 30);

  const lastNightRatio = latest ? Math.min(1, latest.durationMinutes / goalMinutes) : 0;

  const chartData: BarDatum[] = trend.map((point) => ({
    label: range === 'week' ? format(parseISO(point.date), 'EEEEE') : format(parseISO(point.date), 'd'),
    value: point.durationMinutes,
    color: point.metGoal ? sleepTint : alpha(sleepTint, 0.4),
  }));

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center justify-between px-5 pb-2">
        <View className="flex-row items-center gap-1">
          <Pressable onPress={() => router.back()} hitSlop={8} className="-ml-1 p-1" accessibilityLabel="Back">
            <ChevronLeft size={24} color={colors[scheme].foreground} />
          </Pressable>
          <Text variant="heading">Sleep</Text>
        </View>
        <Pressable onPress={() => router.push('/sleep/settings')} hitSlop={8} accessibilityLabel="Sleep settings">
          <Settings2 size={20} color={colors[scheme].foreground} />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="gap-5 px-5 pt-2">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-5 pb-28" showsVerticalScrollIndicator={false}>
          {/* Live bedtime tracker — always available, even before any history */}
          <SleepTrackerCard />

          {sessions.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-8">
              <Moon size={26} color={sleepTint} strokeWidth={1.75} />
              <Text variant="subheading" className="text-center">
                No nights logged yet
              </Text>
              <Text variant="muted" className="text-center">
                Use the tracker above tonight, or log a past night to see your patterns and streaks.
              </Text>
              <Pressable onPress={() => router.push('/sleep/log')} className="mt-1 rounded-full bg-sleep px-4 py-2">
                <Text className="font-sora-semibold" style={{ color: '#ffffff' }}>
                  Log a past night
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <HeroCard tint={sleepTint}>
                <View className="items-center gap-3">
                  <ProgressRing progress={lastNightRatio} size={172} strokeWidth={14} color="#ffffff" trackColor={alpha('#ffffff', 0.25)}>
                    <View className="items-center">
                      <Text className="font-sora-extrabold text-3xl" style={{ color: '#ffffff', fontVariant: ['tabular-nums'] }}>
                        {latest ? formatDuration(latest.durationMinutes) : '—'}
                      </Text>
                      <Text style={{ color: alpha('#ffffff', 0.8), fontSize: 12 }}>of {formatDuration(goalMinutes)} goal</Text>
                    </View>
                  </ProgressRing>
                  {latest && (
                    <View className="flex-row items-center gap-2">
                      <Moon size={14} color={alpha('#ffffff', 0.85)} />
                      <Text style={{ color: alpha('#ffffff', 0.9) }}>Last night · {format(parseISO(latest.logDate), 'EEE, MMM d')}</Text>
                    </View>
                  )}
                </View>
              </HeroCard>

              <SleepStatsRow stats={stats} />

              <View className="gap-3 rounded-2xl border border-border bg-card p-4 shadow-e1">
                <View className="flex-row items-center justify-between">
                  <Text variant="subheading">Trend</Text>
                  <View style={{ width: 160 }}>
                    <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} activeColor={sleepTint} />
                  </View>
                </View>
                {chartData.length === 0 ? (
                  <Text variant="muted" className="py-6 text-center">
                    No nights tracked in this range yet.
                  </Text>
                ) : (
                  <BarChart data={chartData} color={sleepTint} goalValue={goalMinutes} labelEvery={range === 'week' ? 1 : 5} height={170} />
                )}
              </View>

              {stats.avgBedtimeMinutes !== null && stats.avgWakeMinutes !== null && (
                <View className="flex-row items-center justify-around rounded-2xl border border-border bg-card p-4 shadow-e1">
                  <View className="items-center gap-1">
                    <Moon size={18} color={sleepTint} />
                    <Text className="font-sora-bold text-foreground">{formatClock(stats.avgBedtimeMinutes)}</Text>
                    <Text variant="caption">Typical bedtime</Text>
                  </View>
                  <View className="h-10 w-px bg-border" />
                  <View className="items-center gap-1">
                    <Sun size={18} color="#f59e0b" />
                    <Text className="font-sora-bold text-foreground">{formatClock(stats.avgWakeMinutes)}</Text>
                    <Text variant="caption">Typical wake</Text>
                  </View>
                  {stats.avgFellAsleepMinutes !== null && (
                    <>
                      <View className="h-10 w-px bg-border" />
                      <View className="items-center gap-1">
                        <Hourglass size={18} color="#22c55e" />
                        <Text className="font-sora-bold text-foreground">{formatDuration(stats.avgFellAsleepMinutes)}</Text>
                        <Text variant="caption">To fall asleep</Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              <View className="gap-3">
                <Text variant="subheading">History</Text>
                <View className="gap-2.5">
                  {sessions.slice(0, 14).map((session) => (
                    <SleepSessionCard
                      key={session.id}
                      session={session}
                      goalMinutes={goalMinutes}
                      onPress={(s) => router.push(`/sleep/log?id=${s.id}`)}
                    />
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}

      <Fab onPress={() => router.push('/sleep/log')} accessibilityLabel="Log sleep" />
    </View>
  );
}
