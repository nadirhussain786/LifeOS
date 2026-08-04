import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Buffered usage counters.
 *
 * The shape is the point: one row per (day, module) holding two integers, which
 * is enough to answer "how many people are active" and "which modules do they
 * actually use" and structurally incapable of answering anything about content.
 * There is no event log, no timestamps per action, and no free-text field.
 *
 * Buffered rather than sent per tap: a session becomes one request on
 * backgrounding. Persisted rather than kept in memory, because a counter
 * dropped when the app is killed is a counter that under-reports forever and
 * never says so.
 */

export type UsageEntry = {
  /** Local calendar day, `YYYY-MM-DD`. The server re-checks this is recent. */
  day: string;
  module: string;
  opens: number;
  writes: number;
};

/** Matches record_usage()'s window in 0010 — older entries are dropped there,
 * so keeping them here would buffer them forever. */
const MAX_AGE_DAYS = 7;

const keyOf = (day: string, module: string) => `${day}:${module}`;

export function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function isRecent(day: string): boolean {
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 86400000).toISOString().slice(0, 10);
  return day >= cutoff;
}

type UsageState = {
  /** Master opt-out. On by default and disclosed in the privacy policy; the
   * toggle lives in Settings → Sync & Account. */
  enabled: boolean;
  /** Counters awaiting a flush, keyed `${day}:${module}`. */
  pending: Record<string, UsageEntry>;
  /** Day of the last signed-out ping, so foregrounding ten times is one call. */
  lastAnonPingDay: string | null;
  hydrated: boolean;

  setEnabled: (enabled: boolean) => void;
  track: (module: string, kind: 'open' | 'write', amount?: number) => void;
  /** Removes and returns everything buffered, dropping anything too old for
   * the server to accept. */
  drain: () => UsageEntry[];
  /** Puts entries back after a failed flush, merging with whatever arrived in
   * the meantime rather than clobbering it. */
  restore: (entries: UsageEntry[]) => void;
  setLastAnonPingDay: (day: string) => void;
};

export const useUsageStore = create<UsageState>()(
  persist(
    (set, get) => ({
      enabled: true,
      pending: {},
      lastAnonPingDay: null,
      hydrated: false,

      setEnabled: (enabled) => set(enabled ? { enabled } : { enabled, pending: {} }),

      track: (module, kind, amount = 1) => {
        if (!get().enabled || amount <= 0) return;
        const day = today();
        const key = keyOf(day, module);
        set((s) => {
          const current = s.pending[key] ?? { day, module, opens: 0, writes: 0 };
          return {
            pending: {
              ...s.pending,
              [key]: {
                ...current,
                opens: current.opens + (kind === 'open' ? amount : 0),
                writes: current.writes + (kind === 'write' ? amount : 0),
              },
            },
          };
        });
      },

      drain: () => {
        const entries = Object.values(get().pending).filter((e) => isRecent(e.day));
        set({ pending: {} });
        return entries;
      },

      restore: (entries) =>
        set((s) => {
          const pending = { ...s.pending };
          for (const e of entries) {
            if (!isRecent(e.day)) continue;
            const key = keyOf(e.day, e.module);
            const current = pending[key];
            pending[key] = current
              ? { ...current, opens: current.opens + e.opens, writes: current.writes + e.writes }
              : e;
          }
          return { pending };
        }),

      setLastAnonPingDay: (lastAnonPingDay) => set({ lastAnonPingDay }),
    }),
    {
      name: 'usage-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated: _hydrated, ...rest }) => rest,
      onRehydrateStorage: () => () => {
        useUsageStore.setState({ hydrated: true });
      },
    },
  ),
);

/** Callable outside React — the router bridge and the sync engine both report
 * from places that are not components. */
export function trackModuleOpen(module: string): void {
  useUsageStore.getState().track(module, 'open');
}

export function trackModuleWrites(module: string, rows: number): void {
  useUsageStore.getState().track(module, 'write', rows);
}
