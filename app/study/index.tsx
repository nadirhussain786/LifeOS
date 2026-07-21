import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { ChevronLeft, GraduationCap, Minus, NotebookPen, Play, Plus, Settings2, Timer } from 'lucide-react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart, type BarDatum } from '@/components/ui/bar-chart';
import { EmptyState } from '@/components/ui/empty-state';
import { GradientButton } from '@/components/ui/gradient-button';
import { HeroCard } from '@/components/ui/hero-card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { StudyInsightsCard } from '@/features/study/components/study-insights-card';
import { StudyStatsRow } from '@/features/study/components/study-stats-row';
import { StudySessionCard } from '@/features/study/components/study-session-card';
import { SubjectBreakdownList } from '@/features/study/components/subject-breakdown';
import { SubjectPicker } from '@/features/study/components/subject-picker';
import { formatStudyDuration } from '@/features/study/services/study-stats';
import { useStudyInsights } from '@/features/study/hooks/use-study';
import { useStudyMutations } from '@/features/study/hooks/use-study-mutations';
import { useStudyTimerStore } from '@/features/study/store/study-timer-store';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

const RANGE_OPTIONS = [
  { value: 'week' as const, label: 'Week' },
  { value: 'month' as const, label: 'Month' },
];
const MODE_OPTIONS = [
  { value: 'pomodoro' as const, label: 'Pomodoro' },
  { value: 'custom' as const, label: 'Custom' },
  { value: 'stopwatch' as const, label: 'Stopwatch' },
];

type StartMode = 'pomodoro' | 'custom' | 'stopwatch';

export default function StudyScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [mode, setMode] = useState<StartMode>('pomodoro');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState(50);
  const studyTint = moduleTint('study', scheme);

  const { isLoading, stats, trend, breakdown, insights, subjects, settings, dailyGoalSeconds, sessions } = useStudyInsights(
    range === 'week' ? 7 : 30,
  );
  const { addSubject, removeSession } = useStudyMutations();
  const configureAndStart = useStudyTimerStore((s) => s.configureAndStart);
  const timerActive = useStudyTimerStore((s) => s.active);

  const todayRatio = dailyGoalSeconds > 0 ? Math.min(1, stats.todaySeconds / dailyGoalSeconds) : 0;

  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  const chartData: BarDatum[] = trend.map((point) => ({
    label: range === 'week' ? format(parseISO(point.date), 'EEEEE') : format(parseISO(point.date), 'd'),
    value: Math.round(point.seconds / 60),
    color: point.metGoal ? studyTint : alpha(studyTint, 0.4),
  }));

  const start = () => {
    const focusSeconds = mode === 'pomodoro' ? settings.focusMinutes * 60 : mode === 'custom' ? customMinutes * 60 : 0;
    const breakSeconds = mode === 'pomodoro' ? settings.breakMinutes * 60 : 0;
    configureAndStart({ mode, subjectId, focusSeconds, breakSeconds });
    router.push('/study/timer');
  };

  const startLabel = mode === 'pomodoro' ? `Start ${settings.focusMinutes}m focus` : mode === 'custom' ? `Start ${customMinutes}m session` : 'Start stopwatch';

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center justify-between px-5 pb-2">
        <View className="flex-row items-center gap-1">
          <Pressable onPress={() => router.back()} hitSlop={8} className="-ml-1 p-1" accessibilityLabel="Back">
            <ChevronLeft size={24} color={colors[scheme].foreground} />
          </Pressable>
          <Text variant="heading">Study</Text>
        </View>
        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => router.push('/study/log')} hitSlop={8} accessibilityLabel="Log past study time">
            <NotebookPen size={20} color={colors[scheme].foreground} />
          </Pressable>
          <Pressable onPress={() => router.push('/study/settings')} hitSlop={8} accessibilityLabel="Study settings">
            <Settings2 size={20} color={colors[scheme].foreground} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View className="gap-5 px-5 pt-2">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-5 pb-28" showsVerticalScrollIndicator={false}>
          {timerActive && (
            <Pressable
              onPress={() => router.push('/study/timer')}
              className="flex-row items-center gap-3 rounded-2xl bg-study p-4"
            >
              <Timer size={20} color="#ffffff" />
              <Text className="flex-1 font-sora-semibold" style={{ color: '#ffffff' }}>
                Session in progress
              </Text>
              <Text className="font-sora-semibold" style={{ color: '#ffffff' }}>
                Resume →
              </Text>
            </Pressable>
          )}

          <HeroCard tint={studyTint}>
            <View className="items-center gap-1">
              <ProgressRing progress={todayRatio} size={168} strokeWidth={14} color="#ffffff" trackColor={alpha('#ffffff', 0.25)}>
                <View className="items-center">
                  <Text className="font-sora-extrabold text-3xl" style={{ color: '#ffffff', fontVariant: ['tabular-nums'] }}>{formatStudyDuration(stats.todaySeconds)}</Text>
                  <Text style={{ color: alpha('#ffffff', 0.8), fontSize: 12 }}>of {formatStudyDuration(dailyGoalSeconds)} today</Text>
                </View>
              </ProgressRing>
            </View>
          </HeroCard>

          {/* Start a session */}
          <View className="gap-3 rounded-2xl border border-border bg-card p-4 shadow-e1">
            <Text variant="subheading">Start focusing</Text>
            <SubjectPicker
              subjects={subjects}
              value={subjectId}
              onChange={setSubjectId}
              onCreate={(name, colorToken) =>
                addSubject.mutate({ name, colorToken }, { onSuccess: (created) => setSubjectId(created.id) })
              }
            />
            <Segmented options={MODE_OPTIONS} value={mode} onChange={setMode} activeColor={studyTint} />

            {mode === 'custom' && (
              <View className="flex-row items-center justify-between rounded-xl bg-surface px-3 py-2">
                <Text variant="muted">Focus length</Text>
                <View className="flex-row items-center gap-4">
                  <Pressable onPress={() => setCustomMinutes((m) => Math.max(5, m - 5))} hitSlop={6}>
                    <Minus size={18} color={colors[scheme].foreground} />
                  </Pressable>
                  <Text className="font-sora-bold text-foreground" style={{ minWidth: 56, textAlign: 'center' }}>
                    {customMinutes}m
                  </Text>
                  <Pressable onPress={() => setCustomMinutes((m) => Math.min(180, m + 5))} hitSlop={6}>
                    <Plus size={18} color={colors[scheme].foreground} />
                  </Pressable>
                </View>
              </View>
            )}

            <GradientButton label={startLabel} tint={studyTint} icon={Play} onPress={start} />
          </View>

          {sessions.length === 0 ? (
            <View style={{ minHeight: 160 }}>
              <EmptyState
                icon={GraduationCap}
                title="No study time yet"
                description="Start a focus session above, or log time you studied offline — your streak and stats build from here."
                tint={studyTint}
                actionLabel="Log past time"
                onAction={() => router.push('/study/log')}
              />
            </View>
          ) : (
            <>
              <StudyStatsRow stats={stats} />

              <StudyInsightsCard insights={insights} />

              <View className="gap-3 rounded-2xl border border-border bg-card p-4 shadow-e1">
                <View className="flex-row items-center justify-between">
                  <Text variant="subheading">Focus time</Text>
                  <View style={{ width: 160 }}>
                    <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} activeColor={studyTint} />
                  </View>
                </View>
                <BarChart data={chartData} color={studyTint} goalValue={settings.dailyGoalMinutes} labelEvery={range === 'week' ? 1 : 5} height={170} />
              </View>

              {breakdown.length > 0 && (
                <View className="gap-3 rounded-2xl border border-border bg-card p-4 shadow-e1">
                  <Text variant="subheading">By subject · this week</Text>
                  <SubjectBreakdownList breakdown={breakdown} />
                </View>
              )}

              <View className="gap-3">
                <Text variant="subheading">Recent sessions</Text>
                <View className="gap-2.5">
                  {sessions.slice(0, 12).map((session) => (
                    <StudySessionCard
                      key={session.id}
                      session={session}
                      subject={session.subjectId ? (subjectById.get(session.subjectId) ?? null) : null}
                      onLongPress={(s) =>
                        Alert.alert('Delete session?', 'This study session will be removed.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => removeSession.mutate(s.id) },
                        ])
                      }
                    />
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
