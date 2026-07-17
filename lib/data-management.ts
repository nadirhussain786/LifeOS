import { eq } from 'drizzle-orm';
import { Directory, Paths } from 'expo-file-system';

import { getDb } from '@/database/client';
import {
  calendarEvents,
  entryLinks,
  habitCategories,
  habitLogs,
  habitRoutineItems,
  habitRoutines,
  habits,
  habitSkips,
  journalAttachments,
  journalEntries,
  journalPrompts,
  journalReflections,
  noteAttachments,
  noteCategories,
  noteTagLinks,
  noteTags,
  notes,
  playlists,
  playlistSongs,
  songs,
  taskCategories,
  tasks,
  waterIntakeLogs,
} from '@/database/schema';
import { LOCAL_USER_ID } from '@/lib/local-user';

/** Wipes every table this app writes to — the local-only equivalent of
 * "delete my account." Join tables and logs go first so nothing is ever
 * left pointing at an already-deleted parent row mid-wipe (expo-sqlite
 * doesn't enforce foreign keys, but there's no reason to rely on that).
 * journal_prompts is scoped to LOCAL_USER_ID only — the seeded prompts with
 * a null user_id are app content, not user data, and survive a reset. */
export function clearAllData() {
  const db = getDb();

  db.delete(noteTagLinks).run();
  db.delete(habitRoutineItems).run();
  db.delete(journalReflections).run();
  db.delete(entryLinks).run();
  db.delete(noteAttachments).run();
  db.delete(journalAttachments).run();
  db.delete(habitLogs).run();
  db.delete(habitSkips).run();
  db.delete(calendarEvents).run();
  db.delete(waterIntakeLogs).run();
  db.delete(playlistSongs).run();

  db.delete(tasks).run();
  db.delete(notes).run();
  db.delete(noteTags).run();
  db.delete(habits).run();
  db.delete(habitRoutines).run();
  db.delete(journalEntries).run();
  db.delete(journalPrompts).where(eq(journalPrompts.userId, LOCAL_USER_ID)).run();
  db.delete(songs).run();
  db.delete(playlists).run();

  db.delete(taskCategories).run();
  db.delete(noteCategories).run();
  db.delete(habitCategories).run();

  // Songs are imported copies on disk, not just metadata — free the space
  // in one shot rather than deleting each file individually.
  const songsDirectory = new Directory(Paths.document, 'songs');
  if (songsDirectory.exists) songsDirectory.delete();
}
