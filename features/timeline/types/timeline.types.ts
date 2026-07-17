export type TimelineEventType =
  | 'task_completed'
  | 'task_scheduled'
  | 'habit_completed'
  | 'note_created'
  | 'journal_written'
  | 'water_logged'
  | 'calendar_event';

/**
 * One row on the Life Timeline. Timeline is a read-side view, not a source
 * of truth — every event here (except 'calendar_event') is derived live from
 * another module's own timestamped rows, not duplicated into a new table.
 */
export type TimelineEvent = {
  /** Unique across the whole day's list — prefixed by type, not a raw record id. */
  id: string;
  /** The underlying row id in its own module's table (e.g. the calendar_events.id) — use this for actions like delete, not `id`. */
  sourceId: string;
  type: TimelineEventType;
  time: number;
  /** Only ever set for 'calendar_event' — other event types are a single instant. */
  endTime?: number;
  title: string;
  subtitle?: string;
  emoji?: string;
  colorToken?: string;
  linkHref: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  startAt: number;
  endAt: number | null;
  colorToken: string | null;
  notes: string | null;
};

export type CreateCalendarEventInput = {
  title: string;
  startAt: number;
  endAt?: number | null;
  colorToken?: string | null;
  notes?: string | null;
};
