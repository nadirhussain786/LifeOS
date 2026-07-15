export type WidgetId =
  | 'today-tasks'
  | 'habit-row'
  | 'calendar-preview'
  | 'reflect'
  | 'recent-notes'
  | 'water-intake'
  | 'productivity-summary'
  | 'daily-quote';

export type TaskPreview = {
  id: string;
  title: string;
  done: boolean;
  dueLabel?: string;
};

export type TodayTasksData = {
  completedCount: number;
  totalCount: number;
  upcoming: TaskPreview[];
};

export type HabitPreview = {
  id: string;
  name: string;
  emoji: string;
  streak: number;
  doneToday: boolean;
};

export type HabitRowData = {
  habits: HabitPreview[];
};

export type CalendarEventPreview = {
  id: string;
  title: string;
  timeLabel: string;
  colorToken: 'primary' | 'muted' | 'destructive';
};

export type CalendarPreviewData = {
  events: CalendarEventPreview[];
};

export type MoodOption = 'great' | 'good' | 'okay' | 'low' | 'rough';

export type ReflectData = {
  todaysMood: MoodOption | null;
  journalStreak: number;
  hasWrittenToday: boolean;
};

export type NotePreview = {
  id: string;
  title: string;
  snippet: string;
  updatedAt: Date;
};

export type RecentNotesData = {
  notes: NotePreview[];
};

export type WaterIntakeData = {
  currentMl: number;
  goalMl: number;
};

export type ProductivitySummaryData = {
  weeklyCompletionRate: number;
  trend: number[];
};

export type DailyQuoteData = {
  quote: string;
  author: string;
};
