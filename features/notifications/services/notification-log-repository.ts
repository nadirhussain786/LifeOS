import { and, desc, eq, isNull, lte, sql } from 'drizzle-orm';

import { getDb } from '@/database/client';
import { notificationLog } from '@/database/schema';
import { generateId } from '@/lib/id';
import { LOCAL_USER_ID } from '@/lib/local-user';
import type {
  LoggedNotification,
  NotificationCategory,
  NotificationRepeat,
} from '@/features/notifications/types/notification.types';

export type LogNotificationInput = {
  /** Caller may supply the row id so it can be embedded in the notification's
   * payload before scheduling (enables tap→mark-this-row-read). Auto-generated
   * when omitted. */
  id?: string;
  notificationId: string | null;
  category: NotificationCategory;
  title: string;
  body: string;
  route?: string;
  params?: Record<string, string>;
  scheduledAt: number;
  repeats: NotificationRepeat;
};

type Row = typeof notificationLog.$inferSelect;

function toLogged(row: Row): LoggedNotification {
  return {
    id: row.id,
    notificationId: row.notificationId,
    category: row.category as NotificationCategory,
    title: row.title,
    body: row.body,
    route: row.route,
    params: row.params ? (JSON.parse(row.params) as Record<string, string>) : null,
    scheduledAt: row.scheduledAt,
    repeats: row.repeats as NotificationRepeat,
    readAt: row.readAt,
    canceledAt: row.canceledAt,
    createdAt: row.createdAt,
  };
}

/** Records a scheduled notification in the inbox log. Returns the new row id
 * (also written into the notification's data payload for tap→mark-read). */
export function logScheduledNotification(input: LogNotificationInput): string {
  const now = Date.now();
  const id = input.id ?? generateId();
  getDb()
    .insert(notificationLog)
    .values({
      id,
      userId: LOCAL_USER_ID,
      notificationId: input.notificationId,
      category: input.category,
      title: input.title,
      body: input.body,
      route: input.route ?? null,
      params: input.params ? JSON.stringify(input.params) : null,
      scheduledAt: input.scheduledAt,
      repeats: input.repeats,
      readAt: null,
      canceledAt: null,
      createdAt: now,
    })
    .run();
  return id;
}

/** Removes the log row(s) for a cancelled notification id. Called from the
 * cancel path so the inbox never shows reminders that are no longer queued. */
export function deleteLogByNotificationId(notificationId: string | null | undefined): void {
  if (!notificationId) return;
  getDb().delete(notificationLog).where(eq(notificationLog.notificationId, notificationId)).run();
}

/** Inbox contents, newest scheduled/delivered first. Excludes cancelled rows. */
export function listNotificationLog(limit = 100): LoggedNotification[] {
  const rows = getDb()
    .select()
    .from(notificationLog)
    .where(and(eq(notificationLog.userId, LOCAL_USER_ID), isNull(notificationLog.canceledAt)))
    .orderBy(desc(notificationLog.scheduledAt))
    .limit(limit)
    .all();
  return rows.map(toLogged);
}

/** Badge count: delivered one-time reminders that haven't been read. Repeating
 * reminders never count — they'd never clear. */
export function unreadNotificationCount(now = Date.now()): number {
  const result = getDb()
    .select({ count: sql<number>`count(*)` })
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.userId, LOCAL_USER_ID),
        isNull(notificationLog.canceledAt),
        isNull(notificationLog.readAt),
        eq(notificationLog.repeats, 'none'),
        lte(notificationLog.scheduledAt, now),
      ),
    )
    .get();
  return result?.count ?? 0;
}

export function markNotificationRead(logId: string): void {
  getDb().update(notificationLog).set({ readAt: Date.now() }).where(eq(notificationLog.id, logId)).run();
}

export function markAllNotificationsRead(): void {
  getDb()
    .update(notificationLog)
    .set({ readAt: Date.now() })
    .where(and(eq(notificationLog.userId, LOCAL_USER_ID), isNull(notificationLog.readAt)))
    .run();
}

/** Hard-deletes a single inbox row (user swipe/clear). */
export function deleteNotificationLog(logId: string): void {
  getDb().delete(notificationLog).where(eq(notificationLog.id, logId)).run();
}

export function clearNotificationLog(): void {
  getDb().delete(notificationLog).where(eq(notificationLog.userId, LOCAL_USER_ID)).run();
}
