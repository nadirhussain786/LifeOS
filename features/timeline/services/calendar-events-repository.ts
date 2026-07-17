import { and, eq, gte, isNull, lte } from 'drizzle-orm';

import { getDb } from '@/database/client';
import { calendarEvents } from '@/database/schema';
import { generateId } from '@/lib/id';
import { LOCAL_USER_ID } from '@/lib/local-user';
import type { CalendarEvent, CreateCalendarEventInput } from '@/features/timeline/types/timeline.types';

function toEvent(row: typeof calendarEvents.$inferSelect): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    startAt: row.startAt,
    endAt: row.endAt,
    colorToken: row.colorToken,
    notes: row.notes,
    reminderMinutesBefore: row.reminderMinutesBefore,
    reminderNotificationId: row.reminderNotificationId,
  };
}

export function getCalendarEvent(id: string): CalendarEvent | null {
  const row = getDb().select().from(calendarEvents).where(eq(calendarEvents.id, id)).get();
  return row ? toEvent(row) : null;
}

export function setCalendarEventReminderNotificationId(id: string, notificationId: string | null) {
  getDb().update(calendarEvents).set({ reminderNotificationId: notificationId }).where(eq(calendarEvents.id, id)).run();
}

export function listCalendarEventsBetween(startMs: number, endMs: number): CalendarEvent[] {
  return getDb()
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, LOCAL_USER_ID),
        isNull(calendarEvents.deletedAt),
        gte(calendarEvents.startAt, startMs),
        lte(calendarEvents.startAt, endMs),
      ),
    )
    .orderBy(calendarEvents.startAt)
    .all()
    .map(toEvent);
}

export function createCalendarEvent(input: CreateCalendarEventInput): CalendarEvent {
  const now = Date.now();
  const event: CalendarEvent = {
    id: generateId(),
    title: input.title,
    startAt: input.startAt,
    endAt: input.endAt ?? null,
    colorToken: input.colorToken ?? null,
    notes: input.notes ?? null,
    reminderMinutesBefore: input.reminderMinutesBefore ?? null,
    reminderNotificationId: null,
  };
  getDb()
    .insert(calendarEvents)
    .values({ ...event, userId: LOCAL_USER_ID, createdAt: now, updatedAt: now })
    .run();
  return event;
}

export function deleteCalendarEvent(id: string) {
  getDb().update(calendarEvents).set({ deletedAt: Date.now() }).where(eq(calendarEvents.id, id)).run();
}
