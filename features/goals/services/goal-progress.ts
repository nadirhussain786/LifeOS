import type { Goal, GoalMilestone } from '@/features/goals/types/goal.types';

/** Clamps any raw ratio into the 0–1 range progress bars and rings expect. */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Single source of truth for a goal's completion ratio (0–1). Which input
 * drives it depends on progressMode, so every surface (card, ring, stats)
 * agrees instead of each recomputing progress its own way:
 *  - percent:    the manual slider value
 *  - count:      current / target
 *  - milestones: completed share of milestones
 * A goal that's been marked completed always reads as 100% regardless of mode.
 */
export function computeGoalProgress(goal: Goal, milestones: GoalMilestone[]): number {
  if (goal.status === 'completed') return 1;

  switch (goal.progressMode) {
    case 'percent':
      return clamp01(goal.manualProgress);
    case 'count':
      return goal.targetValue && goal.targetValue > 0 ? clamp01(goal.currentValue / goal.targetValue) : 0;
    case 'milestones':
      return milestones.length > 0 ? clamp01(milestones.filter((m) => m.isCompleted).length / milestones.length) : 0;
    default:
      return 0;
  }
}

/** A goal is "achievable by completion" — i.e. progress has reached 100% and
 * it isn't already completed/archived — so the detail screen can surface the
 * celebratory finish action at the right moment. */
export function isGoalReadyToComplete(progress: number, goal: Goal): boolean {
  return goal.status === 'active' && progress >= 1;
}
