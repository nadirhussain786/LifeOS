# SQLCipher — at-rest database encryption

**Status:** the encryption key primitive is implemented and safe
(`features/security/lib/db-key.ts` → `getOrCreateDbKey()`). Flipping the actual
DB engine to an encrypted one is a **native change that must be built and
validated on a device** — it can't be verified with `expo export`, and a mistake
means the DB won't open. Follow these steps on a dev build, then keep it.

## Why it's not wired by default

`expo-sqlite` has no SQLCipher support. Encryption requires swapping to
`@op-engineering/op-sqlite` (which supports `encryptionKey` when built with the
SQLCipher flag) and drizzle's op-sqlite driver. That touches the DB open path,
the raw-SQL adapter used by the sync engine, and needs a one-time data migration
for any existing plaintext DB. Because a subtle error bricks the whole app and
can't be caught without running it, it's documented rather than shipped blind.

## Steps

### 1. Install + enable SQLCipher

```bash
npx expo install @op-engineering/op-sqlite
```

In `package.json`, enable the SQLCipher build:

```json
"op-sqlite": { "sqlcipher": true }
```

Then rebuild the dev client (`eas build -p android --profile development`) — the
flag is compiled in.

### 2. Fetch the key before any DB access

`getDb()` is synchronous but the key is async (SecureStore). Resolve it once at
boot, before the first query. In `app/_layout.tsx`, gate rendering on it:

```ts
const [dbReady, setDbReady] = useState(false);
useEffect(() => { void initDatabase().then(() => setDbReady(true)); }, []);
if (!fontsLoaded || !isInitialized || !profileHydrated || !dbReady) return null;
```

### 3. Rewrite `database/client.ts`

```ts
import { drizzle } from 'drizzle-orm/op-sqlite';
import { open, type DB } from '@op-engineering/op-sqlite';
import * as schema from '@/database/schema';
import { getOrCreateDbKey } from '@/features/security/lib/db-key';

let raw: DB | null = null;
let instance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Call once at boot (before getDb) — opens the encrypted DB and bootstraps. */
export async function initDatabase(): Promise<void> {
  if (instance) return;
  const encryptionKey = await getOrCreateDbKey();
  const db = open({ name: 'lifeos.db', encryptionKey });

  // op-sqlite's executeSync runs ONE statement; TABLE_BOOTSTRAP_SQL is many.
  for (const stmt of schema.TABLE_BOOTSTRAP_SQL.split(';')) {
    if (stmt.trim()) db.executeSync(stmt);
  }
  applyAdditiveColumns(db);
  for (const stmt of schema.INDEX_BOOTSTRAP_SQL.split(';')) {
    if (stmt.trim()) db.executeSync(stmt);
  }

  raw = db;
  instance = drizzle(db, { schema });
}

export function getDb() {
  if (!instance) throw new Error('initDatabase() must run before getDb()');
  return instance;
}

// getRawDb() adapter: the sync engine expects expo-sqlite's getAllSync/
// getFirstSync/runSync/execSync. Wrap op-sqlite's executeSync (returns { rows }).
export function getRawDb() {
  const db = raw!;
  return {
    getAllSync: <T,>(sql: string, params: unknown[] = []) => (db.executeSync(sql, params).rows ?? []) as T[],
    getFirstSync: <T,>(sql: string, params: unknown[] = []) => ((db.executeSync(sql, params).rows ?? [])[0] ?? null) as T | null,
    runSync: (sql: string, params: unknown[] = []) => db.executeSync(sql, params),
    execSync: (sql: string) => { for (const s of sql.split(';')) if (s.trim()) db.executeSync(s); },
  };
}
```

`applyAdditiveColumns` changes from `PRAGMA table_info` via `getAllSync` +
`execSync` to the same calls on the op-sqlite `db` — the logic is identical.

### 4. One-time data migration (existing installs only)

An existing **plaintext** `lifeos.db` cannot be read by the encrypted engine. For
a fresh install there's nothing to do. For a device that already has data:
- Simplest: Settings → Data → **Export data** (JSON) before upgrading, then the
  encrypted DB starts empty (re-import is manual today), **or**
- Use SQLCipher's `sqlcipher_export` to copy the plaintext DB into an encrypted
  one at first launch (one-off ATTACH script).

Since LifeOS hasn't shipped to real users, wiping and starting fresh on the dev
device is acceptable.

### 5. Verify on device

- App launches (DB opens with the key).
- Create a task, force-quit, relaunch → it's still there (bootstrap + persistence OK).
- Pull `lifeos.db` off the device (ADB) and confirm it is NOT readable as plain
  SQLite (it's SQLCipher-encrypted).
