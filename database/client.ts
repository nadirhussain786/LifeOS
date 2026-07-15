import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from '@/database/schema';

/**
 * Table creation is a hand-written `CREATE TABLE IF NOT EXISTS` bootstrap
 * rather than drizzle-kit generated migrations. drizzle-kit's migrator
 * needs its generated .sql files loaded as Metro assets, which adds real
 * config surface for a single-developer local database at this stage.
 * Drizzle is still used for all querying, where its type safety matters.
 * Revisit generated migrations once the schema needs versioned changes
 * shipped to existing users' devices.
 */
const sqliteDb = openDatabaseSync('lifeos.db');

sqliteDb.execSync(schema.BOOTSTRAP_SQL.queryChunks.join(''));

export const db = drizzle(sqliteDb, { schema });
