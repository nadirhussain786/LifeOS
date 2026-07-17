import { and, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/database/client';
import { playlists, playlistSongs } from '@/database/schema';
import { generateId } from '@/lib/id';
import { LOCAL_USER_ID } from '@/lib/local-user';
import type { Playlist } from '@/features/music/types/music.types';

function songCountFor(playlistId: string): number {
  return getDb().select().from(playlistSongs).where(eq(playlistSongs.playlistId, playlistId)).all().length;
}

function toPlaylist(row: typeof playlists.$inferSelect): Playlist {
  return {
    id: row.id,
    name: row.name,
    colorToken: row.colorToken,
    position: row.position,
    songCount: songCountFor(row.id),
  };
}

export function listPlaylists(): Playlist[] {
  return getDb()
    .select()
    .from(playlists)
    .where(and(eq(playlists.userId, LOCAL_USER_ID), isNull(playlists.deletedAt)))
    .orderBy(playlists.position)
    .all()
    .map(toPlaylist);
}

export function getPlaylist(id: string): Playlist | null {
  const row = getDb().select().from(playlists).where(eq(playlists.id, id)).get();
  return row ? toPlaylist(row) : null;
}

export function createPlaylist(name: string, colorToken: string | null): Playlist {
  const db = getDb();
  const now = Date.now();
  const maxPosition = db
    .select()
    .from(playlists)
    .where(eq(playlists.userId, LOCAL_USER_ID))
    .all()
    .reduce((max, row) => Math.max(max, row.position), -1);

  const playlist: Playlist = { id: generateId(), name, colorToken, position: maxPosition + 1, songCount: 0 };
  db.insert(playlists)
    .values({
      id: playlist.id,
      userId: LOCAL_USER_ID,
      name: playlist.name,
      colorToken: playlist.colorToken,
      position: playlist.position,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })
    .run();
  return playlist;
}

export function renamePlaylist(id: string, name: string) {
  getDb().update(playlists).set({ name, updatedAt: Date.now(), syncStatus: 'pending' }).where(eq(playlists.id, id)).run();
}

export function deletePlaylist(id: string) {
  const db = getDb();
  db.update(playlists).set({ deletedAt: Date.now(), syncStatus: 'pending' }).where(eq(playlists.id, id)).run();
  db.delete(playlistSongs).where(eq(playlistSongs.playlistId, id)).run();
}

/** Ordered song ids for one playlist. */
export function listPlaylistSongIds(playlistId: string): string[] {
  return getDb()
    .select()
    .from(playlistSongs)
    .where(eq(playlistSongs.playlistId, playlistId))
    .orderBy(playlistSongs.position)
    .all()
    .map((row) => row.songId);
}

export function addSongToPlaylist(playlistId: string, songId: string) {
  const db = getDb();
  const existing = db
    .select()
    .from(playlistSongs)
    .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.songId, songId)))
    .get();
  if (existing) return;

  const maxPosition = db
    .select()
    .from(playlistSongs)
    .where(eq(playlistSongs.playlistId, playlistId))
    .all()
    .reduce((max, row) => Math.max(max, row.position), -1);
  db.insert(playlistSongs).values({ playlistId, songId, position: maxPosition + 1 }).run();
}

export function removeSongFromPlaylist(playlistId: string, songId: string) {
  getDb()
    .delete(playlistSongs)
    .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.songId, songId)))
    .run();
}

export function reorderPlaylistSongs(playlistId: string, orderedSongIds: string[]) {
  const db = getDb();
  orderedSongIds.forEach((songId, index) => {
    db.update(playlistSongs)
      .set({ position: index })
      .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.songId, songId)))
      .run();
  });
}
