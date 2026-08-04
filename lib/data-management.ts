import { Directory, Paths } from 'expo-file-system';

import { getDb, getRawDb } from '@/database/client';
import { destroyVaultKeys } from '@/features/private/services/vault-keys';

/**
 * "Delete all my data" — the local-only equivalent of deleting your account.
 *
 * This used to be a hand-written list of `db.delete(table)` calls, and it had
 * fallen 15 tables behind the schema. Everything added after the list was
 * written simply survived the wipe: the entire budget ledger (transactions,
 * debts, savings goals, settings), all goals with their milestones and progress
 * logs, every sleep session, every study session and subject, and the whole
 * gallery — photos and videos included, both the rows and the files on disk.
 *
 * That is the worst possible subset to miss. Someone tapping this button is
 * usually handing the phone on, returning it, or exercising a privacy right,
 * and what stayed behind was their finances, their sleep and their photographs.
 *
 * So the list is gone. Tables are read from `sqlite_master` at call time, which
 * means one cannot be forgotten here — a new feature is covered the moment it
 * creates its table, with no second place to remember to update. The only
 * entries below are the deliberate exceptions.
 */

/**
 * Rows to KEEP, as a SQL predicate. Anything not matching is deleted.
 *
 * `journal_prompts` ships with seeded prompts that have a null user_id — those
 * are app content, not something the user wrote, and a reset should leave the
 * app usable rather than stripped.
 */
const PRESERVE: Record<string, string> = {
  journal_prompts: 'user_id IS NULL',
};

/** SQLite/Android bookkeeping — not user data, and not ours to clear. */
const SKIP_TABLES = new Set(['sqlite_sequence', 'android_metadata']);

/**
 * Directories holding files the database only points at. Deleting the rows
 * without these leaves orphaned media occupying storage forever — and for
 * Gallery those are the actual photographs, which makes it a privacy problem
 * rather than merely an untidy one.
 */
const MEDIA_DIRECTORIES = ['songs', 'gallery', 'attachments', 'private-vault'];

/** Every user table in the database — discovered, not remembered. */
function userTables(): string[] {
  return getRawDb()
    .getAllSync<{ name: string }>(
      `SELECT name FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
    )
    .map((row) => row.name)
    .filter((name) => !SKIP_TABLES.has(name));
}

export function clearAllData() {
  // Bootstraps the schema before sqlite_master is read.
  getDb();
  const raw = getRawDb();

  // One transaction: a wipe that stops halfway leaves a half-deleted account,
  // which is worse than either outcome on its own.
  raw.execSync('BEGIN');
  try {
    for (const table of userTables()) {
      const keep = PRESERVE[table];
      raw.execSync(keep ? `DELETE FROM ${table} WHERE NOT (${keep})` : `DELETE FROM ${table}`);
    }
    raw.execSync('COMMIT');
  } catch (error) {
    raw.execSync('ROLLBACK');
    throw error;
  }

  // Reclaim the freed pages, so "delete everything" actually shrinks the file
  // instead of leaving it the same size on disk.
  raw.execSync('VACUUM');

  // Imported songs, gallery media and attachments are real files, not just
  // metadata. Removing the directory frees them in one shot.
  for (const name of MEDIA_DIRECTORIES) {
    const directory = new Directory(Paths.document, name);
    if (directory.exists) directory.delete();
  }

  // The private space's keys live in the OS keystore, which is the one place
  // a table wipe and a directory delete both miss entirely. Leaving them would
  // mean "delete all my data" left the keys to the deleted data behind — and
  // an apparently-set-up private space that opens onto nothing.
  //
  // Deliberately not awaited: clearAllData is synchronous by design (the
  // settings screen wipes and re-renders immediately), and SecureStore only
  // offers an async delete. Failure is swallowed for the same reason it is
  // survivable — the data those keys unlocked is already gone.
  void destroyVaultKeys().catch(() => undefined);
}

/** The tables a wipe would clear. Exported so the settings screen can say how
 *  much is about to go, and so a test can assert nothing is being skipped. */
export function clearableTables(): string[] {
  getDb();
  return userTables();
}
