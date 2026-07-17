import { create } from 'zustand';

import type { RepeatMode, Song } from '@/features/music/types/music.types';

type PlayerState = {
  /** Queue in its "natural" (library/playlist) order — restored when shuffle turns off. */
  originalQueue: Song[];
  /** Queue in actual playback order — equals originalQueue unless shuffle is on. */
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
};

type PlayerActions = {
  setQueue: (originalQueue: Song[], queue: Song[], currentIndex: number) => void;
  setIndex: (index: number) => void;
  setPlaybackState: (isPlaying: boolean, positionMs: number, durationMs: number) => void;
  setShuffle: (shuffle: boolean) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  clear: () => void;
};

const initialState: PlayerState = {
  originalQueue: [],
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  positionMs: 0,
  durationMs: 0,
  shuffle: false,
  repeatMode: 'off',
};

/** Pure reactive state for the music player — every mutation is driven by
 * features/music/services/player-controller.ts, which owns the actual
 * expo-audio player instance. Screens only ever read from this store and
 * call the controller's functions; they never touch the player directly. */
export const usePlayerStore = create<PlayerState & PlayerActions>()((set) => ({
  ...initialState,
  setQueue: (originalQueue, queue, currentIndex) => set({ originalQueue, queue, currentIndex }),
  setIndex: (currentIndex) => set({ currentIndex }),
  setPlaybackState: (isPlaying, positionMs, durationMs) => set({ isPlaying, positionMs, durationMs }),
  setShuffle: (shuffle) => set({ shuffle }),
  setRepeatMode: (repeatMode) => set({ repeatMode }),
  clear: () => set(initialState),
}));

export function selectCurrentSong(state: PlayerState): Song | null {
  return state.currentIndex >= 0 ? (state.queue[state.currentIndex] ?? null) : null;
}
