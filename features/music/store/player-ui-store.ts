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
};

export const usePlayerUiStore = create<PlayerUiState>()(
  persist(
    (set) => ({
      x: null,
      y: null,
      setPosition: (x, y) => set({ x, y }),
    }),
    { name: 'player-ui-store', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
