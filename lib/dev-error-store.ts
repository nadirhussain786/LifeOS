import { create } from 'zustand';

type DevErrorState = {
  message: string | null;
  setError: (message: string) => void;
  clear: () => void;
};

/** Dev-only surface for query/mutation failures — see components/dev/dev-error-banner.tsx.
 * Exists because silent DB/query errors have repeatedly cost real debugging
 * time in this app; this makes them visible on-device without Metro logs. */
export const useDevErrorStore = create<DevErrorState>((set) => ({
  message: null,
  setError: (message) => set({ message }),
  clear: () => set({ message: null }),
}));
