import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Pause, Play, Square, SkipForward } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CelebrationOverlay } from '@/components/ui/celebration-overlay';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { ReflectionSheet } from '@/features/study/components/reflection-sheet';
import { formatStudyDuration, formatTimer } from '@/features/study/services/study-stats';
import { useStudyMutations } from '@/features/study/hooks/use-study-mutations';
import { useStudySubjects } from '@/features/study/hooks/use-study';
import {
  elapsedInPhaseNow,
  focusSecondsNow,
  remainingSeconds,
  targetSeconds,
  useStudyTimerStore,
} from '@/features/study/store/study-timer-store';
import { useColorScheme } from '@/hooks/use-color-scheme';

const FOCUS_TINT = '#8b5cf6';
const BREAK_TINT = '#22c55e';

export default function StudyTimerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const store = useStudyTimerStore();
  const { logSession } = useStudyMutations();
  const { data: subjects = [] } = useStudySubjects();

  const [now, setNow] = useState(() => Date.now());
  const [celebrate, setCelebrate] = useState(false);
  const [reflectOpen, setReflectOpen] = useState(false);
  const [pendingFocusSecs, setPendingFocusSecs] = useState(0);
  const savedRef = useRef(false);

  // Bounce out if opened without an active session (mount-only).
  useEffect(() => {
    if (!useStudyTimerStore.getState().active) router.back();
  }, [router]);

  // 4Hz tick drives the countdown display and phase-completion checks.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  // Ends the session: sub-minute sessions are discarded, otherwise the timer
  // is frozen and the reflection sheet collects an optional focus rating + note
  // before the session is saved.
  const requestFinish = () => {
    if (savedRef.current || reflectOpen) return;
    const s = useStudyTimerStore.getState();
    const focusSecs = Math.round(focusSecondsNow(s, Date.now()));
    if (focusSecs < 60) {
      savedRef.current = true;
      store.reset();
      router.back();
      return;
    }
    s.pause();
    setPendingFocusSecs(focusSecs);
    setReflectOpen(true);
  };

  const commitReflection = (focusRating: number | null, note: string) => {
    if (savedRef.current) return;
    savedRef.current = true;
    const s = useStudyTimerStore.getState();
    logSession.mutate({
      subjectId: s.subjectId,
      logDate: format(new Date(), 'yyyy-MM-dd'),
      startedAt: s.startedAt ?? Date.now(),
      endedAt: Date.now(),
      durationSeconds: pendingFocusSecs,
      mode: s.mode,
      focusRating,
      note: note || null,
    });
    setReflectOpen(false);
    store.reset();
    router.back();
  };

  // Phase-completion handling.
  useEffect(() => {
    const s = useStudyTimerStore.getState();
    if (!s.active || !s.running) return;
    // Stopwatch counts up open-endedly — it never auto-completes.
    if (s.mode === 'stopwatch') return;
    if (remainingSeconds(s, now) > 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (s.phase === 'focus') {
      if (s.mode === 'pomodoro') {
        s.completeFocus();
        setCelebrate(true);
      } else {
        requestFinish();
      }
    } else {
      s.completeBreak();
    }
    // requestFinish / store actions are stable; now is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  if (!store.active) return null;

  const isStopwatch = store.mode === 'stopwatch';
  const isFocus = store.phase === 'focus';
  const tint = isFocus ? FOCUS_TINT : BREAK_TINT;
  const target = targetSeconds(store);
  const elapsed = elapsedInPhaseNow(store, now);
  const remaining = remainingSeconds(store, now);
  // Stopwatch counts up (and its ring sweeps once per minute); timed modes count down.
  const displaySeconds = isStopwatch ? elapsed : remaining;
  const ratio = isStopwatch ? (elapsed % 60) / 60 : target > 0 ? Math.min(1, elapsed / target) : 0;
  const phaseLabel = isStopwatch ? 'Stopwatch' : isFocus ? 'Focus' : 'Break';
  const subject = subjects.find((s) => s.id === store.subjectId) ?? null;
  const totalFocus = focusSecondsNow(store, now);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-1 items-center justify-center gap-10 px-6">
        <View className="items-center gap-1.5">
          <View className="flex-row items-center gap-2 rounded-full px-3 py-1" style={{ backgroundColor: `${tint}1f` }}>
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: tint }} />
            <Text className="font-sora-semibold uppercase tracking-wide" style={{ color: tint, fontSize: 12 }}>
              {phaseLabel}
            </Text>
          </View>
          <Text variant="muted">{subject?.name ?? 'General study'}</Text>
        </View>

        <ProgressRing progress={ratio} size={260} strokeWidth={16} color={tint} duration={300} gradient>
          <View className="items-center gap-1">
            <Text className="font-sora-extrabold text-6xl text-foreground" style={{ fontVariant: ['tabular-nums'] }}>
              {formatTimer(displaySeconds)}
            </Text>
            <Text variant="caption">
              {store.completedPomodoros > 0 ? `${store.completedPomodoros} done · ` : ''}
              {formatStudyDuration(totalFocus)} focused
            </Text>
          </View>
        </ProgressRing>

        <View className="w-full flex-row items-center justify-center gap-4">
          {isFocus ? null : (
            <Pressable
              onPress={() => useStudyTimerStore.getState().completeBreak()}
              className="h-14 w-14 items-center justify-center rounded-full border border-border"
              accessibilityLabel="Skip break"
            >
              <SkipForward size={22} color={colors[scheme].foreground} />
            </Pressable>
          )}

          <Pressable
            onPress={() => (store.running ? store.pause() : store.resume())}
            className="h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: tint }}
            accessibilityLabel={store.running ? 'Pause' : 'Resume'}
          >
            {store.running ? <Pause size={30} color="#ffffff" fill="#ffffff" /> : <Play size={30} color="#ffffff" fill="#ffffff" />}
          </Pressable>

          <Pressable
            onPress={requestFinish}
            className="h-14 w-14 items-center justify-center rounded-full border border-border"
            accessibilityLabel="End session"
          >
            <Square size={20} color={colors[scheme].destructive} fill={colors[scheme].destructive} />
          </Pressable>
        </View>

        <Text variant="caption" className="text-center">
          {isStopwatch
            ? 'Counting up — tap ■ when you’re done.'
            : isFocus
              ? 'Stay with it — the timer keeps running if you leave this screen.'
              : 'Take a breather. Focus resumes automatically.'}
        </Text>
      </View>

      <CelebrationOverlay visible={celebrate} onDone={() => setCelebrate(false)} />
      <ReflectionSheet visible={reflectOpen} focusSeconds={pendingFocusSecs} onSave={commitReflection} />
    </View>
  );
}
