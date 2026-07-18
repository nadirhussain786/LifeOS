import { and, desc, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/database/client';
import { sleepSessions, sleepSettings } from '@/database/schema';
import { durationBetween } from '@/features/sleep/services/sleep-stats';
import { generateId } from '@/lib/id';
import { LOCAL_USER_ID } from '@/lib/local-user';
import type {
  CreateSleepInput,
  SleepSession,
  SleepSettings,
  UpdateSleepInput,
} from '@/features/sleep/types/sleep.types';

const DEFAULT_GOAL_MINUTES = 480;

function toSession(row: typeof sleepSessions.$inferSelect): SleepSession {
  return {
    id: row.id,
    logDate: row.logDate,
    bedtime: row.bedtime,
    wakeTime: row.wakeTime,
    durationMinutes: row.durationMinutes,
    fellAsleepMinutes: row.fellAsleepMinutes,
    quality: row.quality,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getSleepSettings(): SleepSettings {
  const row = getDb().select().from(sleepSettings).where(eq(sleepSettings.userId, LOCAL_USER_ID)).get();
  if (!row) {
    return { goalMinutes: DEFAULT_GOAL_MINUTES, targetBedtime: null, targetWakeTime: null, reminderEnabled: false };
  }
  return {
    goalMinutes: row.goalMinutes,
    targetBedtime: row.targetBedtime,
    targetWakeTime: row.targetWakeTime,
    reminderEnabled: row.reminderEnabled,
  };
}

/** The raw reminder notification id (kept out of the UI-facing SleepSettings). */
export function getSleepReminderNotificationId(): string | null {
  const row = getDb().select().from(sleepSettings).where(eq(sleepSettings.userId, LOCAL_USER_ID)).get();
  return row?.reminderNotificationId ?? null;
}

export function setSleepReminderNotificationId(notificationId: string | null) {
  getDb()
    .update(sleepSettings)
    .set({ reminderNotificationId: notificationId })
    .where(eq(sleepSettings.userId, LOCAL_USER_ID))
    .run();
}

export function updateSleepSettings(input: Partial<SleepSettings>) {
  const db = getDb();
  const existing = db.select().from(sleepSettings).where(eq(sleepSettings.userId, LOCAL_USER_ID)).get();
  const now = Date.now();
  if (!existing) {
    db.insert(sleepSettings)
      .values({
        userId: LOCAL_USER_ID,
        goalMinutes: input.goalMinutes ?? DEFAULT_GOAL_MINUTES,
        targetBedtime: input.targetBedtime ?? null,
        targetWakeTime: input.targetWakeTime ?? null,
        reminderEnabled: input.reminderEnabled ?? false,
        updatedAt: now,
      })
      .run();
    return;
  }
  db.update(sleepSettings)
    .set({ ...input, updatedAt: now })
    .where(eq(sleepSettings.userId, LOCAL_USER_ID))
    .run();
}

export function listSleepSessions(): SleepSession[] {
  return getDb()
    .select()
    .from(sleepSessions)
    .where(and(eq(sleepSessions.userId, LOCAL_USER_ID), isNull(sleepSessions.deletedAt)))
    .orderBy(desc(sleepSessions.bedtime))
    .all()
    .map(toSession);
}

export function getSleepSession(id: string): SleepSession | null {
  const row = getDb().select().from(sleepSessions).where(eq(sleepSessions.id, id)).get();
  return row ? toSession(row) : null;
}

export function getSleepSessionByDate(logDate: string): SleepSession | null {
  const row = getDb()
    .select()
    .from(sleepSessions)
    .where(and(eq(sleepSessions.userId, LOCAL_USER_ID), eq(sleepSessions.logDate, logDate), isNull(sleepSessions.deletedAt)))
    .get();
  return row ? toSession(row) : null;
}

export function createSleepSession(input: CreateSleepInput): SleepSession {
  const db = getDb();
  const now = Date.now();
  const session: SleepSession = {
    id: generateId(),
    logDate: input.logDate,
    bedtime: input.bedtime,
    wakeTime: input.wakeTime,
    durationMinutes: durationBetween(input.bedtime, input.wakeTime),
    fellAsleepMinutes: input.fellAsleepMinutes ?? null,
    quality: input.quality ?? null,
    note: input.note ?? null,
    createdAt: now,
    updatedAt: now,
  };

  // One primary session per night — replace an existing record for the same
  // date rather than violating the unique index.
  const existing = getSleepSessionByDate(input.logDate);
  if (existing) {
    updateSleepSession(existing.id, input);
    return { ...session, id: existing.id };
  }

  db.insert(sleepSessions)
    .values({ ...session, userId: LOCAL_USER_ID, syncStatus: 'pending' })
    .run();
  return session;
}

export function updateSleepSession(id: string, input: UpdateSleepInput) {
  const existing = getSleepSession(id);
  if (!existing) return;
  const bedtime = input.bedtime ?? existing.bedtime;
  const wakeTime = input.wakeTime ?? existing.wakeTime;
  getDb()
    .update(sleepSessions)
    .set({
      ...input,
      durationMinutes: durationBetween(bedtime, wakeTime),
      updatedAt: Date.now(),
      syncStatus: 'pending',
    })
    .where(eq(sleepSessions.id, id))
    .run();
}

export function deleteSleepSession(id: string) {
  getDb()
    .update(sleepSessions)
    .set({ deletedAt: Date.now(), syncStatus: 'pending' })
    .where(eq(sleepSessions.id, id))
    .run();
}
