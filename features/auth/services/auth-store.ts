import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isSupabaseConfigured } from '@/lib/env';
import { passwordResetRedirectUrl, supabase } from '@/lib/supabase';

/** Returned by auth actions when Supabase creds aren't present in the build —
 * avoids firing a doomed request at the placeholder host (which surfaces as a
 * confusing "Network request failed"). */
const NOT_CONFIGURED = {
  ok: false as const,
  error: 'Cloud sync isn’t set up on this build. Add your Supabase keys to .env, then fully restart with `npx expo start -c`.',
};

/** Result shape both sign-in and sign-up return so screens can show a friendly
 * error without importing Supabase's error types. */
export type AuthResult = { ok: true } | { ok: false; error: string };

export type AuthProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  /** True once the initial getSession has resolved — the gate waits for this
   * before deciding where to send the user (avoids a login-screen flash). */
  isInitialized: boolean;
  /** The user chose "continue without an account". Persisted so we don't force
   * the login screen on every launch. Cleared on sign-in. */
  isGuest: boolean;

  init: () => void;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  continueAsGuest: () => void;
  loadProfile: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<AuthResult>;
};

/** Maps Supabase's error messages to something a person wants to read. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'That email or password is incorrect.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists.';
  if (m.includes('password should be')) return 'Password must be at least 6 characters.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'That email address looks invalid.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first, then sign in.';
  if (m.includes('network')) return 'Network error — check your connection and try again.';
  return message;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      profile: null,
      isInitialized: false,
      isGuest: false,

      init: () => {
        // isInitialized MUST flip true no matter what — otherwise the root
        // layout / index screen stay on the loading state forever. getSession()
        // can reject (e.g. a token refresh hits the network and fails), so
        // guard with catch + finally rather than only handling the happy path.
        supabase.auth
          .getSession()
          .then(({ data }) => {
            set({ session: data.session, user: data.session?.user ?? null });
            if (data.session) void get().loadProfile();
          })
          .catch(() => {
            // Offline / unconfigured — proceed with no session (guest-capable).
          })
          .finally(() => set({ isInitialized: true }));

        // Safety net: never let the app hang on the loading state if getSession
        // somehow never settles (e.g. a stalled network layer).
        setTimeout(() => {
          if (!get().isInitialized) set({ isInitialized: true });
        }, 4000);

        supabase.auth.onAuthStateChange((_event, session) => {
          set({ session, user: session?.user ?? null, isInitialized: true });
          // A real session means we're no longer a guest.
          if (session) set({ isGuest: false });
          if (session) void get().loadProfile();
          else set({ profile: null });
        });
      },

      signIn: async (email, password) => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return { ok: false, error: friendly(error.message) };
        set({ isGuest: false });
        return { ok: true };
      },

      signUp: async (email, password, displayName) => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: displayName ? { data: { display_name: displayName.trim() } } : undefined,
        });
        if (error) return { ok: false, error: friendly(error.message) };
        set({ isGuest: false });
        return { ok: true };
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null, profile: null, isGuest: false });
      },

      resetPassword: async (email) => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: passwordResetRedirectUrl(),
        });
        if (error) return { ok: false, error: friendly(error.message) };
        return { ok: true };
      },

      updatePassword: async (newPassword) => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { ok: false, error: friendly(error.message) };
        return { ok: true };
      },

      continueAsGuest: () => set({ isGuest: true }),

      loadProfile: async () => {
        const user = get().user;
        if (!user) return;
        const { data } = await supabase.from('profiles').select('id, email, display_name').eq('id', user.id).maybeSingle();
        set({
          profile: {
            id: user.id,
            email: data?.email ?? user.email ?? null,
            displayName: data?.display_name ?? (user.user_metadata?.display_name as string | undefined) ?? null,
          },
        });
      },

      updateDisplayName: async (displayName) => {
        const user = get().user;
        if (!user) return { ok: false, error: 'You need to be signed in.' };
        const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', user.id);
        if (error) return { ok: false, error: friendly(error.message) };
        set((s) => ({ profile: s.profile ? { ...s.profile, displayName: displayName.trim() } : s.profile }));
        return { ok: true };
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only the guest choice needs persisting — Supabase persists the session
      // itself, and everything else is derived on init.
      partialize: (state) => ({ isGuest: state.isGuest }),
    },
  ),
);

/** True when the app should show its content (either signed in or an explicit
 * guest). Callable outside React. */
export function isSignedInOrGuest(): boolean {
  const s = useAuthStore.getState();
  return !!s.session || s.isGuest;
}
