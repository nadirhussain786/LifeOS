import { and, desc, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/database/client';
import { noteCategories, notes } from '@/database/schema';
import { generateId } from '@/lib/id';
import { LOCAL_USER_ID } from '@/lib/local-user';
import type { CreateNoteInput, Note, NoteCategory, UpdateNoteInput } from '@/features/notes/types/note.types';

export function listNotes(): Note[] {
  return getDb()
    .select()
    .from(notes)
    .where(and(eq(notes.userId, LOCAL_USER_ID), isNull(notes.deletedAt)))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt))
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
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .insert(notes)
    .values({ ...note, userId: LOCAL_USER_ID, syncStatus: 'pending' })
    .run();
  return note;
}

export function updateNote(id: string, input: UpdateNoteInput) {
  getDb()
    .update(notes)
    .set({ ...input, updatedAt: Date.now(), syncStatus: 'pending' })
    .where(eq(notes.id, id))
    .run();
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
