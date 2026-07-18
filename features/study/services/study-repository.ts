import { and, desc, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/database/client';
import { studySessions, studySettings, studySubjects } from '@/database/schema';
import { generateId } from '@/lib/id';
import { LOCAL_USER_ID } from '@/lib/local-user';
import type {
  CreateStudySessionInput,
  StudySession,
  StudySettings,
  StudySubject,
} from '@/features/study/types/study.types';

const DEFAULTS: StudySettings = { dailyGoalMinutes: 120, focusMinutes: 25, breakMinutes: 5 };

function toSubject(row: typeof studySubjects.$inferSelect): StudySubject {
  return { id: row.id, name: row.name, colorToken: row.colorToken, createdAt: row.createdAt };
}

function toSession(row: typeof studySessions.$inferSelect): StudySession {
  return {
    id: row.id,
    subjectId: row.subjectId,
    logDate: row.logDate,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationSeconds: row.durationSeconds,
    mode: row.mode,
    focusRating: row.focusRating,
    note: row.note,
    createdAt: row.createdAt,
  };
}

// ---- Subjects ----

export function listStudySubjects(): StudySubject[] {
  return getDb()
    .select()
    .from(studySubjects)
    .where(and(eq(studySubjects.userId, LOCAL_USER_ID), isNull(studySubjects.deletedAt)))
    .orderBy(studySubjects.createdAt)
    .all()
    .map(toSubject);
}

export function createStudySubject(name: string, colorToken: string): StudySubject {
  const now = Date.now();
  const subject: StudySubject = { id: generateId(), name: name.trim(), colorToken, createdAt: now };
  getDb()
    .insert(studySubjects)
    .values({ ...subject, userId: LOCAL_USER_ID, updatedAt: now })
    .run();
  return subject;
}

export function renameStudySubject(id: string, name: string) {
  getDb().update(studySubjects).set({ name: name.trim(), updatedAt: Date.now() }).where(eq(studySubjects.id, id)).run();
}

export function deleteStudySubject(id: string) {
  getDb().update(studySubjects).set({ deletedAt: Date.now() }).where(eq(studySubjects.id, id)).run();
}

// ---- Sessions ----

export function listStudySessions(): StudySession[] {
  return getDb()
    .select()
    .from(studySessions)
    .where(and(eq(studySessions.userId, LOCAL_USER_ID), isNull(studySessions.deletedAt)))
    .orderBy(desc(studySessions.startedAt))
    .all()
    .map(toSession);
}

export function createStudySession(input: CreateStudySessionInput): StudySession {
  const now = Date.now();
  const session: StudySession = {
    id: generateId(),
    subjectId: input.subjectId,
    logDate: input.logDate,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationSeconds: input.durationSeconds,
    mode: input.mode,
    focusRating: input.focusRating ?? null,
    note: input.note ?? null,
    createdAt: now,
  };
  getDb()
    .insert(studySessions)
    .values({ ...session, userId: LOCAL_USER_ID, syncStatus: 'pending' })
    .run();
  return session;
}

export function deleteStudySession(id: string) {
  getDb()
    .update(studySessions)
    .set({ deletedAt: Date.now(), syncStatus: 'pending' })
    .where(eq(studySessions.id, id))
    .run();
}

// ---- Settings ----

export function getStudySettings(): StudySettings {
  const row = getDb().select().from(studySettings).where(eq(studySettings.userId, LOCAL_USER_ID)).get();
  if (!row) return { ...DEFAULTS };
  return { dailyGoalMinutes: row.dailyGoalMinutes, focusMinutes: row.focusMinutes, breakMinutes: row.breakMinutes };
}

export function updateStudySettings(input: Partial<StudySettings>) {
  const db = getDb();
  const existing = db.select().from(studySettings).where(eq(studySettings.userId, LOCAL_USER_ID)).get();
  const now = Date.now();
  if (!existing) {
    db.insert(studySettings)
      .values({ userId: LOCAL_USER_ID, ...DEFAULTS, ...input, updatedAt: now })
      .run();
    return;
  }
  db.update(studySettings)
    .set({ ...input, updatedAt: now })
    .where(eq(studySettings.userId, LOCAL_USER_ID))
    .run();
}
