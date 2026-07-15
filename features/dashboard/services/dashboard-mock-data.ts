import type {
  CalendarPreviewData,
  DailyQuoteData,
  HabitRowData,
  ProductivitySummaryData,
  ReflectData,
  RecentNotesData,
  TodayTasksData,
  WaterIntakeData,
} from '@/features/dashboard/types/dashboard.types';

/**
 * Interim data source for Phase 1 Dashboard.
 * Tasks/Notes/Habits/Journal/Calendar don't have real tables yet, so each
 * function here returns data shaped exactly like the future Supabase query
 * result. When a module ships, only the fetcher body changes —
 * TODO(<module>): replace with a real Supabase query.
 */
function delay<T>(value: T, ms = 500) {
  return new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
}

// TODO(tasks-module): replace with real Supabase query
export function fetchTodayTasks() {
  return delay<TodayTasksData>({
    completedCount: 3,
    totalCount: 7,
    upcoming: [
      { id: '1', title: 'Review Phase 1 architecture', done: false, dueLabel: '10:00 AM' },
      { id: '2', title: 'Reply to design feedback', done: false, dueLabel: '1:00 PM' },
      { id: '3', title: 'Prep weekly planning notes', done: false },
    ],
  });
}

// TODO(habits-module): replace with real Supabase query
export function fetchHabitRow() {
  return delay<HabitRowData>({
    habits: [
      { id: '1', name: 'Read', emoji: '📖', streak: 12, doneToday: true },
      { id: '2', name: 'Gym', emoji: '🏋️', streak: 4, doneToday: false },
      { id: '3', name: 'Meditate', emoji: '🧘', streak: 7, doneToday: false },
      { id: '4', name: 'Walk', emoji: '🚶', streak: 21, doneToday: true },
    ],
  });
}

// TODO(calendar-module): replace with real Supabase query
export function fetchCalendarPreview() {
  return delay<CalendarPreviewData>({
    events: [
      { id: '1', title: 'Design sync', timeLabel: '11:00 AM', colorToken: 'primary' },
      { id: '2', title: 'Dentist appointment', timeLabel: '4:30 PM', colorToken: 'muted' },
    ],
  });
}

// TODO(journal-module): replace with real Supabase query
export function fetchReflect() {
  return delay<ReflectData>({
    todaysMood: null,
    journalStreak: 5,
    hasWrittenToday: false,
  });
}

// TODO(notes-module): replace with real Supabase query
export function fetchRecentNotes() {
  return delay<RecentNotesData>({
    notes: [
      {
        id: '1',
        title: 'Product roadmap ideas',
        snippet: 'Focus on offline-first sync before adding collaboration features…',
        updatedAt: new Date(Date.now() - 1000 * 60 * 45),
      },
      {
        id: '2',
        title: 'Grocery list',
        snippet: 'Oats, eggs, spinach, coffee…',
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
      },
    ],
  });
}

// TODO(habits-module): water intake will likely live alongside habits
export function fetchWaterIntake() {
  return delay<WaterIntakeData>({ currentMl: 750, goalMl: 2000 });
}

// TODO(tasks-module + habits-module): derive from real completion history
export function fetchProductivitySummary() {
  return delay<ProductivitySummaryData>({
    weeklyCompletionRate: 0.72,
    trend: [0.4, 0.55, 0.6, 0.5, 0.8, 0.65, 0.72],
  });
}

const QUOTES: DailyQuoteData[] = [
  { quote: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { quote: 'Do the hard things first.', author: 'Unknown' },
  { quote: 'Small steps every day.', author: 'Unknown' },
];

export function fetchDailyQuote() {
  const dayIndex = new Date().getDate() % QUOTES.length;
  return delay<DailyQuoteData>(QUOTES[dayIndex], 300);
}
