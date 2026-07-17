import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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

/** Dumps every table to a single JSON file and opens the native share sheet —
 * the closest thing this local-only app has to a backup, since there's no
 * real account/cloud sync to restore from yet. */
export async function exportAllData(): Promise<void> {
  const db = getDb();
  const data = {
    exportedAt: new Date().toISOString(),
    taskCategories: db.select().from(taskCategories).all(),
    tasks: db.select().from(tasks).all(),
    noteCategories: db.select().from(noteCategories).all(),
    notes: db.select().from(notes).all(),
    noteTags: db.select().from(noteTags).all(),
    noteTagLinks: db.select().from(noteTagLinks).all(),
    noteAttachments: db.select().from(noteAttachments).all(),
    habitCategories: db.select().from(habitCategories).all(),
    habits: db.select().from(habits).all(),
    habitLogs: db.select().from(habitLogs).all(),
    habitSkips: db.select().from(habitSkips).all(),
    habitRoutines: db.select().from(habitRoutines).all(),
    habitRoutineItems: db.select().from(habitRoutineItems).all(),
    journalEntries: db.select().from(journalEntries).all(),
    journalPrompts: db.select().from(journalPrompts).all(),
    journalReflections: db.select().from(journalReflections).all(),
    journalAttachments: db.select().from(journalAttachments).all(),
    entryLinks: db.select().from(entryLinks).all(),
    calendarEvents: db.select().from(calendarEvents).all(),
    waterIntakeLogs: db.select().from(waterIntakeLogs).all(),
    songs: db.select().from(songs).all(),
    playlists: db.select().from(playlists).all(),
    playlistSongs: db.select().from(playlistSongs).all(),
  };

  const file = new File(Paths.cache, `lifeos-export-${Date.now()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export LifeOS data' });
  }
}
