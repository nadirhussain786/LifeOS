export type SleepSession = {
  id: string;
  logDate: string;
  bedtime: number;
  wakeTime: number;
  /** Time in bed (wake − bed), in minutes. */
  durationMinutes: number;
  /** Minutes it took to fall asleep (sleep latency), or null if not recorded. */
  fellAsleepMinutes: number | null;
  quality: number | null;
  note: string | null;
  createdAt: number;
  updatedAt: number;
};

/** Actual time asleep = time in bed − time to fall asleep. */
export function asleepMinutes(session: Pick<SleepSession, 'durationMinutes' | 'fellAsleepMinutes'>): number {
  return Math.max(0, session.durationMinutes - (session.fellAsleepMinutes ?? 0));
}

export type SleepSettings = {
  goalMinutes: number;
  targetBedtime: string | null;
  targetWakeTime: string | null;
  reminderEnabled: boolean;
};

export type CreateSleepInput = {
  logDate: string;
  bedtime: number;
  wakeTime: number;
  fellAsleepMinutes?: number | null;
  quality?: number | null;
  note?: string | null;
};

export type UpdateSleepInput = Partial<
  Pick<SleepSession, 'bedtime' | 'wakeTime' | 'fellAsleepMinutes' | 'quality' | 'note' | 'logDate'>
>;

export type SleepStats = {
  nightsTracked: number;
  /** Mean duration over the window, in minutes. */
  avgDurationMinutes: number;
  /** Consecutive most-recent nights meeting the goal, counting back from the
   * latest tracked night. */
  currentStreak: number;
  bestStreak: number;
  /** 0–1 regularity score derived from bedtime variance — 1 = perfectly
   * consistent bedtimes, degrading as they scatter. */
  consistency: number;
  goalMetCount: number;
  /** Mean bedtime and wake as minutes-past-midnight, for the "typical night". */
  avgBedtimeMinutes: number | null;
  avgWakeMinutes: number | null;
  /** Mean time-to-fall-asleep over nights that recorded it, or null. */
  avgFellAsleepMinutes: number | null;
};

/** One bar in a duration chart. */
export type SleepTrendPoint = {
  date: string;
  durationMinutes: number;
  metGoal: boolean;
};
