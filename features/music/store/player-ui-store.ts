import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Free-floating position (top-left, in px) of the draggable mini-player.
 * Null until the user first moves it — the bar then falls back to a sensible
 * default near the bottom. Persisted so the chosen spot survives relaunches. */
type PlayerUiState = {
  x: number | null;
  y: number | null;
  setPosition: (x: number, y: number) => void;
  /**
   * Whether the user has dismissed the floating bar for now. Hiding the widget
   * must never stop playback — a music player is expected to keep going in the
   * background, with the lock-screen controls still live. Deliberately *not*
   * persisted: it resets on relaunch, and starting a new queue clears it, so a
   * dismissed bar can always come back.
   */
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
};

export const usePlayerUiStore = create<PlayerUiState>()(
  persist(
    (set) => ({
      x: null,
      y: null,
      setPosition: (x, y) => set({ x, y }),
      hidden: false,
      setHidden: (hidden) => set({ hidden }),
    }),
    {
      name: 'player-ui-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Position persists; dismissal doesn't.
      partialize: ({ x, y }) => ({ x, y }),
    },
  ),
);
