import { create } from 'zustand';

import type { StudyMode } from '@/features/study/types/study.types';

export type TimerPhase = 'focus' | 'break';

type TimerConfig = {
  mode: StudyMode;
  subjectId: string | null;
  focusSeconds: number;
  breakSeconds: number;
};

type StudyTimerState = {
  active: boolean;
  mode: StudyMode;
  phase: TimerPhase;
  subjectId: string | null;
  focusSeconds: number;
  breakSeconds: number;
  running: boolean;
  /** Epoch ms the current running segment began, or null while paused. */
  segmentStart: number | null;
  /** Completed seconds within the current phase, excluding the live segment. */
  elapsedInPhase: number;
  /** Sum of completed focus segments this session (grows on pause & on focus
   * completion); the live focus segment is added on read via focusSecondsNow. */
  focusAccumulated: number;
  startedAt: number | null;
  completedPomodoros: number;

  configureAndStart: (config: TimerConfig) => void;
  pause: () => void;
  resume: () => void;
  completeFocus: () => void;
  completeBreak: () => void;
  reset: () => void;
};

const initial = {
  active: false,
  mode: 'pomodoro' as StudyMode,
  phase: 'focus' as TimerPhase,
  subjectId: null,
  focusSeconds: 25 * 60,
  breakSeconds: 5 * 60,
  running: false,
  segmentStart: null as number | null,
  elapsedInPhase: 0,
  focusAccumulated: 0,
  startedAt: null as number | null,
  completedPomodoros: 0,
};

export const useStudyTimerStore = create<StudyTimerState>((set, get) => ({
  ...initial,

  configureAndStart: (config) => {
    const now = Date.now();
    set({
      ...initial,
      active: true,
      mode: config.mode,
      subjectId: config.subjectId,
      focusSeconds: config.focusSeconds,
      breakSeconds: config.breakSeconds,
      phase: 'focus',
      running: true,
      segmentStart: now,
      startedAt: now,
    });
  },

  pause: () => {
    const state = get();
    if (!state.running || state.segmentStart === null) return;
    const segment = (Date.now() - state.segmentStart) / 1000;
    set({
      running: false,
      segmentStart: null,
      elapsedInPhase: state.elapsedInPhase + segment,
      focusAccumulated: state.phase === 'focus' ? state.focusAccumulated + segment : state.focusAccumulated,
    });
  },

  resume: () => {
    const state = get();
    if (state.running) return;
    set({ running: true, segmentStart: Date.now() });
  },

  // Focus block finished → bank the live segment and roll into a break.
  completeFocus: () => {
    const state = get();
    const segment = state.running && state.segmentStart ? (Date.now() - state.segmentStart) / 1000 : 0;
    set({
      phase: 'break',
      elapsedInPhase: 0,
      segmentStart: Date.now(),
      running: true,
      focusAccumulated: state.focusAccumulated + segment,
      completedPomodoros: state.completedPomodoros + 1,
    });
  },

  // Break finished → back to a fresh focus block.
  completeBreak: () => {
    set({ phase: 'focus', elapsedInPhase: 0, segmentStart: Date.now(), running: true });
  },

  reset: () => set({ ...initial }),
}));

// ---- Pure selectors (compute from timestamps at read time) ----

export function targetSeconds(state: StudyTimerState): number {
  return state.phase === 'focus' ? state.focusSeconds : state.breakSeconds;
}

export function elapsedInPhaseNow(state: StudyTimerState, now: number): number {
  const live = state.running && state.segmentStart ? (now - state.segmentStart) / 1000 : 0;
  return state.elapsedInPhase + live;
}

export function remainingSeconds(state: StudyTimerState, now: number): number {
  return Math.max(0, targetSeconds(state) - elapsedInPhaseNow(state, now));
}

/** Total focused seconds so far this session, including the live focus segment. */
export function focusSecondsNow(state: StudyTimerState, now: number): number {
  const live = state.running && state.phase === 'focus' && state.segmentStart ? (now - state.segmentStart) / 1000 : 0;
  return state.focusAccumulated + live;
}
