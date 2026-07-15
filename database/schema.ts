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
    completed_at INTEGER,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    server_updated_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(user_id, due_date);
`;
