import { create } from 'zustand';

/**
 * Tracks whether the cold-start branded splash has finished playing. Not
 * persisted — it resets to `false` on every launch by design.
 *
 * Screens reachable at cold start (login, onboarding, the recovery reset
 * screen) mount *underneath* the splash overlay, so an `autoFocus` field there
 * would pop the keyboard up behind the splash. They gate autofocus on
 * `complete` instead, keeping the keyboard down until the splash is gone.
 */
type SplashState = {
  complete: boolean;
  setComplete: () => void;
};

export const useSplashStore = create<SplashState>((set) => ({
  complete: false,
  setComplete: () => set({ complete: true }),
}));
