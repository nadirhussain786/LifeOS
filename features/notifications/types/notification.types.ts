import type { LucideIcon } from 'lucide-react-native';
import {
  BellRing,
  BookOpen,
  CalendarClock,
  CheckSquare,
  Droplet,
  Moon,
  NotebookPen,
  PartyPopper,
  Repeat,
  Sparkles,
  StickyNote,
  Target,
  Wallet,
} from 'lucide-react-native';

/**
 * Every local notification LifeOS schedules is tagged with one of these
 * categories. The category drives three things: the per-category on/off
 * switch in Notification Settings, whether the notification bypasses quiet
 * hours (time-critical, user-timed ones do), and the icon/label shown in the
 * inbox. Keep this union in sync with CATEGORY_META below.
 */
export type NotificationCategory =
  | 'tasks'
  | 'habits'
  | 'journal'
  | 'water'
  | 'sleep'
  | 'study'
  | 'budget'
  | 'calendar'
  | 'notes'
  | 'goals'
  | 'digest'
  | 'streak';

export type NotificationCategoryMeta = {
  label: string;
  /** Shown under the toggle in Notification Settings. */
  description: string;
  icon: LucideIcon;
  /** Hex tint used for the inbox icon chip and settings row. */
  tint: string;
  /** True for reminders the user explicitly timed or that are time-critical
   * (a task due-time, a calendar event, a debt due date, the bedtime nudge).
   * These fire even inside quiet hours; nudges (water/habits/etc.) are shifted
   * out of the window instead. */
  bypassQuietHours: boolean;
};

export const CATEGORY_META: Record<NotificationCategory, NotificationCategoryMeta> = {
  tasks: {
    label: 'Task reminders',
    description: 'Due-date reminders for your tasks',
    icon: CheckSquare,
    tint: '#6366f1',
    bypassQuietHours: true,
  },
  habits: {
    label: 'Habit nudges',
    description: 'Daily reminders to check in on your habits',
    icon: Repeat,
    tint: '#10b981',
    bypassQuietHours: false,
  },
  journal: {
    label: 'Journal reminder',
    description: "A daily nudge to write today's entry",
    icon: BookOpen,
    tint: '#f59e0b',
    bypassQuietHours: false,
  },
  water: {
    label: 'Hydration reminders',
    description: 'Water nudges on your schedule',
    icon: Droplet,
    tint: '#0ea5e9',
    bypassQuietHours: false,
  },
  sleep: {
    label: 'Bedtime reminder',
    description: 'A nightly wind-down nudge',
    icon: Moon,
    tint: '#8b5cf6',
    bypassQuietHours: true,
  },
  study: {
    label: 'Study reminders',
    description: 'Focus-session and study nudges',
    icon: NotebookPen,
    tint: '#ec4899',
    bypassQuietHours: false,
  },
  budget: {
    label: 'Money reminders',
    description: 'IOU due dates and budget alerts',
    icon: Wallet,
    tint: '#22c55e',
    bypassQuietHours: true,
  },
  calendar: {
    label: 'Calendar events',
    description: 'Reminders before your events',
    icon: CalendarClock,
    tint: '#ef4444',
    bypassQuietHours: true,
  },
  notes: {
    label: 'Note reminders',
    description: 'Reminders you set on a note',
    icon: StickyNote,
    tint: '#eab308',
    bypassQuietHours: true,
  },
  goals: {
    label: 'Goal reminders',
    description: 'Deadline and pace nudges for your goals',
    icon: Target,
    tint: '#14b8a6',
    bypassQuietHours: false,
  },
  digest: {
    label: 'Daily digest',
    description: 'One morning summary of your day',
    icon: Sparkles,
    tint: '#f97316',
    bypassQuietHours: false,
  },
  streak: {
    label: 'Streaks & wins',
    description: 'Streak-at-risk warnings and celebrations',
    icon: PartyPopper,
    tint: '#a855f7',
    bypassQuietHours: false,
  },
};

/** Ordered list of the categories users actually toggle in settings (excludes
 * the always-on internal ones if any). All are user-facing today. */
export const CATEGORY_ORDER: NotificationCategory[] = [
  'tasks',
  'habits',
  'journal',
  'water',
  'sleep',
  'study',
  'budget',
  'calendar',
  'notes',
  'goals',
  'digest',
  'streak',
];

/** Categories that actually schedule something today and therefore get a
 * user-facing switch in Notification Settings. `goals`, `study`, and `streak`
 * exist in the model for planned features but have no scheduler yet, so showing
 * their toggles would be misleading no-ops — they're excluded until built. */
export const CONFIGURABLE_CATEGORIES: NotificationCategory[] = CATEGORY_ORDER.filter(
  (category) => category !== 'goals' && category !== 'study' && category !== 'streak',
);

/** Fallback icon for any category not found in the map (defensive). */
export const FALLBACK_NOTIFICATION_ICON: LucideIcon = BellRing;

/** Payload attached to a scheduled notification's `content.data` so the tap
 * handler can deep-link to the right screen and mark the log row read. */
export type NotificationPayload = {
  category: NotificationCategory;
  /** Deep-link path, e.g. '/task' or '/budget/debts/[id]'. */
  route?: string;
  params?: Record<string, string>;
  /** Row id in notification_log, set when logging is enabled. */
  logId?: string;
};

export type NotificationRepeat = 'none' | 'daily';

/** A row from notification_log, shaped for the inbox UI. */
export type LoggedNotification = {
  id: string;
  notificationId: string | null;
  category: NotificationCategory;
  title: string;
  body: string;
  route: string | null;
  params: Record<string, string> | null;
  scheduledAt: number;
  repeats: NotificationRepeat;
  readAt: number | null;
  canceledAt: number | null;
  createdAt: number;
};

export type LoggedNotificationStatus = 'scheduled' | 'delivered' | 'canceled';

export function notificationStatus(row: Pick<LoggedNotification, 'scheduledAt' | 'canceledAt' | 'repeats'>, now: number): LoggedNotificationStatus {
  if (row.canceledAt) return 'canceled';
  // A daily reminder is always "scheduled" — its scheduledAt is just the next fire.
  if (row.repeats === 'daily') return 'scheduled';
  return row.scheduledAt > now ? 'scheduled' : 'delivered';
}
