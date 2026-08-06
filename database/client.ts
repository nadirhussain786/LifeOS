import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { bootstrapDatabase } from '@/database/bootstrap';
import * as schema from '@/database/schema';

type Database = ReturnType<typeof drizzle<typeof schema>>;
type RawDatabase = ReturnType<typeof openDatabaseSync>;

let instance: Database | null = null;
let rawInstance: RawDatabase | null = null;

/**
 * Lazily opens the database on first use rather than as a module-level
 * side effect. Expo Router eagerly evaluates every route file's module
 * graph at boot to build its route table, so a top-level `openDatabaseSync`
 * call here would crash the entire app on startup if it ever fails (e.g.
 * the web platform's WASM build has real environment requirements) —
 * scoped to a function, a failure only affects the screen that actually
 * touches the database.
 *
 * Table creation is a hand-written `CREATE TABLE IF NOT EXISTS` bootstrap
 * rather than drizzle-kit generated migrations. drizzle-kit's migrator
 * needs its generated .sql files loaded as Metro assets, which adds real
 * config surface for a single-developer local database at this stage.
 * Drizzle is still used for all querying, where its type safety matters.
 * Revisit generated migrations once the schema needs versioned changes
 * shipped to existing users' devices.
 */
export function getDb(): Database {
  if (!instance) {
    const sqliteDb = openDatabaseSync('lifeos.db');
    // Write-ahead logging. Sync writes a page of pulled rows in one transaction
    // while the UI is reading the same tables; under the default rollback
    // journal those readers block for the length of the write. It is also
    // markedly faster for the many small writes the app makes.
    sqliteDb.execSync('PRAGMA journal_mode = WAL');
    // The steps, and why they are in this order, are in database/bootstrap.ts —
    // which exists so a test can run exactly this against a real SQLite.
    bootstrapDatabase(sqliteDb);
    rawInstance = sqliteDb;
    instance = drizzle(sqliteDb, { schema });
  }
  return instance;
}

/**
 * The underlying expo-sqlite handle, for code that needs raw table-name-driven
 * SQL that drizzle's typed API can't express — notably the generic sync engine,
 * which reads/writes arbitrary tables by name. Ensures the DB is bootstrapped
 * first by going through getDb(). Prefer getDb()/drizzle everywhere else.
 */
export function getRawDb(): RawDatabase {
  if (!rawInstance) getDb();
  return rawInstance as RawDatabase;
}
