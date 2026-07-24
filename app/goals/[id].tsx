import { format } from 'date-fns';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, Check, Pencil, Plus, RotateCcw, TrendingUp, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { CelebrationOverlay } from '@/components/ui/celebration-overlay';
import { GradientButton } from '@/components/ui/gradient-button';
import { HeroCard } from '@/components/ui/hero-card';
import { LineChart } from '@/components/ui/line-chart';
import { ProgressRing } from '@/components/ui/progress-ring';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { colors as dsColors, moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { goalCategoryLabel, goalCategoryMeta } from '@/features/goals/config/goal-categories';
import { goalPriorityColor } from '@/features/goals/config/goal-priority';
import { MilestoneTimeline } from '@/features/goals/components/milestone-timeline';
import { formatDueDate, formatProgressPercent } from '@/features/goals/services/goal-format';
import { buildProgressSeries, goalTimeline } from '@/features/goals/services/goal-timeline';
import { useGoal, useGoalMilestones, useGoalProgressLogs } from '@/features/goals/hooks/use-goals';
import { useGoalMutations } from '@/features/goals/hooks/use-goal-mutations';
import type { GoalPace } from '@/features/goals/types/goal.types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

const PACE_META: Record<GoalPace, { label: string; color: string }> = {
  ahead: { label: 'Ahead of pace', color: '#22c55e' },
  on_track: { label: 'On track', color: '#0ea5e9' },
  behind: { label: 'Behind pace', color: '#f59e0b' },
  none: { label: '', color: '#737373' },
};

const WHITE = '#ffffff';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const [celebrate, setCelebrate] = useState(false);

  const { data: goal } = useGoal(id);
  const { data: milestones = [] } = useGoalMilestones(id);
  const { data: logs = [] } = useGoalProgressLogs(id);
  const mutations = useGoalMutations();

  if (!goal) return null;

  const meta = goalCategoryMeta(goal.category);
  const Icon = meta.icon;
  const isCompleted = goal.status === 'completed';
  const isMilestones = goal.progressMode === 'milestones';
  const readyToComplete = !isCompleted && goal.progress >= 1;
  const due = goal.dueDate && !isCompleted ? formatDueDate(goal.dueDate) : null;

  const timeline = goalTimeline(goal, goal.progress);
  const pace = PACE_META[timeline.pace];
  const series = buildProgressSeries(goal, goal.progress, logs, milestones);
  const rangeEnd = goal.dueDate ?? Date.now();
  const showChart = timeline.hasDeadline || logs.length > 0 || milestones.some((m) => m.isCompleted);

  const confirmDelete = () => {
    Alert.alert('Delete goal?', `"${goal.title}" and its history will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => (mutations.remove.mutate(goal.id), router.back()) },
    ]);
  };

  const handleComplete = () => {
    mutations.complete.mutate(goal.id);
    setCelebrate(true);
  };

  const activity = [...logs].sort((a, b) => b.loggedAt - a.loggedAt);
  const formatDelta = (delta: number) =>
    isMilestones || goal.progressMode === 'percent'
      ? `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}%`
      : `${delta > 0 ? '+' : ''}${delta} ${goal.unit ?? ''}`;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        eyebrow="Goals"
        tint={moduleTint('goals', scheme)}
        right={
          <View className="flex-row gap-4">
            <Pressable onPress={() => router.push(`/goals/${goal.id}/edit`)} hitSlop={8} accessibilityLabel="Edit">
              <Pencil size={19} color={colors[scheme].foreground} />
            </Pressable>
            {!isCompleted && (
              <Pressable onPress={() => (mutations.archive.mutate(goal.id), router.back())} hitSlop={8} accessibilityLabel="Archive">
                <Archive size={19} color={colors[scheme].foreground} />
              </Pressable>
            )}
            <Pressable onPress={confirmDelete} hitSlop={8} accessibilityLabel="Delete">
              <Trash2 size={19} color={colors[scheme].destructive} />
            </Pressable>
          </View>
        }
      />

      <ScrollView contentContainerClassName="gap-5 px-5 pt-1 pb-10" showsVerticalScrollIndicator={false}>
        {/* Hero: ring + time/pace */}
        <HeroCard tint={meta.tint}>
          <View className="items-center gap-4">
            <ProgressRing progress={goal.progress} size={158} strokeWidth={13} color={WHITE} trackColor={alpha(WHITE, 0.25)}>
              <View className="items-center">
                <Text className="font-sora-extrabold text-4xl" style={{ color: WHITE, fontVariant: ['tabular-nums'] }}>
                  {formatProgressPercent(goal.progress)}
                </Text>
                <View className="flex-row items-center gap-1">
                  <Icon size={12} color={alpha(WHITE, 0.9)} />
                  <Text style={{ color: alpha(WHITE, 0.9), fontSize: 12 }} className="font-sora-semibold">
                    {goalCategoryLabel(goal.category, goal.categoryLabel)}
                  </Text>
                </View>
              </View>
            </ProgressRing>

            {timeline.hasDeadline && !isCompleted ? (
              <View className="w-full flex-row rounded-2xl p-3" style={{ backgroundColor: alpha(WHITE, 0.15) }}>
                {[
                  { value: `Day ${timeline.dayNumber}`, label: `of ${timeline.totalDays}` },
                  { value: timeline.isOverdue ? 'Overdue' : `${timeline.remainingDays}`, label: timeline.isOverdue ? '' : 'days left' },
                  { value: pace.label.split(' ')[0], label: pace.label.split(' ').slice(1).join(' ') },
                ].map((stat, i) => (
                  <View key={i} className="flex-1 items-center gap-0.5">
                    <Text className="font-sora-bold" style={{ color: WHITE }}>
                      {stat.value}
                    </Text>
                    <Text style={{ color: alpha(WHITE, 0.8), fontSize: 11 }}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: alpha(WHITE, 0.9) }} className="font-sora-medium">
                {isCompleted ? 'Completed 🎉' : 'No deadline set'}
              </Text>
            )}
          </View>
        </HeroCard>

        {/* Title */}
        <View className="gap-1">
          <Text className="font-sora-bold text-2xl text-foreground">{goal.title}</Text>
          {goal.description ? <Text variant="muted">{goal.description}</Text> : null}
          <View className="mt-1 flex-row items-center gap-3">
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: goalPriorityColor(goal.priority) }} />
              <Text variant="caption" className="capitalize">
                {goal.priority} priority
              </Text>
            </View>
            {due && (
              <Text
                variant="caption"
                className={due.state === 'later' ? undefined : due.state === 'overdue' ? 'text-destructive' : 'text-warning'}
              >
                {due.label}
              </Text>
            )}
          </View>
        </View>

        {/* Completed banner + reopen */}
        {isCompleted && (
          <View className="gap-3 rounded-2xl border border-border bg-card p-4 shadow-e1">
            <View className="flex-row items-center gap-2">
              <Check size={18} color={dsColors[scheme].success} />
              <Text className="font-sora-semibold text-foreground">
                Completed{goal.completedAt ? ` on ${format(goal.completedAt, 'MMM d, yyyy')}` : ''}
              </Text>
            </View>
            <Pressable onPress={() => mutations.reopen.mutate(goal.id)} className="flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-3">
              <RotateCcw size={16} color={colors[scheme].foreground} />
              <Text className="font-sora-medium">Reopen goal</Text>
            </Pressable>
          </View>
        )}

        {/* Primary action: log progress (percent/count, active only) */}
        {!isCompleted && !isMilestones && (
          <GradientButton label="Log progress" tint={meta.tint} icon={Plus} onPress={() => router.push(`/goals/${goal.id}/log`)} />
        )}

        {/* Progress chart — shown for active and completed goals so the history
            stays visible after finishing. */}
        {showChart && (
          <View className="gap-3 rounded-2xl border border-border bg-card p-4 shadow-e1">
            <View className="flex-row items-center justify-between">
              <Text variant="subheading">Progress over time</Text>
              {timeline.hasDeadline && !isCompleted && (
                <View className="flex-row items-center gap-1.5">
                  <View className="h-0.5 w-4" style={{ backgroundColor: colors[scheme].mutedForeground }} />
                  <Text variant="caption">expected</Text>
                </View>
              )}
            </View>
            <LineChart series={series} color={meta.tint} rangeStart={goal.createdAt} rangeEnd={rangeEnd} showExpected={timeline.hasDeadline && !isCompleted} height={150} />
            {!isCompleted && timeline.requiredPerDay !== null && timeline.pace === 'behind' && (
              <View className="flex-row items-center gap-1.5 rounded-xl px-3 py-2" style={{ backgroundColor: alpha(dsColors[scheme].warning, 0.12) }}>
                <TrendingUp size={14} color={dsColors[scheme].warning} />
                <Text variant="caption" className="text-warning">
                  Aim for {Math.max(1, Math.round(timeline.requiredPerDay * 100))}% per day to finish on time.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Milestones */}
        {isMilestones && (
          <View className="gap-3">
            <Text variant="subheading">Milestones</Text>
            <MilestoneTimeline
              milestones={milestones}
              tint={meta.tint}
              onToggle={(m) => mutations.toggleMilestone.mutate({ id: m.id, isCompleted: !m.isCompleted })}
              onAdd={(title) => mutations.addMilestone.mutate({ goalId: goal.id, title })}
              onRemove={(m) => mutations.removeMilestone.mutate(m.id)}
            />
          </View>
        )}

        {/* Activity feed */}
        {!isMilestones && activity.length > 0 && (
          <View className="gap-3">
            <SectionHeader title="Activity" />
            <View className="gap-2.5">
              {activity.map((log) => (
                <Pressable
                  key={log.id}
                  onLongPress={() => mutations.removeProgressLog.mutate(log.id)}
                  className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-e1"
                  accessibilityHint="Long-press to delete this update"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: alpha(meta.tint, 0.15) }}>
                    <TrendingUp size={16} color={meta.tint} />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="font-sora-medium text-foreground">{log.note?.trim() || 'Progress update'}</Text>
                    <Text variant="caption">{format(log.loggedAt, 'EEE, MMM d · h:mm a')}</Text>
                  </View>
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: alpha(log.delta >= 0 ? dsColors[scheme].success : dsColors[scheme].error, 0.14) }}>
                    <Text className="font-sora-bold" style={{ color: log.delta >= 0 ? dsColors[scheme].success : dsColors[scheme].error, fontSize: 12 }}>
                      {formatDelta(log.delta)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Complete (active only) */}
        {!isCompleted &&
          (readyToComplete ? (
            <GradientButton label="Complete goal 🎉" tint={dsColors[scheme].success} icon={Check} onPress={handleComplete} />
          ) : (
            <Pressable onPress={handleComplete} className="flex-row items-center justify-center gap-2 rounded-2xl border border-border py-4">
              <Check size={18} color={colors[scheme].foreground} />
              <Text className="font-sora-semibold text-foreground">Mark as complete</Text>
            </Pressable>
          ))}
      </ScrollView>

      <CelebrationOverlay visible={celebrate} onDone={() => setCelebrate(false)} />
    </View>
  );
}
