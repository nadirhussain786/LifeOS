import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ALL_SYNC_TABLES, SYNC_MODULES } from '@/features/sync/config/sync-tables';

/**
 * The contract the sync engine silently depends on.
 *
 * `pushTable` selects `WHERE user_id = ? AND updated_at > cursor`, and
 * `pullTable` upserts by `id`. A registered table missing any of those columns
 * does not error — it just never syncs, or syncs wrongly, and looks fine from
 * the outside. That is exactly how the history tables came to be excluded: they
 * lacked `updated_at`, so signing in on a second device restored every habit
 * with a streak of zero and nothing said so.
 *
 * Read as source text rather than imported: schema.ts pulls in expo-sqlite,
 * which needs a native runtime Jest does not have. Which columns a table
 * declares is answerable statically.
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

describe('sync contract', () => {
  it('registers a non-trivial set of tables', () => {
    expect(ALL_SYNC_TABLES.length).toBeGreaterThan(15);
  });

  it.each(ALL_SYNC_TABLES)('%s has every column the engine requires', (table) => {
    const columns = columnsOf(table);
    // Named individually so a failure says which column is missing, not just
    // that something is.
    expect({ table, has: columns.includes('id') }).toEqual({ table, has: true });
    expect({ table, has: columns.includes('user_id') }).toEqual({ table, has: true });
    expect({ table, has: columns.includes('updated_at') }).toEqual({ table, has: true });
    expect({ table, has: columns.includes('deleted_at') }).toEqual({ table, has: true });
  });

  it('registers each table exactly once', () => {
    expect(new Set(ALL_SYNC_TABLES).size).toBe(ALL_SYNC_TABLES.length);
  });

  it('lists children after their parent, so a log never lands before its owner', () => {
    // The engine walks tables in order within a module, pushing and pulling each
    // before moving on.
    const order = (module: string, parent: string, child: string) => {
      const tables = SYNC_MODULES.find((m) => m.key === module)?.tables ?? [];
      expect(tables.indexOf(parent)).toBeGreaterThanOrEqual(0);
      expect(tables.indexOf(child)).toBeGreaterThan(tables.indexOf(parent));
    };
    order('habits', 'habits', 'habit_logs');
    order('habits', 'habits', 'habit_skips');
    order('goals', 'goals', 'goal_milestones');
    order('goals', 'goals', 'goal_progress_logs');
    order('study', 'study_subjects', 'study_sessions');
    order('journal', 'journal_entries', 'journal_reflections');
  });

  it('has a Supabase table for every synced local table', () => {
    // A local table with no server counterpart pushes into a 404 and fails the
    // whole run — every later module included.
    const migrations = ['0001_init', '0009_history_sync']
      .map((f) => readFileSync(join(ROOT, 'supabase', 'migrations', `${f}.sql`), 'utf8'))
      .join('\n');
    const missing = ALL_SYNC_TABLES.filter(
      (t) => !new RegExp(`create table if not exists public\\.${t}\\b`).test(migrations),
    );
    expect(missing).toEqual([]);
  });

  it('keeps media and device-local tables out', () => {
    // Rows pointing at files in private storage would sync as broken references.
    for (const table of [
      'gallery_albums',
      'gallery_photos',
      'songs',
      'playlists',
      'note_attachments',
      'journal_attachments',
      'notification_log',
    ]) {
      expect(ALL_SYNC_TABLES).not.toContain(table);
    }
  });

  it('backfills updated_at for every table that gained the column', () => {
    // A column added as NOT NULL DEFAULT 0 leaves existing rows at 0, and the
    // push is `updated_at > 0` — so without a backfill, all pre-existing
    // history is invisible to sync forever.
    const backfill = schema.match(/export const BACKFILL_SQL = `([\s\S]*?)`;/)?.[1] ?? '';
    for (const table of [
      'habit_logs',
      'habit_skips',
      'water_intake_logs',
      'goal_milestones',
      'goal_progress_logs',
      'study_sessions',
      'journal_reflections',
    ]) {
      expect(backfill).toContain(`UPDATE ${table} SET updated_at = created_at`);
    }
  });
});
