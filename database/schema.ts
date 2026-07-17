import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] })
    .notNull()
    .default('pending'),
  serverUpdatedAt: integer('server_updated_at'),
});

/** Bootstrap DDL, run once at startup — see database/client.ts for why this
 * is hand-written rather than generated via drizzle-kit migrations. */
export const BOOTSTRAP_SQL = `
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
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(user_id, due_date);
  CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(user_id, is_pinned);
  CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(user_id, updated_at);
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
  ],
};
