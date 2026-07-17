import { createAudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

import { createSong } from '@/features/music/services/songs-repository';
import type { Song } from '@/features/music/types/music.types';

// Built lazily (not at module scope) — expo-router eagerly evaluates every
// route file's module graph to build its route table, so a top-level
// Paths.document/Directory call here would risk crashing the whole app on
// any platform where it doesn't resolve cleanly (see database/client.ts for
// the same concern with openDatabaseSync).
function getSongsDirectory(): Directory {
  const directory = new Directory(Paths.document, 'songs');
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return directory;
}

function titleFromFilename(name: string): string {
  return name.replace(/\.[^./]+$/, '');
}

/** Briefly loads a file into a throwaway player just to read its duration,
 * then releases it — so the library shows a real duration immediately
 * instead of only learning it the first time the song is played. */
function probeDurationMs(uri: string): Promise<number | null> {
  return new Promise((resolve) => {
    const player = createAudioPlayer(uri);
    let settled = false;

    const finish = (durationMs: number | null) => {
      if (settled) return;
      settled = true;
      subscription.remove();
      player.remove();
      resolve(durationMs);
    };

    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded && status.duration > 0) finish(Math.round(status.duration * 1000));
    });

    setTimeout(() => finish(null), 6000);
  });
}

/** Copies each picked file into the app's own document storage — a
 * document-picker URI isn't guaranteed to survive a relaunch (especially an
 * iCloud-backed file on iOS) — then probes duration before writing the
 * library row. Skips (rather than aborts) any file that fails to copy. */
export async function importSongs(): Promise<Song[]> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: true });
  if (result.canceled || !result.assets) return [];

  const songsDirectory = getSongsDirectory();

  const imported: Song[] = [];
  for (const asset of result.assets) {
    const destination = new File(songsDirectory, `${Date.now()}-${asset.name}`);
    try {
      new File(asset.uri).copy(destination);
    } catch {
      continue;
    }

    const durationMs = await probeDurationMs(destination.uri);
    imported.push(createSong({ title: titleFromFilename(asset.name), artist: null, uri: destination.uri, durationMs }));
  }

  return imported;
}
