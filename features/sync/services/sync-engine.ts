import { getRawDb } from '@/database/client';
import { useAuthStore } from '@/features/auth/services/auth-store';
import { SYNC_MODULES } from '@/features/sync/config/sync-tables';
import { useSyncStore } from '@/features/sync/store/sync-store';
import { LOCAL_USER_ID } from '@/lib/local-user';
import { supabase } from '@/lib/supabase';

/**
 * Offline-first sync engine. The local DB is always single-user (`user_id =
 * 'local'`); the engine swaps `'local' ↔ the authenticated uid` at the Supabase
 * boundary, so a guest's existing rows upload to their account automatically on
 * first sync (no migration pass). Change detection and conflict resolution are
 * last-write-wins by `updated_at`, tracked with per-table high-water cursors so
 * each run only moves the delta. See features/sync/config/sync-tables.ts for
 * which tables participate.
 */

type Row = Record<string, unknown>;

function localColumns(table: string): Set<string> {
  const info = getRawDb().getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  return new Set(info.map((c) => c.name));
}

/** Uploads local rows changed since the last push for one table. */
async function pushTable(uid: string, table: string): Promise<void> {
  const raw = getRawDb();
  const cursor = useSyncStore.getState().pushCursors[table] ?? 0;
  const rows = raw.getAllSync<Row>(
    `SELECT * FROM ${table} WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC`,
    [LOCAL_USER_ID, cursor],
  );
  if (rows.length === 0) return;

  const payload = rows.map((r) => ({ ...r, user_id: uid }));
  const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
  if (error) throw new Error(`push ${table}: ${error.message}`);

  const maxUpdated = rows.reduce((m, r) => Math.max(m, Number(r.updated_at ?? 0)), cursor);
  useSyncStore.getState().setCursor('push', table, maxUpdated);
}

/** Downloads server rows changed since the last pull for one table, applying
 * each only if it's newer than the local copy (last-write-wins). */
async function pullTable(uid: string, table: string): Promise<void> {
  const raw = getRawDb();
  const cursor = useSyncStore.getState().pullCursors[table] ?? 0;
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', uid)
    .gt('updated_at', cursor)
    .order('updated_at', { ascending: true });
  if (error) throw new Error(`pull ${table}: ${error.message}`);
  if (!data || data.length === 0) return;

  const cols = localColumns(table);
  let maxUpdated = cursor;

  for (const remote of data as Row[]) {
    maxUpdated = Math.max(maxUpdated, Number(remote.updated_at ?? 0));
    const local = raw.getFirstSync<{ updated_at: number | null }>(`SELECT updated_at FROM ${table} WHERE id = ?`, [
      remote.id as string,
    ]);
    // Last-write-wins: skip if the local copy is the same age or newer.
    if (local && Number(local.updated_at ?? 0) >= Number(remote.updated_at ?? 0)) continue;

    const row: Row = { ...remote, user_id: LOCAL_USER_ID };
    const keys = Object.keys(row).filter((k) => cols.has(k));
    const placeholders = keys.map(() => '?').join(', ');
    raw.runSync(
      `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
      keys.map((k) => row[k] as never),
    );
  }
  useSyncStore.getState().setCursor('pull', table, maxUpdated);
}

let inFlight: Promise<void> | null = null;

/** Runs a full sync (deduped — concurrent calls share one run). No-ops for
 * guests. Never throws; failures land in the store's `status`/`lastError`. */
export function syncNow(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(): Promise<void> {
  const uid = useAuthStore.getState().user?.id;
  if (!uid) return; // guests keep everything local

  const store = useSyncStore.getState();
  store.setStatus('syncing');
  try {
    for (const mod of SYNC_MODULES) {
      if (!(store.modules[mod.key] ?? false)) continue;
      for (const table of mod.tables) {
        await pushTable(uid, table);
        await pullTable(uid, table);
      }
    }
    useSyncStore.getState().setStatus('idle');
    useSyncStore.getState().setLastSyncedAt(Date.now());
  } catch (e) {
    useSyncStore.getState().setStatus('error', e instanceof Error ? e.message : 'Sync failed');
  }
}
