import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const taskCategories = sqliteTable('task_categories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  colorToken: text('color_token').notNull(),
  icon: text('icon').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  notes: text('notes'),
  status: text('status', { enum: ['todo', 'in_progress', 'completed', 'archived'] })
    .notNull()
    .default('todo'),
  priority: text('priority', { enum: ['none', 'low', 'medium', 'high'] })
    .notNull()
    .default('none'),
  categoryId: text('category_id').references(() => taskCategories.id),
  dueDate: integer('due_date'),
  hasDueTime: integer('has_due_time', { mode: 'boolean' }).notNull().default(false),
  recurrenceFrequency: text('recurrence_frequency', {
    enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
  })
    .notNull()
    .default('none'),
  recurrenceParentId: text('recurrence_parent_id'),
  completedAt: integer('completed_at'),
  position: integer('position').notNull().default(0),
  reminderEnabled: integer('reminder_enabled', { mode: 'boolean' }).notNull().default(false),
  reminderNotificationId: text('reminder_notification_id'),
  sourceNoteId: text('source_note_id'),
  habitId: text('habit_id'),
  habitLogDate: text('habit_log_date'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] })
    .notNull()
    .default('pending'),
  serverUpdatedAt: integer('server_updated_at'),
});

export const noteCategories = sqliteTable('note_categories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  colorToken: text('color_token').notNull(),
  icon: text('icon').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull().default(''),
  body: text('body'),
  categoryId: text('category_id').references(() => noteCategories.id),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  wordCount: integer('word_count').notNull().default(0),
  reminderAt: integer('reminder_at'),
  reminderNotificationId: text('reminder_notification_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] })
    .notNull()
    .default('pending'),
  serverUpdatedAt: integer('server_updated_at'),
});

export const noteTags = sqliteTable('note_tags', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  colorToken: text('color_token'),
  createdAt: integer('created_at').notNull(),
});

export const noteTagLinks = sqliteTable('note_tag_links', {
  noteId: text('note_id').notNull(),
  tagId: text('tag_id').notNull(),
});

export const noteAttachments = sqliteTable('note_attachments', {
  id: text('id').primaryKey(),
  noteId: text('note_id').notNull(),
  userId: text('user_id').notNull(),
  kind: text('kind', { enum: ['image', 'audio', 'pdf', 'file'] }).notNull(),
  uri: text('uri').notNull(),
  thumbnailUri: text('thumbnail_uri'),
  durationMs: integer('duration_ms'),
  sizeBytes: integer('size_bytes'),
  createdAt: integer('created_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const habitCategories = sqliteTable('habit_categories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  colorToken: text('color_token').notNull(),
  icon: text('icon').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  emoji: text('emoji'),
  categoryId: text('category_id').references(() => habitCategories.id),
  colorToken: text('color_token'),
  type: text('type', {
    enum: ['boolean', 'count', 'duration', 'distance', 'time', 'negative'],
  })
    .notNull()
    .default('boolean'),
  unit: text('unit'),
  targetValue: real('target_value'),
  scheduleType: text('schedule_type', {
    enum: ['daily', 'weekly', 'monthly', 'custom_days', 'every_x_days', 'flexible'],
  })
    .notNull()
    .default('daily'),
  scheduleDays: text('schedule_days'),
  scheduleIntervalDays: integer('schedule_interval_days'),
  reminderTime: text('reminder_time'),
  reminderAdaptive: integer('reminder_adaptive', { mode: 'boolean' }).notNull().default(false),
  reminderNotificationId: text('reminder_notification_id'),
  position: integer('position').notNull().default(0),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] })
    .notNull()
    .default('pending'),
  serverUpdatedAt: integer('server_updated_at'),
});

export const habitLogs = sqliteTable('habit_logs', {
  id: text('id').primaryKey(),
  habitId: text('habit_id').notNull(),
  userId: text('user_id').notNull(),
  logDate: text('log_date').notNull(),
  value: real('value').notNull().default(1),
  note: text('note'),
  loggedAt: integer('logged_at').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const habitSkips = sqliteTable('habit_skips', {
  id: text('id').primaryKey(),
  habitId: text('habit_id').notNull(),
  logDate: text('log_date').notNull(),
  reason: text('reason', { enum: ['skip', 'vacation'] }).notNull(),
  createdAt: integer('created_at').notNull(),
});

/** A named, ordered chain of habits — "Wake Up → Drink Water → Meditate." */
export const habitRoutines = sqliteTable('habit_routines', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const habitRoutineItems = sqliteTable('habit_routine_items', {
  routineId: text('routine_id').notNull(),
  habitId: text('habit_id').notNull(),
  position: integer('position').notNull().default(0),
});

export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  entryDate: text('entry_date').notNull(),
  body: text('body').notNull().default(''),
  mood: text('mood', { enum: ['great', 'good', 'okay', 'low', 'rough'] }),
  energy: integer('energy'),
  stress: integer('stress'),
  focus: integer('focus'),
  sleepHours: real('sleep_hours'),
  sleepQuality: integer('sleep_quality'),
  moodReasons: text('mood_reasons'),
  locationLabel: text('location_label'),
  locationLat: real('location_lat'),
  locationLng: real('location_lng'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] })
    .notNull()
    .default('pending'),
  serverUpdatedAt: integer('server_updated_at'),
});

export const journalPrompts = sqliteTable('journal_prompts', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  text: text('text').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const journalReflections = sqliteTable('journal_reflections', {
  id: text('id').primaryKey(),
  entryId: text('entry_id').notNull(),
  promptId: text('prompt_id').notNull(),
  answerText: text('answer_text').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const journalAttachments = sqliteTable('journal_attachments', {
  id: text('id').primaryKey(),
  entryId: text('entry_id').notNull(),
  userId: text('user_id').notNull(),
  kind: text('kind', { enum: ['image', 'audio', 'pdf', 'file'] }).notNull(),
  uri: text('uri').notNull(),
  thumbnailUri: text('thumbnail_uri'),
  durationMs: integer('duration_ms'),
  createdAt: integer('created_at').notNull(),
  deletedAt: integer('deleted_at'),
});

/** Cross-module reference graph — the literal implementation of "everything
 * is connected." A note→task conversion, a task completing a habit, a
 * journal entry referencing a note, and note backlinks all write rows here
 * instead of each pair getting its own bespoke join table. */
export const entryLinks = sqliteTable('entry_links', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  sourceType: text('source_type', {
    enum: ['journal_entry', 'note', 'task', 'habit'],
  }).notNull(),
  sourceId: text('source_id').notNull(),
  targetType: text('target_type', {
    enum: ['journal_entry', 'note', 'task', 'habit'],
  }).notNull(),
  targetId: text('target_id').notNull(),
  relation: text('relation', {
    enum: ['mentions', 'completed_by', 'generated_from', 'logged_by'],
  }).notNull(),
  createdAt: integer('created_at').notNull(),
});

/** Standalone scheduled events — the one genuinely new source of truth the
 * Life Timeline needs. Everything else the Timeline shows (completed tasks,
 * habit logs, notes, journal entries) already has a home in its own module's
 * table; an appointment or meeting doesn't, so it lives here. */
export const calendarEvents = sqliteTable('calendar_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  startAt: integer('start_at').notNull(),
  endAt: integer('end_at'),
  colorToken: text('color_token'),
  notes: text('notes'),
  reminderMinutesBefore: integer('reminder_minutes_before'),
  reminderNotificationId: text('reminder_notification_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

/** One row per "add water" action (not an upsert-by-day total) — an append-only
 * log, same shape as habit_logs, so history/undo-last/Life-Timeline all fall
 * out of the same real timestamped rows instead of a single mutable counter. */
export const waterIntakeLogs = sqliteTable('water_intake_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  logDate: text('log_date').notNull(),
  amountMl: integer('amount_ml').notNull(),
  loggedAt: integer('logged_at').notNull(),
  createdAt: integer('created_at').notNull(),
});

/** A song imported from the device's own file storage — `uri` points at a
 * copy inside the app's sandboxed document directory (not the original
 * picked file, whose URI/permission isn't guaranteed to survive a relaunch). */
export const songs = sqliteTable('songs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  artist: text('artist'),
  uri: text('uri').notNull(),
  durationMs: integer('duration_ms'),
  addedAt: integer('added_at').notNull(),
  createdAt: integer('created_at').notNull(),
  deletedAt: integer('deleted_at'),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] })
    .notNull()
    .default('pending'),
  serverUpdatedAt: integer('server_updated_at'),
});

export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  colorToken: text('color_token'),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] })
    .notNull()
    .default('pending'),
  serverUpdatedAt: integer('server_updated_at'),
});

export const playlistSongs = sqliteTable('playlist_songs', {
  playlistId: text('playlist_id').notNull(),
  songId: text('song_id').notNull(),
  position: integer('position').notNull().default(0),
});

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category', {
    enum: ['fitness', 'study', 'finance', 'career', 'personal', 'custom'],
  })
    .notNull()
    .default('personal'),
  /** Free-text label shown when category is 'custom'. */
  categoryLabel: text('category_label'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] })
    .notNull()
    .default('medium'),
  status: text('status', { enum: ['active', 'completed', 'archived'] })
    .notNull()
    .default('active'),
  /** How progress is derived: a manual 0–1 slider, a numeric current/target,
   * or the completed share of the goal's milestones. */
  progressMode: text('progress_mode', { enum: ['percent', 'count', 'milestones'] })
    .notNull()
    .default('percent'),
  /** 0–1, authoritative only when progressMode = 'percent'. */
  manualProgress: real('manual_progress').notNull().default(0),
  targetValue: real('target_value'),
  currentValue: real('current_value').notNull().default(0),
  unit: text('unit'),
  dueDate: integer('due_date'),
  completedAt: integer('completed_at'),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] })
    .notNull()
    .default('pending'),
  serverUpdatedAt: integer('server_updated_at'),
});

export const goalMilestones = sqliteTable('goal_milestones', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  completedAt: integer('completed_at'),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

/** Append-only history of progress updates for a goal — one row per check-in.
 * Powers the progress-over-time chart, the activity feed, and pace stats.
 * `value` is the resulting cumulative measure in the goal's native scale
 * (fraction 0–1 for percent goals, the absolute currentValue for count goals);
 * `delta` is the signed change this update applied. */
export const goalProgressLogs = sqliteTable('goal_progress_logs', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull(),
  userId: text('user_id').notNull(),
  value: real('value').notNull(),
  delta: real('delta').notNull().default(0),
  note: text('note'),
  loggedAt: integer('logged_at').notNull(),
  logDate: text('log_date').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const sleepSessions = sqliteTable('sleep_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  /** The night's date key (yyyy-MM-dd), attributed to the wake-up day. One
   * primary session per date (unique index). */
  logDate: text('log_date').notNull(),
  bedtime: integer('bedtime').notNull(),
  wakeTime: integer('wake_time').notNull(),
  /** Cached wake−bed span in minutes so lists/charts don't recompute it. This
   * is time IN BED; subtract fellAsleepMinutes for actual time asleep. */
  durationMinutes: integer('duration_minutes').notNull(),
  /** Optional minutes it took to fall asleep (sleep latency). */
  fellAsleepMinutes: integer('fell_asleep_minutes'),
  /** Optional 1–5 self-rating. */
  quality: integer('quality'),
  note: text('note'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] })
    .notNull()
    .default('pending'),
  serverUpdatedAt: integer('server_updated_at'),
});

/** Single-row-per-user sleep preferences (goal + target times). */
export const sleepSettings = sqliteTable('sleep_settings', {
  userId: text('user_id').primaryKey(),
  goalMinutes: integer('goal_minutes').notNull().default(480),
  /** "HH:mm" target bedtime / wake, optional aspirational anchors. */
  targetBedtime: text('target_bedtime'),
  targetWakeTime: text('target_wake_time'),
  /** Daily bedtime reminder scheduled at targetBedtime. */
  reminderEnabled: integer('reminder_enabled', { mode: 'boolean' }).notNull().default(false),
  reminderNotificationId: text('reminder_notification_id'),
  updatedAt: integer('updated_at').notNull(),
});

export const studySubjects = sqliteTable('study_subjects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  colorToken: text('color_token').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const studySessions = sqliteTable('study_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  subjectId: text('subject_id'),
  logDate: text('log_date').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at').notNull(),
  /** Actual focused seconds (excludes paused time and breaks). */
  durationSeconds: integer('duration_seconds').notNull(),
  mode: text('mode', { enum: ['pomodoro', 'custom', 'stopwatch'] })
    .notNull()
    .default('pomodoro'),
  /** Optional 1–5 self-rated focus quality for the session. */
  focusRating: integer('focus_rating'),
  note: text('note'),
  createdAt: integer('created_at').notNull(),
  deletedAt: integer('deleted_at'),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] })
    .notNull()
    .default('pending'),
  serverUpdatedAt: integer('server_updated_at'),
});

/** Single-row-per-user study preferences (daily goal + pomodoro lengths). */
export const studySettings = sqliteTable('study_settings', {
  userId: text('user_id').primaryKey(),
  dailyGoalMinutes: integer('daily_goal_minutes').notNull().default(120),
  focusMinutes: integer('focus_minutes').notNull().default(25),
  breakMinutes: integer('break_minutes').notNull().default(5),
  updatedAt: integer('updated_at').notNull(),
});

export const budgetTransactions = sqliteTable('budget_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type', { enum: ['income', 'expense', 'savings'] }).notNull(),
  /** Money is stored as integer minor units (cents) — never floats. */
  amountCents: integer('amount_cents').notNull(),
  /** Category key from the module's fixed catalog (per type). */
  category: text('category').notNull(),
  account: text('account', { enum: ['cash', 'wallet', 'bank'] })
    .notNull()
    .default('cash'),
  note: text('note'),
  occurredAt: integer('occurred_at').notNull(),
  logDate: text('log_date').notNull(),
  /** For type='savings', optionally the savings goal this contributes to. */
  savingsGoalId: text('savings_goal_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] })
    .notNull()
    .default('pending'),
  serverUpdatedAt: integer('server_updated_at'),
});

export const savingsGoals = sqliteTable('savings_goals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  targetCents: integer('target_cents').notNull(),
  colorToken: text('color_token').notNull(),
  deadline: integer('deadline'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

/** Single-row-per-user budget preferences. */
export const budgetSettings = sqliteTable('budget_settings', {
  userId: text('user_id').primaryKey(),
  currency: text('currency').notNull().default('$'),
  monthlyBudgetCents: integer('monthly_budget_cents'),
  updatedAt: integer('updated_at').notNull(),
});

/** Money you borrowed from, or lent to, another person — with an optional
 * deadline and a reminder scheduled some days before it. `direction` is
 * 'borrowed' (you owe them) or 'lent' (they owe you). All money is integer
 * minor units (cents). */
export const budgetDebts = sqliteTable('budget_debts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  direction: text('direction', { enum: ['borrowed', 'lent'] }).notNull(),
  counterparty: text('counterparty').notNull(),
  principalCents: integer('principal_cents').notNull(),
  paidCents: integer('paid_cents').notNull().default(0),
  currency: text('currency').notNull().default('$'),
  note: text('note'),
  dueDate: integer('due_date'),
  reminderDaysBefore: integer('reminder_days_before'),
  reminderNotificationId: text('reminder_notification_id'),
  settledAt: integer('settled_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] })
    .notNull()
    .default('pending'),
  serverUpdatedAt: integer('server_updated_at'),
});

export const galleryAlbums = sqliteTable('gallery_albums', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  category: text('category', {
    enum: ['gym', 'body', 'weight_loss', 'certificates', 'achievements', 'memories', 'custom'],
  })
    .notNull()
    .default('custom'),
  coverPhotoId: text('cover_photo_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const galleryPhotos = sqliteTable('gallery_photos', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  albumId: text('album_id'),
  /** Local file:// URI inside the app's document directory (copied on import
   * so it survives relaunch). */
  uri: text('uri').notNull(),
  /** 'photo' or 'video' — videos also carry a durationMs + thumbnailUri. */
  mediaType: text('media_type', { enum: ['photo', 'video'] }).notNull().default('photo'),
  /** Video length in milliseconds (null for photos). */
  durationMs: integer('duration_ms'),
  /** Poster frame copied to app storage so the grid never decodes the video. */
  thumbnailUri: text('thumbnail_uri'),
  width: integer('width'),
  height: integer('height'),
  caption: text('caption'),
  /** JSON-encoded string[] of tags. */
  tags: text('tags'),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
  /** The "progress date" the photo represents (defaults to import time). */
  takenAt: integer('taken_at').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] })
    .notNull()
    .default('pending'),
  serverUpdatedAt: integer('server_updated_at'),
});

/**
 * Central log of every local notification LifeOS schedules — the data behind
 * the in-app Notification Inbox. Each module still owns its own reminder
 * scheduling; lib/notifications.ts writes a row here on every successful
 * schedule and clears it on cancel, so the inbox never drifts from what's
 * actually queued with the OS. Delivery status is derived, not stored: a row
 * is "scheduled" while scheduledAt is in the future and "delivered" once it
 * passes (repeating reminders show their next fire time). readAt/canceledAt
 * gate the read state and cancellation.
 */
export const notificationLog = sqliteTable('notification_log', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  /** The id expo-notifications returned for the scheduled notification, kept
   * so the inbox can cancel it. Null once delivered or if scheduling no-oped
   * (permission denied / Expo Go Android). */
  notificationId: text('notification_id'),
  category: text('category').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  /** Deep-link path the notification tap navigates to (e.g. /task). */
  route: text('route'),
  /** JSON-encoded route params (e.g. {"id":"abc"}). */
  params: text('params'),
  /** When it fires; for repeats='daily' this is the next occurrence. */
  scheduledAt: integer('scheduled_at').notNull(),
  repeats: text('repeats', { enum: ['none', 'daily'] })
    .notNull()
    .default('none'),
  readAt: integer('read_at'),
  canceledAt: integer('canceled_at'),
  createdAt: integer('created_at').notNull(),
});

/**
 * Bootstrap DDL, run once at startup — see database/client.ts for why this
 * is hand-written rather than generated via drizzle-kit migrations.
 *
 * Split into a table script and an index script, run on either side of
 * ADDITIVE_COLUMNS: an index on a column that only exists via ADDITIVE_COLUMNS
 * (e.g. notes.is_archived) would fail with "no such column" on any device
 * that already had that table from before the column was added — CREATE
 * TABLE IF NOT EXISTS is a no-op there, so the column isn't present until
 * applyAdditiveColumns() runs. Since a failing statement aborts the whole
 * multi-statement exec, that single bad index would otherwise break getDb()
 * — and every screen that touches the database — permanently.
 */
export const TABLE_BOOTSTRAP_SQL = `
  CREATE TABLE IF NOT EXISTS task_categories (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color_token TEXT NOT NULL,
    icon TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'none',
    category_id TEXT REFERENCES task_categories(id),
    due_date INTEGER,
    has_due_time INTEGER NOT NULL DEFAULT 0,
    recurrence_frequency TEXT NOT NULL DEFAULT 'none',
    recurrence_parent_id TEXT,
    completed_at INTEGER,
    position INTEGER NOT NULL DEFAULT 0,
    reminder_enabled INTEGER NOT NULL DEFAULT 0,
    reminder_notification_id TEXT,
    source_note_id TEXT,
    habit_id TEXT,
    habit_log_date TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS note_categories (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color_token TEXT NOT NULL,
    icon TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT,
    category_id TEXT REFERENCES note_categories(id),
    is_pinned INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    word_count INTEGER NOT NULL DEFAULT 0,
    reminder_at INTEGER,
    reminder_notification_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS note_tags (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color_token TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS note_tag_links (
    note_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (note_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS note_attachments (
    id TEXT PRIMARY KEY NOT NULL,
    note_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    uri TEXT NOT NULL,
    thumbnail_uri TEXT,
    duration_ms INTEGER,
    size_bytes INTEGER,
    created_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS habit_categories (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color_token TEXT NOT NULL,
    icon TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT,
    category_id TEXT REFERENCES habit_categories(id),
    color_token TEXT,
    type TEXT NOT NULL DEFAULT 'boolean',
    unit TEXT,
    target_value REAL,
    schedule_type TEXT NOT NULL DEFAULT 'daily',
    schedule_days TEXT,
    schedule_interval_days INTEGER,
    reminder_time TEXT,
    reminder_adaptive INTEGER NOT NULL DEFAULT 0,
    reminder_notification_id TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS habit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    habit_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    log_date TEXT NOT NULL,
    value REAL NOT NULL DEFAULT 1,
    note TEXT,
    logged_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS habit_skips (
    id TEXT PRIMARY KEY NOT NULL,
    habit_id TEXT NOT NULL,
    log_date TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS habit_routines (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS habit_routine_items (
    routine_id TEXT NOT NULL,
    habit_id TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (routine_id, habit_id)
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    mood TEXT,
    energy INTEGER,
    stress INTEGER,
    focus INTEGER,
    sleep_hours REAL,
    sleep_quality INTEGER,
    mood_reasons TEXT,
    location_label TEXT,
    location_lat REAL,
    location_lng REAL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS journal_prompts (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    text TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS journal_reflections (
    id TEXT PRIMARY KEY NOT NULL,
    entry_id TEXT NOT NULL,
    prompt_id TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS journal_attachments (
    id TEXT PRIMARY KEY NOT NULL,
    entry_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    uri TEXT NOT NULL,
    thumbnail_uri TEXT,
    duration_ms INTEGER,
    created_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS entry_links (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    start_at INTEGER NOT NULL,
    end_at INTEGER,
    color_token TEXT,
    notes TEXT,
    reminder_minutes_before INTEGER,
    reminder_notification_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS water_intake_logs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    log_date TEXT NOT NULL,
    amount_ml INTEGER NOT NULL,
    logged_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    uri TEXT NOT NULL,
    duration_ms INTEGER,
    added_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color_token TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id TEXT NOT NULL,
    song_id TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (playlist_id, song_id)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'personal',
    category_label TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'active',
    progress_mode TEXT NOT NULL DEFAULT 'percent',
    manual_progress REAL NOT NULL DEFAULT 0,
    target_value REAL,
    current_value REAL NOT NULL DEFAULT 0,
    unit TEXT,
    due_date INTEGER,
    completed_at INTEGER,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS goal_milestones (
    id TEXT PRIMARY KEY NOT NULL,
    goal_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS goal_progress_logs (
    id TEXT PRIMARY KEY NOT NULL,
    goal_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    value REAL NOT NULL,
    delta REAL NOT NULL DEFAULT 0,
    note TEXT,
    logged_at INTEGER NOT NULL,
    log_date TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sleep_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    log_date TEXT NOT NULL,
    bedtime INTEGER NOT NULL,
    wake_time INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    fell_asleep_minutes INTEGER,
    quality INTEGER,
    note TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS sleep_settings (
    user_id TEXT PRIMARY KEY NOT NULL,
    goal_minutes INTEGER NOT NULL DEFAULT 480,
    target_bedtime TEXT,
    target_wake_time TEXT,
    reminder_enabled INTEGER NOT NULL DEFAULT 0,
    reminder_notification_id TEXT,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS study_subjects (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color_token TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    subject_id TEXT,
    log_date TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    mode TEXT NOT NULL DEFAULT 'pomodoro',
    focus_rating INTEGER,
    note TEXT,
    created_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS study_settings (
    user_id TEXT PRIMARY KEY NOT NULL,
    daily_goal_minutes INTEGER NOT NULL DEFAULT 120,
    focus_minutes INTEGER NOT NULL DEFAULT 25,
    break_minutes INTEGER NOT NULL DEFAULT 5,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS budget_transactions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    category TEXT NOT NULL,
    account TEXT NOT NULL DEFAULT 'cash',
    note TEXT,
    occurred_at INTEGER NOT NULL,
    log_date TEXT NOT NULL,
    savings_goal_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_cents INTEGER NOT NULL,
    color_token TEXT NOT NULL,
    deadline INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS budget_settings (
    user_id TEXT PRIMARY KEY NOT NULL,
    currency TEXT NOT NULL DEFAULT '$',
    monthly_budget_cents INTEGER,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS budget_debts (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    direction TEXT NOT NULL,
    counterparty TEXT NOT NULL,
    principal_cents INTEGER NOT NULL,
    paid_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT '$',
    note TEXT,
    due_date INTEGER,
    reminder_days_before INTEGER,
    reminder_notification_id TEXT,
    settled_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS gallery_albums (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'custom',
    cover_photo_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS gallery_photos (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    album_id TEXT,
    uri TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'photo',
    duration_ms INTEGER,
    thumbnail_uri TEXT,
    width INTEGER,
    height INTEGER,
    caption TEXT,
    tags TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    taken_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS notification_log (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    notification_id TEXT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    route TEXT,
    params TEXT,
    scheduled_at INTEGER NOT NULL,
    repeats TEXT NOT NULL DEFAULT 'none',
    read_at INTEGER,
    canceled_at INTEGER,
    created_at INTEGER NOT NULL
  );
`;

/** Run after ADDITIVE_COLUMNS — see TABLE_BOOTSTRAP_SQL's comment for why. */
export const INDEX_BOOTSTRAP_SQL = `
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(user_id, due_date);
  CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(user_id, is_pinned);
  CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(user_id, updated_at);
  CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(user_id, is_archived);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_note_tag_links ON note_tag_links(note_id, tag_id);
  CREATE INDEX IF NOT EXISTS idx_note_attachments_note ON note_attachments(note_id);
  CREATE INDEX IF NOT EXISTS idx_habits_position ON habits(user_id, is_archived, position);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_logs_day ON habit_logs(habit_id, log_date);
  CREATE INDEX IF NOT EXISTS idx_habit_skips_day ON habit_skips(habit_id, log_date);
  CREATE INDEX IF NOT EXISTS idx_habit_routines_position ON habit_routines(user_id, position);
  CREATE INDEX IF NOT EXISTS idx_habit_routine_items_routine ON habit_routine_items(routine_id, position);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, entry_date) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_journal_reflections_entry ON journal_reflections(entry_id);
  CREATE INDEX IF NOT EXISTS idx_journal_attachments_entry ON journal_attachments(entry_id);
  CREATE INDEX IF NOT EXISTS idx_entry_links_source ON entry_links(user_id, source_type, source_id);
  CREATE INDEX IF NOT EXISTS idx_entry_links_target ON entry_links(user_id, target_type, target_id);
  CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(user_id, start_at);
  CREATE INDEX IF NOT EXISTS idx_water_intake_logs_date ON water_intake_logs(user_id, log_date);
  CREATE INDEX IF NOT EXISTS idx_songs_user ON songs(user_id, added_at);
  CREATE INDEX IF NOT EXISTS idx_playlists_position ON playlists(user_id, position);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_playlist_songs_position ON playlist_songs(playlist_id, position);
  CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(user_id, status, position);
  CREATE INDEX IF NOT EXISTS idx_goals_due ON goals(user_id, due_date);
  CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal ON goal_milestones(goal_id, position);
  CREATE INDEX IF NOT EXISTS idx_goal_progress_logs_goal ON goal_progress_logs(goal_id, logged_at);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_sleep_sessions_date ON sleep_sessions(user_id, log_date) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user ON sleep_sessions(user_id, bedtime);
  CREATE INDEX IF NOT EXISTS idx_study_subjects_user ON study_subjects(user_id);
  CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(user_id, log_date);
  CREATE INDEX IF NOT EXISTS idx_study_sessions_started ON study_sessions(user_id, started_at);
  CREATE INDEX IF NOT EXISTS idx_budget_tx_date ON budget_transactions(user_id, log_date);
  CREATE INDEX IF NOT EXISTS idx_budget_tx_occurred ON budget_transactions(user_id, occurred_at);
  CREATE INDEX IF NOT EXISTS idx_budget_tx_type ON budget_transactions(user_id, type);
  CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id);
  CREATE INDEX IF NOT EXISTS idx_budget_debts_user ON budget_debts(user_id, due_date);
  CREATE INDEX IF NOT EXISTS idx_gallery_albums_user ON gallery_albums(user_id);
  CREATE INDEX IF NOT EXISTS idx_gallery_photos_album ON gallery_photos(user_id, album_id, taken_at);
  CREATE INDEX IF NOT EXISTS idx_gallery_photos_favorite ON gallery_photos(user_id, is_favorite);
  CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id, scheduled_at);
`;

/**
 * Additive columns for tables that may already exist on-device from before
 * this schema revision. CREATE TABLE IF NOT EXISTS above won't add these to
 * an existing table, so database/client.ts applies them via ALTER TABLE
 * after bootstrap, guarded by a PRAGMA table_info check.
 */
export const ADDITIVE_COLUMNS: Record<string, { name: string; ddl: string }[]> = {
  tasks: [
    { name: 'has_due_time', ddl: "ALTER TABLE tasks ADD COLUMN has_due_time INTEGER NOT NULL DEFAULT 0" },
    {
      name: 'recurrence_frequency',
      ddl: "ALTER TABLE tasks ADD COLUMN recurrence_frequency TEXT NOT NULL DEFAULT 'none'",
    },
    { name: 'recurrence_parent_id', ddl: 'ALTER TABLE tasks ADD COLUMN recurrence_parent_id TEXT' },
    { name: 'source_note_id', ddl: 'ALTER TABLE tasks ADD COLUMN source_note_id TEXT' },
    { name: 'habit_id', ddl: 'ALTER TABLE tasks ADD COLUMN habit_id TEXT' },
    { name: 'habit_log_date', ddl: 'ALTER TABLE tasks ADD COLUMN habit_log_date TEXT' },
    { name: 'reminder_enabled', ddl: 'ALTER TABLE tasks ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0' },
    { name: 'reminder_notification_id', ddl: 'ALTER TABLE tasks ADD COLUMN reminder_notification_id TEXT' },
  ],
  notes: [
    { name: 'is_archived', ddl: 'ALTER TABLE notes ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0' },
    { name: 'word_count', ddl: 'ALTER TABLE notes ADD COLUMN word_count INTEGER NOT NULL DEFAULT 0' },
    { name: 'reminder_at', ddl: 'ALTER TABLE notes ADD COLUMN reminder_at INTEGER' },
    { name: 'reminder_notification_id', ddl: 'ALTER TABLE notes ADD COLUMN reminder_notification_id TEXT' },
  ],
  habits: [{ name: 'reminder_notification_id', ddl: 'ALTER TABLE habits ADD COLUMN reminder_notification_id TEXT' }],
  calendar_events: [
    { name: 'reminder_minutes_before', ddl: 'ALTER TABLE calendar_events ADD COLUMN reminder_minutes_before INTEGER' },
    { name: 'reminder_notification_id', ddl: 'ALTER TABLE calendar_events ADD COLUMN reminder_notification_id TEXT' },
  ],
  songs: [
    { name: 'sync_status', ddl: "ALTER TABLE songs ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'" },
    { name: 'server_updated_at', ddl: 'ALTER TABLE songs ADD COLUMN server_updated_at INTEGER' },
  ],
  playlists: [
    { name: 'sync_status', ddl: "ALTER TABLE playlists ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'" },
    { name: 'server_updated_at', ddl: 'ALTER TABLE playlists ADD COLUMN server_updated_at INTEGER' },
  ],
  gallery_photos: [
    { name: 'media_type', ddl: "ALTER TABLE gallery_photos ADD COLUMN media_type TEXT NOT NULL DEFAULT 'photo'" },
    { name: 'duration_ms', ddl: 'ALTER TABLE gallery_photos ADD COLUMN duration_ms INTEGER' },
    { name: 'thumbnail_uri', ddl: 'ALTER TABLE gallery_photos ADD COLUMN thumbnail_uri TEXT' },
  ],
  sleep_sessions: [{ name: 'fell_asleep_minutes', ddl: 'ALTER TABLE sleep_sessions ADD COLUMN fell_asleep_minutes INTEGER' }],
  study_sessions: [{ name: 'focus_rating', ddl: 'ALTER TABLE study_sessions ADD COLUMN focus_rating INTEGER' }],
  sleep_settings: [
    { name: 'reminder_enabled', ddl: 'ALTER TABLE sleep_settings ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0' },
    { name: 'reminder_notification_id', ddl: 'ALTER TABLE sleep_settings ADD COLUMN reminder_notification_id TEXT' },
  ],
};
