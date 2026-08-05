import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  ALL_SYNC_TABLE_NAMES,
  ALL_SYNC_TABLES,
  SYNC_DEVICE_LOCAL_COLUMNS,
  SYNC_MODULES,
  type SyncTable,
} from '@/features/sync/config/sync-tables';

/**
 * The contract the sync engine silently depends on.
 *
 * `pushTable` selects `WHERE user_id = ? AND (updated_at, key) > cursor`, and
 * `pullTable` upserts by that same key. A registered table missing any of those
 * columns does not error — it just never syncs, or syncs wrongly, and looks
 * fine from the outside. That is exactly how the history tables came to be
 * excluded: they lacked `updated_at`, so signing in on a second device restored
 * every habit with a streak of zero and nothing said so.
 *
 * Read as source text rather than imported: schema.ts is executed for real in
 * database/schema.test.ts, which is the stronger check. What is answered here
 * is which columns each table *declares*, which is a static question.
 */

const ROOT = join(__dirname, '..', '..', '..');
const schema = readFileSync(join(ROOT, 'database', 'schema.ts'), 'utf8');

/** Columns in a table's raw CREATE TABLE — what actually reaches the device. */
function columnsOf(table: string): string[] {
  const match = schema.match(
    new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\n  \\);`),
  );
  if (!match) throw new Error(`no CREATE TABLE for "${table}" in schema.ts`);
  return match[1]
    .split('\n')
    .map((line) => line.trim().split(/[\s(]/)[0].replace(/,$/, ''))
    .filter(Boolean);
}

const named = (table: SyncTable) => table.name;

/** Every migration, concatenated in filename order. */
function migrations(): string {
  const directory = join(ROOT, 'supabase', 'migrations');
  return readdirSync(directory)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(directory, f), 'utf8'))
    .join('\n');
}

/** ADDITIVE_COLUMNS as `{ table: columnNames[] }`, parsed from the source. */
function additiveColumns(): Record<string, string[]> {
  const block =
    schema.match(/export const ADDITIVE_COLUMNS[\s\S]*?=\s*\{([\s\S]*?)\n\};/)?.[1] ?? '';
  const out: Record<string, string[]> = {};
  for (const match of block.matchAll(/^ {2}(\w+): \[([\s\S]*?)^ {2}\],$/gm)) {
    out[match[1]] = [...match[2].matchAll(/name: '(\w+)'/g)].map((m) => m[1]);
  }
  return out;
}

/** The one BACKFILL_SQL body, parsed once. */
function backfillSql(): string {
  return schema.match(/export const BACKFILL_SQL = `([\s\S]*?)`;/)?.[1] ?? '';
}

describe('sync contract', () => {
  it('covers every module', () => {
    expect(ALL_SYNC_TABLES.length).toBeGreaterThan(30);
  });

  it.each(ALL_SYNC_TABLES.map((table) => [table.name, table] as const))(
    '%s has every column the engine requires',
    (name, table) => {
      const columns = columnsOf(name);
      const key = table.key ?? 'id';
      // Named individually so a failure says which column is missing, not just
      // that something is.
      expect({ name, has: columns.includes(key) }).toEqual({ name, has: true });
      expect({ name, has: columns.includes('user_id') }).toEqual({ name, has: true });
      expect({ name, has: columns.includes('updated_at') }).toEqual({ name, has: true });
    },
  );

  it('gives every table the user can delete from a deleted_at', () => {
    // Without it a removal cannot travel: the server keeps the row and the next
    // pull writes it back onto the device that deleted it. The exceptions are
    // the per-user settings singletons, which have exactly one row that exists
    // for as long as the account does.
    const missing = ALL_SYNC_TABLES.filter(
      (table) => table.key !== 'user_id' && !columnsOf(table.name).includes('deleted_at'),
    ).map(named);
    expect(missing).toEqual([]);
  });

  it('registers each table exactly once', () => {
    expect(new Set(ALL_SYNC_TABLE_NAMES).size).toBe(ALL_SYNC_TABLE_NAMES.length);
  });

  it('lists children after their parent, so a log never lands before its owner', () => {
    // The engine walks tables in order within a module, pushing and pulling each
    // before moving on.
    const order = (module: string, parent: string, child: string) => {
      const tables = (SYNC_MODULES.find((m) => m.key === module)?.tables ?? []).map(named);
      expect(tables.indexOf(parent)).toBeGreaterThanOrEqual(0);
      expect(tables.indexOf(child)).toBeGreaterThan(tables.indexOf(parent));
    };
    order('habits', 'habits', 'habit_logs');
    order('habits', 'habits', 'habit_skips');
    order('habits', 'habit_routines', 'habit_routine_items');
    order('goals', 'goals', 'goal_milestones');
    order('goals', 'goals', 'goal_progress_logs');
    order('study', 'study_subjects', 'study_sessions');
    order('journal', 'journal_entries', 'journal_reflections');
    order('journal', 'journal_entries', 'journal_attachments');
    order('notes', 'notes', 'note_attachments');
    order('notes', 'note_tags', 'note_tag_links');
    order('music', 'playlists', 'playlist_songs');
    order('gallery', 'gallery_albums', 'gallery_photos');
  });

  it('has a Supabase table for every synced local table', () => {
    // A local table with no server counterpart pushes into a 404 and fails the
    // whole run — every later module included.
    //
    // Reads every migration rather than a named pair: the list used to be
    // ['0001_init', '0009_history_sync'], which meant a table created in any
    // later migration read as missing. The failure looked like a real contract
    // break and was actually the test being out of date.
    const sql = migrations();
    const missing = ALL_SYNC_TABLE_NAMES.filter(
      (t) => !new RegExp(`create table if not exists public\\.${t}\\b`).test(sql),
    );
    expect(missing).toEqual([]);
  });

  it('gives every synced server table its (user_id, updated_at) index', () => {
    // The engine's every read is `where user_id = ? and updated_at > ?`. Without
    // the index that is a sequential scan of one table holding every user's
    // rows — fine on a developer's laptop, and the thing that falls over first
    // under real load.
    const sql = migrations();
    const missing = ALL_SYNC_TABLE_NAMES.filter(
      (t) => !new RegExp(`on public\\.${t}\\s*\\(user_id, updated_at\\)`).test(sql),
    );
    expect(missing).toEqual([]);
  });

  it('leaves every synced server table behind row-level security', () => {
    const sql = migrations();
    const missing = ALL_SYNC_TABLE_NAMES.filter(
      (t) => !new RegExp(`alter table public\\.${t} enable row level security`).test(sql),
    );
    expect(missing).toEqual([]);
  });

  it('keeps device bookkeeping out of the payload', () => {
    // These describe this phone, not the user's data. Uploading them means
    // another device's OS notification handles and file paths overwrite the
    // ones that are actually valid here — see the comment on the constant.
    expect(SYNC_DEVICE_LOCAL_COLUMNS).toEqual(
      expect.arrayContaining([
        'sync_status',
        'server_updated_at',
        'reminder_notification_id',
        'uri',
        'thumbnail_uri',
      ]),
    );
  });

  it('never registers the device-only notification log', () => {
    // It is the record of what this phone scheduled, and every row of it is
    // meaningless on any other device.
    expect(ALL_SYNC_TABLE_NAMES).not.toContain('notification_log');
  });

  it('backfills updated_at for every table that gained the column', () => {
    // A column added as NOT NULL DEFAULT 0 leaves existing rows at 0, and the
    // push is `updated_at > 0` — so without a backfill, all pre-existing
    // history is invisible to sync forever.
    const backfill = backfillSql();
    const gained = Object.entries(additiveColumns())
      .filter(([, columns]) => columns.includes('updated_at'))
      .map(([table]) => table);
    // Guards the guard: if the parse stops matching, this must fail rather than
    // vacuously pass.
    expect(gained.length).toBeGreaterThan(10);

    const missing = gained.filter(
      (table) => !new RegExp(`UPDATE ${table} SET updated_at =`).test(backfill),
    );
    expect(missing).toEqual([]);
  });

  it('gives the derived-id join tables an id to sync by', () => {
    // Their primary key is the pair of columns they join, which SQLite cannot
    // alter into an `id`. The id is added as a plain column and filled by
    // BACKFILL_SQL; without that step every row of theirs has a NULL key and
    // the upsert has nothing to conflict on.
    const backfill = backfillSql();
    for (const table of ['note_tag_links', 'habit_routine_items', 'playlist_songs']) {
      expect(backfill).toMatch(new RegExp(`UPDATE ${table} SET id = `));
      expect(backfill).toMatch(new RegExp(`UPDATE ${table} SET updated_at = 1`));
    }
  });
});
