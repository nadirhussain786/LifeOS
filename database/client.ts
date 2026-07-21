import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

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
/**
 * Adds columns introduced after a table's initial CREATE TABLE IF NOT EXISTS
 * to any database that already has that table from an earlier install —
 * see schema.ts's ADDITIVE_COLUMNS for why this exists instead of a real
 * migrator.
 */
function applyAdditiveColumns(sqliteDb: ReturnType<typeof openDatabaseSync>) {
  for (const [table, columns] of Object.entries(schema.ADDITIVE_COLUMNS)) {
    const existing = new Set(
      sqliteDb.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`).map((row) => row.name),
    );
    for (const column of columns) {
      if (!existing.has(column.name)) sqliteDb.execSync(column.ddl);
    }
  }
}

export function getDb(): Database {
  if (!instance) {
    const sqliteDb = openDatabaseSync('lifeos.db');
    sqliteDb.execSync(schema.TABLE_BOOTSTRAP_SQL);
    applyAdditiveColumns(sqliteDb);
    sqliteDb.execSync(schema.INDEX_BOOTSTRAP_SQL);
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
