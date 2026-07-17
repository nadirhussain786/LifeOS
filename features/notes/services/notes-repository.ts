import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { getDb } from '@/database/client';
import { entryLinks, noteAttachments, noteCategories, noteTagLinks, noteTags, notes } from '@/database/schema';
import { generateId } from '@/lib/id';
import { LOCAL_USER_ID } from '@/lib/local-user';
import type {
  CreateNoteInput,
  Note,
  NoteAttachment,
  NoteBacklink,
  NoteCategory,
  NoteTag,
  UpdateNoteInput,
} from '@/features/notes/types/note.types';

function countWords(body: string | null): number {
  if (!body) return 0;
  const matches = body.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

export function listNotes(): Note[] {
  return getDb()
    .select()
    .from(notes)
    .where(and(eq(notes.userId, LOCAL_USER_ID), isNull(notes.deletedAt), eq(notes.isArchived, false)))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt))
    .all();
}

export function listArchivedNotes(): Note[] {
  return getDb()
    .select()
    .from(notes)
    .where(and(eq(notes.userId, LOCAL_USER_ID), isNull(notes.deletedAt), eq(notes.isArchived, true)))
    .orderBy(desc(notes.updatedAt))
    .all();
}

export function listRecentNotes(limit: number): Note[] {
  return listNotes().slice(0, limit);
}

export function getNote(id: string): Note | null {
  return getDb().select().from(notes).where(eq(notes.id, id)).get() ?? null;
}

export function createNote(input: CreateNoteInput): Note {
  const now = Date.now();
  const note: Note = {
    id: generateId(),
    title: input.title,
    body: input.body ?? null,
    categoryId: input.categoryId ?? null,
    isPinned: input.isPinned ?? false,
    isArchived: false,
    wordCount: countWords(input.body ?? null),
    reminderAt: input.reminderAt ?? null,
    reminderNotificationId: null,
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .insert(notes)
    .values({ ...note, userId: LOCAL_USER_ID, syncStatus: 'pending' })
    .run();
  if (note.body) syncNoteLinks(note.id, note.body);
  return note;
}

export function updateNote(id: string, input: UpdateNoteInput) {
  const wordCount = input.body !== undefined ? { wordCount: countWords(input.body) } : {};
  getDb()
    .update(notes)
    .set({ ...input, ...wordCount, updatedAt: Date.now(), syncStatus: 'pending' })
    .where(eq(notes.id, id))
    .run();

  if (input.body !== undefined) syncNoteLinks(id, input.body ?? '');
}

export function setNoteReminderNotificationId(id: string, notificationId: string | null) {
  getDb().update(notes).set({ reminderNotificationId: notificationId }).where(eq(notes.id, id)).run();
}

export function archiveNote(id: string) {
  getDb().update(notes).set({ isArchived: true, updatedAt: Date.now(), syncStatus: 'pending' }).where(eq(notes.id, id)).run();
}

export function unarchiveNote(id: string) {
  getDb().update(notes).set({ isArchived: false, updatedAt: Date.now(), syncStatus: 'pending' }).where(eq(notes.id, id)).run();
}

export function deleteNote(id: string) {
  getDb()
    .update(notes)
    .set({ deletedAt: Date.now(), syncStatus: 'pending' })
    .where(eq(notes.id, id))
    .run();
}

export function listNoteCategories(): NoteCategory[] {
  return getDb()
    .select()
    .from(noteCategories)
    .where(and(eq(noteCategories.userId, LOCAL_USER_ID), isNull(noteCategories.deletedAt)))
    .all();
}

export function getNoteCategoryById(id: string): NoteCategory | null {
  return getDb().select().from(noteCategories).where(eq(noteCategories.id, id)).get() ?? null;
}

export function createNoteCategory(name: string, colorToken: string, icon: string): NoteCategory {
  const now = Date.now();
  const category: NoteCategory = { id: generateId(), name, colorToken, icon };
  getDb()
    .insert(noteCategories)
    .values({ ...category, userId: LOCAL_USER_ID, createdAt: now, updatedAt: now })
    .run();
  return category;
}

export function deleteNoteCategory(id: string) {
  getDb()
    .update(noteCategories)
    .set({ deletedAt: Date.now() })
    .where(eq(noteCategories.id, id))
    .run();
}

// ---- Tags (many-to-many, distinct from the single-select category) ----

function toTag(row: typeof noteTags.$inferSelect): NoteTag {
  return { id: row.id, name: row.name, colorToken: row.colorToken };
}

export function listTags(): NoteTag[] {
  return getDb().select().from(noteTags).where(eq(noteTags.userId, LOCAL_USER_ID)).all().map(toTag);
}

export function createTag(name: string, colorToken?: string): NoteTag {
  const tag: NoteTag = { id: generateId(), name, colorToken: colorToken ?? null };
  getDb()
    .insert(noteTags)
    .values({ ...tag, userId: LOCAL_USER_ID, createdAt: Date.now() })
    .run();
  return tag;
}

export function deleteTag(id: string) {
  const db = getDb();
  db.delete(noteTagLinks).where(eq(noteTagLinks.tagId, id)).run();
  db.delete(noteTags).where(eq(noteTags.id, id)).run();
}

export function listTagsForNote(noteId: string): NoteTag[] {
  const links = getDb().select().from(noteTagLinks).where(eq(noteTagLinks.noteId, noteId)).all();
  if (links.length === 0) return [];
  const tagIds = links.map((link) => link.tagId);
  return getDb().select().from(noteTags).where(inArray(noteTags.id, tagIds)).all().map(toTag);
}

export function setTagsForNote(noteId: string, tagIds: string[]) {
  const db = getDb();
  db.delete(noteTagLinks).where(eq(noteTagLinks.noteId, noteId)).run();
  tagIds.forEach((tagId) => db.insert(noteTagLinks).values({ noteId, tagId }).run());
}

// ---- Attachments ----

function toAttachment(row: typeof noteAttachments.$inferSelect): NoteAttachment {
  return {
    id: row.id,
    noteId: row.noteId,
    kind: row.kind,
    uri: row.uri,
    thumbnailUri: row.thumbnailUri,
    durationMs: row.durationMs,
    createdAt: row.createdAt,
  };
}

export function listAttachmentsForNote(noteId: string): NoteAttachment[] {
  return getDb()
    .select()
    .from(noteAttachments)
    .where(and(eq(noteAttachments.noteId, noteId), isNull(noteAttachments.deletedAt)))
    .orderBy(noteAttachments.createdAt)
    .all()
    .map(toAttachment);
}

export function addNoteAttachment(noteId: string, kind: NoteAttachment['kind'], uri: string, durationMs?: number | null): NoteAttachment {
  const attachment: NoteAttachment = {
    id: generateId(),
    noteId,
    kind,
    uri,
    thumbnailUri: null,
    durationMs: durationMs ?? null,
    createdAt: Date.now(),
  };
  getDb()
    .insert(noteAttachments)
    .values({ ...attachment, userId: LOCAL_USER_ID })
    .run();
  return attachment;
}

export function deleteNoteAttachment(id: string) {
  getDb().update(noteAttachments).set({ deletedAt: Date.now() }).where(eq(noteAttachments.id, id)).run();
}

// ---- Backlinks — `[[Note Title]]` mentions, the seed of the knowledge graph ----

const WIKI_LINK_PATTERN = /\[\[([^[\]]+)\]\]/g;

/** Re-derives this note's outgoing `mentions` links from its body text. Called on every body save. */
export function syncNoteLinks(noteId: string, body: string) {
  const db = getDb();
  db.delete(entryLinks).where(and(eq(entryLinks.sourceType, 'note'), eq(entryLinks.sourceId, noteId), eq(entryLinks.relation, 'mentions'))).run();

  const titles = [...body.matchAll(WIKI_LINK_PATTERN)].map((match) => match[1].trim());
  if (titles.length === 0) return;

  const allNotes = db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, LOCAL_USER_ID), isNull(notes.deletedAt)))
    .all();

  const seen = new Set<string>();
  for (const title of titles) {
    const target = allNotes.find((note) => note.id !== noteId && note.title.toLowerCase() === title.toLowerCase());
    if (!target || seen.has(target.id)) continue;
    seen.add(target.id);
    db.insert(entryLinks)
      .values({
        id: generateId(),
        userId: LOCAL_USER_ID,
        sourceType: 'note',
        sourceId: noteId,
        targetType: 'note',
        targetId: target.id,
        relation: 'mentions',
        createdAt: Date.now(),
      })
      .run();
  }
}

/** Notes that link TO this one — i.e. this note's backlinks panel. */
export function listBacklinksForNote(noteId: string): NoteBacklink[] {
  const links = getDb()
    .select()
    .from(entryLinks)
    .where(and(eq(entryLinks.targetType, 'note'), eq(entryLinks.targetId, noteId), eq(entryLinks.relation, 'mentions')))
    .all();
  if (links.length === 0) return [];

  const sourceIds = links.map((link) => link.sourceId);
  return getDb()
    .select()
    .from(notes)
    .where(and(inArray(notes.id, sourceIds), isNull(notes.deletedAt)))
    .all()
    .map((note) => ({ id: note.id, title: note.title || 'Untitled note' }));
}
