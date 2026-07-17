import { and, eq, inArray, isNull } from 'drizzle-orm';

import { getDb } from '@/database/client';
import { habitCategories, habitLogs, habitRoutineItems, habitRoutines, habits, habitSkips } from '@/database/schema';
import { calculateHabitStreaks, getTodayStatus, toDateKey } from '@/features/habits/services/habit-streaks';
import { generateId } from '@/lib/id';
import { LOCAL_USER_ID } from '@/lib/local-user';
import type {
  CreateHabitInput,
  Habit,
  HabitCategory,
  HabitLog,
  HabitRoutine,
  HabitSkip,
  HabitSkipReason,
  HabitWithToday,
  UpdateHabitInput,
} from '@/features/habits/types/habit.types';

function toHabit(row: typeof habits.$inferSelect): Habit {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    categoryId: row.categoryId,
    colorToken: row.colorToken,
    type: row.type,
    unit: row.unit,
    targetValue: row.targetValue,
    scheduleType: row.scheduleType,
    scheduleDays: row.scheduleDays ? (JSON.parse(row.scheduleDays) as number[]) : null,
    scheduleIntervalDays: row.scheduleIntervalDays,
    reminderTime: row.reminderTime,
    reminderAdaptive: row.reminderAdaptive,
    reminderNotificationId: row.reminderNotificationId,
    position: row.position,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listHabits(includeArchived = false): Habit[] {
  const rows = getDb()
    .select()
    .from(habits)
    .where(and(eq(habits.userId, LOCAL_USER_ID), isNull(habits.deletedAt)))
    .orderBy(habits.position)
    .all();
  return rows.filter((row) => includeArchived || !row.isArchived).map(toHabit);
}

export function getHabit(id: string): Habit | null {
  const row = getDb().select().from(habits).where(eq(habits.id, id)).get();
  return row ? toHabit(row) : null;
}

/** Enriches a raw habit with today's derived status and streaks — shared by
 * the flat Today list and per-routine habit lookups so the calculation only
 * lives in one place. */
export function enrichHabitWithToday(habit: Habit, todayKey: string): HabitWithToday {
  const logs = listLogsForHabit(habit.id);
  const skips = listSkipsForHabit(habit.id);
  const { currentStreak, bestStreak } = calculateHabitStreaks(habit, logs, skips);
  const todayLog = logs.find((log) => log.logDate === todayKey);
  return {
    ...habit,
    todayStatus: getTodayStatus(habit, logs, skips, todayKey),
    todayValue: todayLog?.value ?? null,
    currentStreak,
    bestStreak,
  };
}

export function listHabitsWithToday(includeArchived = false): HabitWithToday[] {
  const todayKey = toDateKey(new Date());
  return listHabits(includeArchived).map((habit) => enrichHabitWithToday(habit, todayKey));
}

export function createHabit(input: CreateHabitInput): Habit {
  const now = Date.now();
  const habit: Habit = {
    id: generateId(),
    name: input.name,
    emoji: input.emoji ?? null,
    categoryId: input.categoryId ?? null,
    colorToken: input.colorToken ?? null,
    type: input.type,
    unit: input.unit ?? null,
    targetValue: input.targetValue ?? null,
    scheduleType: input.scheduleType,
    scheduleDays: input.scheduleDays ?? null,
    scheduleIntervalDays: input.scheduleIntervalDays ?? null,
    reminderTime: input.reminderTime ?? null,
    reminderAdaptive: input.reminderAdaptive ?? false,
    reminderNotificationId: null,
    position: 0,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .insert(habits)
    .values({
      ...habit,
      scheduleDays: habit.scheduleDays ? JSON.stringify(habit.scheduleDays) : null,
      userId: LOCAL_USER_ID,
      syncStatus: 'pending',
    })
    .run();
  return habit;
}

export function updateHabit(id: string, input: UpdateHabitInput) {
  const { scheduleDays, ...rest } = input;
  getDb()
    .update(habits)
    .set({
      ...rest,
      ...(scheduleDays !== undefined ? { scheduleDays: scheduleDays ? JSON.stringify(scheduleDays) : null } : {}),
      updatedAt: Date.now(),
      syncStatus: 'pending',
    })
    .where(eq(habits.id, id))
    .run();
}

export function setHabitReminderNotificationId(id: string, notificationId: string | null) {
  getDb().update(habits).set({ reminderNotificationId: notificationId }).where(eq(habits.id, id)).run();
}

export function archiveHabit(id: string) {
  getDb().update(habits).set({ isArchived: true, updatedAt: Date.now(), syncStatus: 'pending' }).where(eq(habits.id, id)).run();
}

export function unarchiveHabit(id: string) {
  getDb().update(habits).set({ isArchived: false, updatedAt: Date.now(), syncStatus: 'pending' }).where(eq(habits.id, id)).run();
}

export function deleteHabit(id: string) {
  const db = getDb();
  db.update(habits).set({ deletedAt: Date.now(), syncStatus: 'pending' }).where(eq(habits.id, id)).run();
  db.delete(habitRoutineItems).where(eq(habitRoutineItems.habitId, id)).run();
}

export function reorderHabits(orderedIds: string[]) {
  const db = getDb();
  orderedIds.forEach((id, index) => {
    db.update(habits).set({ position: index }).where(eq(habits.id, id)).run();
  });
}

export function listLogsForHabit(habitId: string): HabitLog[] {
  return getDb().select().from(habitLogs).where(eq(habitLogs.habitId, habitId)).all();
}

export function listSkipsForHabit(habitId: string): HabitSkip[] {
  return getDb().select().from(habitSkips).where(eq(habitSkips.habitId, habitId)).all();
}

/** Upserts a habit's log for a single day — idempotent so double-tapping
 * offline and syncing later never double-counts (unique on habit_id, log_date). */
export function logHabit(habitId: string, logDate: string, value = 1, note: string | null = null) {
  const db = getDb();
  const existing = db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.logDate, logDate)))
    .get();

  if (existing) {
    db.update(habitLogs).set({ value, note }).where(eq(habitLogs.id, existing.id)).run();
    return;
  }

  db.insert(habitLogs)
    .values({
      id: generateId(),
      habitId,
      userId: LOCAL_USER_ID,
      logDate,
      value,
      note,
      loggedAt: Date.now(),
      createdAt: Date.now(),
    })
    .run();
}

export function unlogHabit(habitId: string, logDate: string) {
  getDb()
    .delete(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.logDate, logDate)))
    .run();
}

export function skipHabit(habitId: string, logDate: string, reason: HabitSkipReason) {
  const db = getDb();
  const existing = db
    .select()
    .from(habitSkips)
    .where(and(eq(habitSkips.habitId, habitId), eq(habitSkips.logDate, logDate)))
    .get();
  if (existing) return;

  db.insert(habitSkips)
    .values({ id: generateId(), habitId, logDate, reason, createdAt: Date.now() })
    .run();
}

export function unskipHabit(habitId: string, logDate: string) {
  getDb()
    .delete(habitSkips)
    .where(and(eq(habitSkips.habitId, habitId), eq(habitSkips.logDate, logDate)))
    .run();
}

function toCategory(row: typeof habitCategories.$inferSelect): HabitCategory {
  return { id: row.id, name: row.name, colorToken: row.colorToken, icon: row.icon };
}

export function listHabitCategories(): HabitCategory[] {
  return getDb()
    .select()
    .from(habitCategories)
    .where(and(eq(habitCategories.userId, LOCAL_USER_ID), isNull(habitCategories.deletedAt)))
    .all()
    .map(toCategory);
}

export function getHabitCategoryById(id: string): HabitCategory | null {
  const row = getDb().select().from(habitCategories).where(eq(habitCategories.id, id)).get();
  return row ? toCategory(row) : null;
}

export function createHabitCategory(name: string, colorToken: string, icon: string): HabitCategory {
  const now = Date.now();
  const category: HabitCategory = { id: generateId(), name, colorToken, icon };
  getDb()
    .insert(habitCategories)
    .values({ ...category, userId: LOCAL_USER_ID, createdAt: now, updatedAt: now })
    .run();
  return category;
}

export function deleteHabitCategory(id: string) {
  getDb().update(habitCategories).set({ deletedAt: Date.now() }).where(eq(habitCategories.id, id)).run();
}

// ---- Routines (habit stacking) ----

function toRoutine(row: typeof habitRoutines.$inferSelect): HabitRoutine {
  return { id: row.id, name: row.name, position: row.position };
}

export function listRoutines(): HabitRoutine[] {
  return getDb()
    .select()
    .from(habitRoutines)
    .where(and(eq(habitRoutines.userId, LOCAL_USER_ID), isNull(habitRoutines.deletedAt)))
    .orderBy(habitRoutines.position)
    .all()
    .map(toRoutine);
}

export function getRoutine(id: string): HabitRoutine | null {
  const row = getDb().select().from(habitRoutines).where(eq(habitRoutines.id, id)).get();
  return row ? toRoutine(row) : null;
}

export function createRoutine(name: string): HabitRoutine {
  const db = getDb();
  const now = Date.now();
  const maxPosition = db.select().from(habitRoutines).all().reduce((max, row) => Math.max(max, row.position), -1);
  const routine: HabitRoutine = { id: generateId(), name, position: maxPosition + 1 };
  db.insert(habitRoutines)
    .values({ ...routine, userId: LOCAL_USER_ID, createdAt: now, updatedAt: now })
    .run();
  return routine;
}

export function renameRoutine(id: string, name: string) {
  getDb().update(habitRoutines).set({ name, updatedAt: Date.now() }).where(eq(habitRoutines.id, id)).run();
}

export function deleteRoutine(id: string) {
  const db = getDb();
  db.update(habitRoutines).set({ deletedAt: Date.now(), updatedAt: Date.now() }).where(eq(habitRoutines.id, id)).run();
  db.delete(habitRoutineItems).where(eq(habitRoutineItems.routineId, id)).run();
}

/** Ordered habit ids for one routine. */
export function listRoutineHabitIds(routineId: string): string[] {
  return getDb()
    .select()
    .from(habitRoutineItems)
    .where(eq(habitRoutineItems.routineId, routineId))
    .orderBy(habitRoutineItems.position)
    .all()
    .map((row) => row.habitId);
}

/** Every habit id that belongs to any routine — used to split the Today
 * list into "in a routine" vs. "standalone, grouped by category." */
export function listRoutinedHabitIds(): Set<string> {
  return new Set(getDb().select().from(habitRoutineItems).all().map((row) => row.habitId));
}

export function addHabitToRoutine(routineId: string, habitId: string) {
  const db = getDb();
  const existing = db
    .select()
    .from(habitRoutineItems)
    .where(and(eq(habitRoutineItems.routineId, routineId), eq(habitRoutineItems.habitId, habitId)))
    .get();
  if (existing) return;

  const maxPosition = db
    .select()
    .from(habitRoutineItems)
    .where(eq(habitRoutineItems.routineId, routineId))
    .all()
    .reduce((max, row) => Math.max(max, row.position), -1);
  db.insert(habitRoutineItems).values({ routineId, habitId, position: maxPosition + 1 }).run();
}

export function removeHabitFromRoutine(routineId: string, habitId: string) {
  getDb()
    .delete(habitRoutineItems)
    .where(and(eq(habitRoutineItems.routineId, routineId), eq(habitRoutineItems.habitId, habitId)))
    .run();
}

export function reorderRoutineHabits(routineId: string, orderedHabitIds: string[]) {
  const db = getDb();
  orderedHabitIds.forEach((habitId, index) => {
    db.update(habitRoutineItems)
      .set({ position: index })
      .where(and(eq(habitRoutineItems.routineId, routineId), eq(habitRoutineItems.habitId, habitId)))
      .run();
  });
}

export function getHabitsByIds(ids: string[]): Habit[] {
  if (ids.length === 0) return [];
  const rows = getDb().select().from(habits).where(inArray(habits.id, ids)).all();
  return rows.map(toHabit);
}
