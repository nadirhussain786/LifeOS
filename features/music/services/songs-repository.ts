import { and, eq, inArray, isNull } from 'drizzle-orm';
import { File } from 'expo-file-system';

import { getDb } from '@/database/client';
import { playlistSongs, songs } from '@/database/schema';
import { generateId } from '@/lib/id';
import { LOCAL_USER_ID } from '@/lib/local-user';
import type { Song } from '@/features/music/types/music.types';

function toSong(row: typeof songs.$inferSelect): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    uri: row.uri,
    durationMs: row.durationMs,
    addedAt: row.addedAt,
  };
}

export function listSongs(): Song[] {
  return getDb()
    .select()
    .from(songs)
    .where(and(eq(songs.userId, LOCAL_USER_ID), isNull(songs.deletedAt)))
    .orderBy(songs.addedAt)
    .all()
    .map(toSong);
}

export function getSong(id: string): Song | null {
  const row = getDb().select().from(songs).where(eq(songs.id, id)).get();
  return row ? toSong(row) : null;
}

export function getSongsByIds(ids: string[]): Song[] {
  if (ids.length === 0) return [];
  const rows = getDb().select().from(songs).where(inArray(songs.id, ids)).all();
  const byId = new Map(rows.map((row) => [row.id, toSong(row)]));
  return ids.map((id) => byId.get(id)).filter((song): song is Song => song != null);
}

/** Inserts an already-imported song row — the file copy + duration probe
 * happen in song-import.ts, which calls this once both are done. */
export function createSong(input: { title: string; artist: string | null; uri: string; durationMs: number | null }): Song {
  const now = Date.now();
  const song: Song = {
    id: generateId(),
    title: input.title,
    artist: input.artist,
    uri: input.uri,
    durationMs: input.durationMs,
    addedAt: now,
  };
  getDb()
    .insert(songs)
    .values({ ...song, userId: LOCAL_USER_ID, createdAt: now, syncStatus: 'pending' })
    .run();
  return song;
}

export function updateSong(id: string, input: { title?: string; artist?: string | null }) {
  getDb().update(songs).set({ ...input, syncStatus: 'pending' }).where(eq(songs.id, id)).run();
}

/** Removes the song everywhere (library, every playlist) and frees the disk
 * space its imported copy used — unlike tasks/notes, there's no "trash" UI
 * to restore a multi-megabyte audio file from, so this deletes the file
 * immediately rather than only soft-deleting the metadata row. */
export function deleteSong(id: string) {
  const song = getSong(id);
  const db = getDb();
  db.delete(playlistSongs).where(eq(playlistSongs.songId, id)).run();
  db.update(songs).set({ deletedAt: Date.now(), syncStatus: 'pending' }).where(eq(songs.id, id)).run();

  if (song) {
    const file = new File(song.uri);
    if (file.exists) file.delete();
  }
}
