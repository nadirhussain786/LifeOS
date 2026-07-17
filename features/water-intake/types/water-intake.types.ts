export type WaterIntakeLog = {
  id: string;
  logDate: string;
  amountMl: number;
  loggedAt: number;
};

export type DailyWaterTotal = {
  date: string;
  totalMl: number;
};

export const REMINDER_INTERVALS_MIN = [30, 60, 90, 120] as const;
export type ReminderIntervalMinutes = (typeof REMINDER_INTERVALS_MIN)[number];

export type WaterReminderSettings = {
  enabled: boolean;
  intervalMinutes: ReminderIntervalMinutes;
  /** 24h clock, inclusive window during which reminders can fire. */
  startHour: number;
  endHour: number;
};
