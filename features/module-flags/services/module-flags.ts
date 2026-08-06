import {
  useModuleFlagsStore,
  type ModuleFlag,
} from '@/features/module-flags/store/module-flags-store';
import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';

/**
 * Pulls the remote module switches.
 *
 * Never throws, and — importantly — never clears the cache on failure. A failed
 * fetch leaves the last known state in place rather than reverting to "no
 * overrides": if the operator has pulled a module because it corrupts data,
 * a flaky connection must not quietly hand it back.
 *
 * The mirror of that rule is in the store: a module with no entry is enabled.
 * So the failure modes are "keep the last instruction" and "assume fine", which
 * between them cover every case without ever bricking the app.
 */
let inFlight: Promise<void> | null = null;

export function refreshModuleFlags(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = runRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runRefresh(): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const { data, error } = await supabase.from('module_flags').select('module, enabled, message');
    if (error || !data) return;

    const flags: Record<string, ModuleFlag> = {};
    for (const row of data) {
      const module = typeof row.module === 'string' ? row.module : null;
      if (!module) continue;
      flags[module] = {
        enabled: row.enabled !== false,
        message: typeof row.message === 'string' && row.message.length > 0 ? row.message : null,
      };
    }
    useModuleFlagsStore.getState().setFlags(flags);
  } catch {
    // Keep whatever we already had — see the note above.
  }
}
