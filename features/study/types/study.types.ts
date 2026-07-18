export type StudyMode = 'pomodoro' | 'custom' | 'stopwatch';

export type StudySubject = {
  id: string;
  name: string;
  colorToken: string;
  createdAt: number;
};

export type StudySession = {
  id: string;
  subjectId: string | null;
  logDate: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  mode: StudyMode;
  /** Optional 1–5 self-rated focus quality. */
  focusRating: number | null;
  note: string | null;
  createdAt: number;
};

export type StudySettings = {
  dailyGoalMinutes: number;
  focusMinutes: number;
  breakMinutes: number;
};

export type CreateStudySessionInput = {
  subjectId: string | null;
  logDate: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  mode: StudyMode;
  focusRating?: number | null;
  note?: string | null;
};

/** Time-of-day bucket used to surface when the user focuses best. */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type StudyInsights = {
  /** Mean focused seconds per session. */
  avgSessionSeconds: number;
  /** Mean 1–5 focus rating over rated sessions, or null. */
  avgFocusRating: number | null;
  /** Bucket with the most focused time, with its label — or null if no data. */
  bestTimeOfDay: TimeOfDay | null;
  /** This-week vs last-week focused-seconds change as a ratio (0.15 = +15%),
   * or null when last week had no data to compare against. */
  weekOverWeek: number | null;
  thisWeekSeconds: number;
};

export type StudyStats = {
  todaySeconds: number;
  weekSeconds: number;
  monthSeconds: number;
  totalSeconds: number;
  sessionCount: number;
  /** Consecutive days (ending today or yesterday) with any study time. */
  currentStreak: number;
  bestStreak: number;
};

export type SubjectBreakdown = {
  subject: StudySubject | null;
  seconds: number;
};

export type StudyTrendPoint = {
  date: string;
  seconds: number;
  metGoal: boolean;
};
