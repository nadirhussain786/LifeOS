import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { usePlayerStore } from '@/features/music/store/player-store';
import type { RepeatMode, Song } from '@/features/music/types/music.types';

let player: AudioPlayer | null = null;
let audioModeConfigured = false;

function shuffleFrom<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function ensurePlayer(): AudioPlayer {
  if (player) return player;

  player = createAudioPlayer(undefined, { updateInterval: 500 });
  player.addListener('playbackStatusUpdate', (status) => {
    usePlayerStore
      .getState()
      .setPlaybackState(status.playing, Math.round(status.currentTime * 1000), Math.round((status.duration || 0) * 1000));
    if (status.didJustFinish) handleTrackFinished();
  });
  return player;
}

async function configureAudioMode() {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  // 'doNotMix' matches how a dedicated music player is expected to behave —
  // it takes over audio focus rather than layering under whatever else is playing.
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
}

function loadIndex(index: number, autoplay: boolean) {
  const { queue } = usePlayerStore.getState();
  const song = queue[index];
  if (!song) return;

  const p = ensurePlayer();
  usePlayerStore.getState().setIndex(index);
  p.replace(song.uri);
  p.setActiveForLockScreen(true, { title: song.title, artist: song.artist ?? undefined }, { showSeekForward: true, showSeekBackward: true });
  if (autoplay) p.play();
}

function handleTrackFinished() {
  const { repeatMode, currentIndex, queue } = usePlayerStore.getState();
  if (repeatMode === 'one') {
    player?.seekTo(0);
    player?.play();
    return;
  }

  const isLast = currentIndex >= queue.length - 1;
  if (isLast && repeatMode !== 'all') {
    player?.pause();
    player?.seekTo(0);
    return;
  }
  loadIndex(isLast ? 0 : currentIndex + 1, true);
}

// Keeps the requested starting song first, shuffles everything after it.
function shuffleAround(songs: Song[], startIndex: number): Song[] {
  const start = songs[startIndex];
  const rest = songs.filter((_, i) => i !== startIndex);
  return [start, ...shuffleFrom(rest)];
}

/** Starts playing `songs` as a fresh queue beginning at `startIndex` —
 * called whenever a screen taps a song to play (library, playlist detail). */
export async function playQueue(songs: Song[], startIndex: number) {
  if (songs.length === 0) return;
  await configureAudioMode();

  const { shuffle } = usePlayerStore.getState();
  const queue = shuffle ? shuffleAround(songs, startIndex) : songs;
  const newIndex = shuffle ? 0 : startIndex;
  usePlayerStore.getState().setQueue(songs, queue, newIndex);
  loadIndex(newIndex, true);
}

export function togglePlayPause() {
  if (usePlayerStore.getState().currentIndex < 0) return;
  const p = ensurePlayer();
  if (p.playing) p.pause();
  else p.play();
}

export function playNext() {
  const { currentIndex, queue, repeatMode } = usePlayerStore.getState();
  if (queue.length === 0) return;
  const isLast = currentIndex >= queue.length - 1;
  if (isLast && repeatMode !== 'all') return;
  loadIndex(isLast ? 0 : currentIndex + 1, true);
}

/** Jumps to the previous track, unless we're more than 3s into the current
 * one — then it restarts the current track instead, matching how most music
 * players treat "previous." */
export function playPrevious() {
  const { currentIndex, positionMs, queue } = usePlayerStore.getState();
  if (queue.length === 0) return;

  if (positionMs > 3000) {
    player?.seekTo(0);
    return;
  }
  const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
  loadIndex(prevIndex, true);
}

export function seekTo(seconds: number) {
  player?.seekTo(seconds);
}

export function setRepeatMode(mode: RepeatMode) {
  usePlayerStore.getState().setRepeatMode(mode);
}

export function toggleShuffle() {
  const { shuffle, queue, originalQueue, currentIndex } = usePlayerStore.getState();
  const nextShuffle = !shuffle;
  usePlayerStore.getState().setShuffle(nextShuffle);

  const activeSong = queue[currentIndex];
  if (!activeSong) return;

  if (nextShuffle) {
    const rest = queue.filter((_, i) => i !== currentIndex);
    usePlayerStore.getState().setQueue(originalQueue, [activeSong, ...shuffleFrom(rest)], 0);
  } else {
    const restoredIndex = Math.max(
      0,
      originalQueue.findIndex((song) => song.id === activeSong.id),
    );
    usePlayerStore.getState().setQueue(originalQueue, originalQueue, restoredIndex);
  }
}
