import { create } from 'zustand';

/** Runtime-only lock state (never persisted). Whether the lock is *enabled*
 *  lives in the profile store; this is just "is the shield currently up". */
type AppLockState = {
  isLocked: boolean;
  lock: () => void;
  unlock: () => void;
};

export const useAppLockStore = create<AppLockState>((set) => ({
  isLocked: false,
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
}));
