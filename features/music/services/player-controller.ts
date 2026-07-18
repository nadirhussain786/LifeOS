import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { usePlayerStore } from '@/features/music/store/player-store';
import type { RepeatMode, Song } from '@/features/music/types/music.types';

let player: AudioPlayer | null = null;
let audioModeConfigured = false;
let lockScreenActive = false;

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
    // Sleep timer: this listener keeps firing while audio plays (even in the
    // background), so it's a reliable place to enforce the auto-stop.
    if (sleepTimerEndsAt != null && Date.now() >= sleepTimerEndsAt) {
      sleepTimerEndsAt = null;
      usePlayerStore.getState().setSleepTimerEndsAt(null);
      player?.pause();
    }
    if (status.didJustFinish) handleTrackFinished();
  });
  return player;
}

let sleepTimerEndsAt: number | null = null;

/** Arms (minutes > 0) or cancels (null) the sleep timer. Enforcement happens
 * in the playback-status listener so it fires even with the app backgrounded. */
export function setSleepTimer(minutes: number | null) {
  sleepTimerEndsAt = minutes ? Date.now() + minutes * 60_000 : null;
  usePlayerStore.getState().setSleepTimerEndsAt(sleepTimerEndsAt);
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

  // Drive the OS lock-screen / notification now-playing surface. expo-audio
  // wires play/pause + seek to this player natively; next/previous aren't
  // remote-controllable through expo-audio, so we expose seek as the scrub
  // affordance there and keep next/prev to the in-app controls.
  const metadata = { title: song.title, artist: song.artist ?? undefined };
  if (lockScreenActive) {
    p.updateLockScreenMetadata(metadata);
  } else {
    p.setActiveForLockScreen(true, metadata, { showSeekForward: true, showSeekBackward: true });
    lockScreenActive = true;
  }

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

/** Turns shuffle on and plays the whole set from a random starting point —
 * backs the library's "Shuffle all" button. */
export async function shuffleAll(songs: Song[]) {
  if (songs.length === 0) return;
  usePlayerStore.getState().setShuffle(true);
  await playQueue(songs, Math.floor(Math.random() * songs.length));
}

/** Jumps straight to a track in the current queue — backs tapping a row in the
 * "Up Next" list. */
export function jumpToIndex(index: number) {
  const { queue } = usePlayerStore.getState();
  if (index < 0 || index >= queue.length) return;
  loadIndex(index, true);
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

/** Dismisses playback entirely — stops audio, tears down the lock-screen
 * controls, releases the native player, and clears the queue. Backs the
 * mini-player's swipe-to-dismiss / close action. */
export function clearPlayer() {
  // Pause FIRST so audio actually stops immediately — releasing the native
  // player without pausing can leave the current buffer playing out (and the
  // only way to stop it becomes the OS media widget).
  try {
    player?.pause();
  } catch {
    // no-op
  }
  try {
    player?.clearLockScreenControls();
  } catch {
    // no-op if never activated
  }
  try {
    player?.remove();
  } catch {
    // best-effort release
  }
  player = null;
  lockScreenActive = false;
  sleepTimerEndsAt = null;
  usePlayerStore.getState().clear();
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
