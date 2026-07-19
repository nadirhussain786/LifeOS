import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { defaultModuleFlags, type SyncModule } from '@/features/sync/config/sync-tables';

export type SyncStatus = 'idle' | 'syncing' | 'error';

type SyncState = {
  /** Master switch for background sync (manual "Sync now" still works). */
  autoSync: boolean;
  /** Per-module allow-sync consent. */
  modules: Record<SyncModule, boolean>;
  /** Per-table high-water marks (max updated_at seen) so each sync only moves
   * the delta. Keyed by table name. */
  pushCursors: Record<string, number>;
  pullCursors: Record<string, number>;
  lastSyncedAt: number | null;

  // Transient (not persisted):
  status: SyncStatus;
  lastError: string | null;

  setAutoSync: (on: boolean) => void;
  setModuleEnabled: (module: SyncModule, on: boolean) => void;
  setCursor: (kind: 'push' | 'pull', table: string, value: number) => void;
  setLastSyncedAt: (ts: number) => void;
  setStatus: (status: SyncStatus, error?: string | null) => void;
  /** Wipes cursors — used on account switch so the next sync is a full pull. */
  resetCursors: () => void;
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      autoSync: true,
      modules: defaultModuleFlags(),
      pushCursors: {},
      pullCursors: {},
      lastSyncedAt: null,
      status: 'idle',
      lastError: null,

      setAutoSync: (autoSync) => set({ autoSync }),
      setModuleEnabled: (module, on) => set((s) => ({ modules: { ...s.modules, [module]: on } })),
      setCursor: (kind, table, value) =>
        set((s) => {
          const key = kind === 'push' ? 'pushCursors' : 'pullCursors';
          return { [key]: { ...s[key], [table]: value } } as Partial<SyncState>;
        }),
      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
      setStatus: (status, lastError = null) => set({ status, lastError }),
      resetCursors: () => set({ pushCursors: {}, pullCursors: {} }),
    }),
    {
      name: 'sync-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist settings + cursors; status/lastError are runtime-only.
      partialize: (s) => ({
        autoSync: s.autoSync,
        modules: s.modules,
        pushCursors: s.pushCursors,
        pullCursors: s.pullCursors,
        lastSyncedAt: s.lastSyncedAt,
      }),
      // Backfill any module added in a later release.
      merge: (persisted, current) => {
        const saved = persisted as Partial<SyncState> | undefined;
        return {
          ...current,
          ...saved,
          modules: { ...defaultModuleFlags(), ...(saved?.modules ?? {}) },
        };
      },
    },
  ),
);

export function isModuleSyncEnabled(module: SyncModule): boolean {
  return useSyncStore.getState().modules[module] ?? false;
}
