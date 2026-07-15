import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { getDb } from '@/database/client';
import { taskCategories, tasks } from '@/database/schema';
import { generateId } from '@/lib/id';
import { LOCAL_USER_ID } from '@/lib/local-user';
import type {
  CreateTaskInput,
  Task,
  TaskCategory,
  TaskListFilter,
  TaskSort,
  UpdateTaskInput,
} from '@/features/tasks/types/task.types';

const ACTIVE_STATUSES = ['todo', 'in_progress'] as const;

const PRIORITY_RANK = sql`CASE ${tasks.priority}
  WHEN 'high' THEN 3
  WHEN 'medium' THEN 2
  WHEN 'low' THEN 1
  ELSE 0
END`;

function statusesForFilter(filter: TaskListFilter) {
  if (filter === 'active') return [...ACTIVE_STATUSES];
  if (filter === 'completed') return ['completed'] as const;
  return ['archived'] as const;
}

function orderForSort(sort: TaskSort) {
  if (sort === 'priority') return sql`${PRIORITY_RANK} DESC`;
  if (sort === 'created') return sql`${tasks.createdAt} DESC`;
  return sql`(${tasks.dueDate} IS NULL), ${tasks.dueDate} ASC`;
}

export function listTasks(filter: TaskListFilter, sort: TaskSort): Task[] {
  return getDb()
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, LOCAL_USER_ID),
        isNull(tasks.deletedAt),
        inArray(tasks.status, statusesForFilter(filter)),
      ),
    )
    .orderBy(orderForSort(sort))
    .all();
}

export function getTask(id: string): Task | null {
  return getDb().select().from(tasks).where(eq(tasks.id, id)).get() ?? null;
}

export function createTask(input: CreateTaskInput): Task {
  const now = Date.now();
  const task: Task = {
    id: generateId(),
    title: input.title,
    notes: input.notes ?? null,
    status: 'todo',
    priority: input.priority ?? 'none',
    categoryId: input.categoryId ?? null,
    dueDate: input.dueDate ?? null,
    completedAt: null,
    position: 0,
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .insert(tasks)
    .values({ ...task, userId: LOCAL_USER_ID, syncStatus: 'pending' })
    .run();
  return task;
}

export function updateTask(id: string, input: UpdateTaskInput) {
  getDb()
    .update(tasks)
    .set({ ...input, updatedAt: Date.now(), syncStatus: 'pending' })
    .where(eq(tasks.id, id))
    .run();
}

export function completeTask(id: string) {
  const now = Date.now();
  getDb()
    .update(tasks)
    .set({ status: 'completed', completedAt: now, updatedAt: now, syncStatus: 'pending' })
    .where(eq(tasks.id, id))
    .run();
}

export function reopenTask(id: string) {
  getDb()
    .update(tasks)
    .set({ status: 'todo', completedAt: null, updatedAt: Date.now(), syncStatus: 'pending' })
    .where(eq(tasks.id, id))
    .run();
}

export function archiveTask(id: string) {
  getDb()
    .update(tasks)
    .set({ status: 'archived', updatedAt: Date.now(), syncStatus: 'pending' })
    .where(eq(tasks.id, id))
    .run();
}

export function deleteTask(id: string) {
  getDb()
    .update(tasks)
    .set({ deletedAt: Date.now(), syncStatus: 'pending' })
    .where(eq(tasks.id, id))
    .run();
}

export function listCategories(): TaskCategory[] {
  return getDb()
    .select()
    .from(taskCategories)
    .where(and(eq(taskCategories.userId, LOCAL_USER_ID), isNull(taskCategories.deletedAt)))
    .all();
}

export function createCategory(name: string, colorToken: string, icon: string): TaskCategory {
  const now = Date.now();
  const category: TaskCategory = { id: generateId(), name, colorToken, icon };
  getDb()
    .insert(taskCategories)
    .values({ ...category, userId: LOCAL_USER_ID, createdAt: now, updatedAt: now })
    .run();
  return category;
}
