import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  init: () => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  isInitialized: false,
  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, isLoading: false, isInitialized: true });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, isLoading: false });
    });
  },
  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
