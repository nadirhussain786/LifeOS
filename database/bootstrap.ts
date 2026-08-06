import * as schema from '@/database/schema';

/**
 * Brings a database up to the current schema.
 *
 * Extracted from database/client.ts so that something other than a running
 * phone can execute it. That mattered more than it sounds: the bootstrap SQL
 * spent a release with six missing commas in it — `updated_at INTEGER NOT NULL
 * DEFAULT 0` followed by `deleted_at INTEGER` with nothing between them — and
 * SQLite rejects that outright. Every fresh install would have failed to open
 * its database at all, and every check in CI passed, because the tests read
 * schema.ts as *text* and nothing anywhere ran it. See database/schema.test.ts,
 * which now does.
 *
 * The four steps are ordered, and each order is load-bearing:
 *
 *  1. `TABLE_BOOTSTRAP_SQL` — CREATE TABLE IF NOT EXISTS for every table. A
 *     no-op on a device that already has them, which is why (2) exists.
 *  2. `ADDITIVE_COLUMNS` — ALTER TABLE for columns introduced after a table's
 *     first release. Guarded by PRAGMA table_info so it is idempotent.
 *  3. `BACKFILL_SQL` — must follow the ALTERs and precede anything that reads
 *     the data. A column added with a default leaves every existing row at that
 *     default, and for `updated_at` that means invisible to the sync engine
 *     forever.
 *  4. `INDEX_BOOTSTRAP_SQL` — last, because an index on a column that only
 *     exists via (2) fails with "no such column" on a device that predates it.
 *     A failing statement aborts the whole exec, so one bad index would break
 *     every screen that touches the database, permanently.
 */
export interface BootstrapTarget {
  execSync(sql: string): void;
  getAllSync<T>(sql: string): T[];
}

export function bootstrapDatabase(db: BootstrapTarget): void {
  db.execSync(schema.TABLE_BOOTSTRAP_SQL);
  applyAdditiveColumns(db);
  db.execSync(schema.BACKFILL_SQL);
  db.execSync(schema.INDEX_BOOTSTRAP_SQL);
}

/**
 * Adds columns introduced after a table's initial CREATE TABLE IF NOT EXISTS to
 * any database that already has that table from an earlier install — see
 * schema.ts's ADDITIVE_COLUMNS for why this exists instead of a real migrator.
 */
function applyAdditiveColumns(db: BootstrapTarget): void {
  for (const [table, columns] of Object.entries(schema.ADDITIVE_COLUMNS)) {
    const existing = new Set(
      db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`).map((row) => row.name),
    );
    for (const column of columns) {
      if (!existing.has(column.name)) db.execSync(column.ddl);
    }
  }
}
