import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Cached remote module switches (0011's `module_flags`).
 *
 * Persisted so a cold start on a plane behaves like the last known good state
 * rather than briefly showing a module the operator has already pulled. But the
 * cache only ever holds *overrides* — a module with no entry is enabled, which
 * makes "we have never heard from the server" and "the server says everything
 * is fine" the same state, and that is the safe direction to collapse them in.
 */
export type ModuleFlag = { enabled: boolean; message: string | null };

type ModuleFlagsState = {
  /** Module id → override. Absent means enabled. */
  flags: Record<string, ModuleFlag>;
  fetchedAt: number | null;

  setFlags: (flags: Record<string, ModuleFlag>) => void;
  clear: () => void;
};

export const useModuleFlagsStore = create<ModuleFlagsState>()(
  persist(
    (set) => ({
      flags: {},
      fetchedAt: null,

      setFlags: (flags) => set({ flags, fetchedAt: Date.now() }),
      clear: () => set({ flags: {}, fetchedAt: null }),
    }),
    {
      name: 'module-flags-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * Whether a module may be shown. Callable outside React.
 *
 * Defaults to true for anything not explicitly switched off — an unreachable
 * server, an empty cache and a healthy module all have to look identical here,
 * or a network blip strips somebody's app down to nothing.
 */
export function isModuleEnabled(moduleId: string): boolean {
  return useModuleFlagsStore.getState().flags[moduleId]?.enabled !== false;
}

/** The operator's explanation, when there is one. */
export function moduleDisabledMessage(moduleId: string): string | null {
  const flag = useModuleFlagsStore.getState().flags[moduleId];
  return flag && !flag.enabled ? flag.message : null;
}
