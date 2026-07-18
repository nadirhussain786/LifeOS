export type GoalCategory = 'fitness' | 'study' | 'finance' | 'career' | 'personal' | 'custom';

export type GoalPriority = 'low' | 'medium' | 'high';

export type GoalStatus = 'active' | 'completed' | 'archived';

export type GoalProgressMode = 'percent' | 'count' | 'milestones';

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  categoryLabel: string | null;
  priority: GoalPriority;
  status: GoalStatus;
  progressMode: GoalProgressMode;
  /** 0–1, authoritative only when progressMode = 'percent'. */
  manualProgress: number;
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
  dueDate: number | null;
  completedAt: number | null;
  position: number;
  createdAt: number;
  updatedAt: number;
};

export type GoalMilestone = {
  id: string;
  goalId: string;
  title: string;
  isCompleted: boolean;
  completedAt: number | null;
  position: number;
  createdAt: number;
};

export type GoalProgressLog = {
  id: string;
  goalId: string;
  /** Resulting cumulative measure in the goal's native scale (0–1 fraction for
   * percent goals, absolute currentValue for count goals). */
  value: number;
  /** Signed change this update applied, in the same native scale. */
  delta: number;
  note: string | null;
  loggedAt: number;
  logDate: string;
  createdAt: number;
};

/** One point on the progress-over-time chart: fraction complete (0–1) at a time. */
export type ProgressPoint = { t: number; v: number };

export type GoalPace = 'ahead' | 'on_track' | 'behind' | 'none';

export type GoalTimeline = {
  hasDeadline: boolean;
  isOverdue: boolean;
  totalDays: number;
  /** 1-based day within the goal window, clamped to [1, totalDays]. */
  dayNumber: number;
  elapsedDays: number;
  remainingDays: number;
  /** Where a perfectly-paced goal would be right now (0–1). */
  expectedProgress: number;
  pace: GoalPace;
  /** Fraction of progress per remaining day needed to finish on time, or null. */
  requiredPerDay: number | null;
};

/** A goal enriched with its computed progress (0–1) and milestone rollup —
 * the shape list and card components actually render. */
export type GoalWithProgress = Goal & {
  progress: number;
  milestoneTotal: number;
  milestoneDone: number;
};

export type CreateGoalInput = {
  title: string;
  description?: string | null;
  category: GoalCategory;
  categoryLabel?: string | null;
  priority: GoalPriority;
  progressMode: GoalProgressMode;
  manualProgress?: number;
  targetValue?: number | null;
  currentValue?: number;
  unit?: string | null;
  dueDate?: number | null;
  milestones?: string[];
};

export type UpdateGoalInput = Partial<
  Pick<
    Goal,
    | 'title'
    | 'description'
    | 'category'
    | 'categoryLabel'
    | 'priority'
    | 'progressMode'
    | 'manualProgress'
    | 'targetValue'
    | 'currentValue'
    | 'unit'
    | 'dueDate'
  >
>;
