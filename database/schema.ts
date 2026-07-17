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
  ],
  notes: [
    { name: 'is_archived', ddl: 'ALTER TABLE notes ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0' },
    { name: 'word_count', ddl: 'ALTER TABLE notes ADD COLUMN word_count INTEGER NOT NULL DEFAULT 0' },
  ],
};
