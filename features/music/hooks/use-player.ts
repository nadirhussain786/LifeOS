import * as playerController from '@/features/music/services/player-controller';
import { selectCurrentSong, usePlayerStore } from '@/features/music/store/player-store';

/** Bundles the reactive player state with the controller's imperative
 * actions (play/pause/next/previous/seek/shuffle/repeat) so screens import
 * one hook instead of wiring the store and controller separately. */
export function useNowPlaying() {
  const currentSong = usePlayerStore(selectCurrentSong);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const durationMs = usePlayerStore((state) => state.durationMs);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);

  return {
    currentSong,
    isPlaying,
    positionMs,
    durationMs,
    shuffle,
    repeatMode,
    queue,
    currentIndex,
    ...playerController,
  };
}
