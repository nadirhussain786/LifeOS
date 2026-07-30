import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the two operations that must cover the WHOLE schema: exporting your
 * data, and deleting it.
 *
 * Both used to be hand-maintained lists, and both had silently fallen behind.
 * `clearAllData` missed 15 of 38 tables — the entire budget ledger, goals,
 * sleep, study and gallery — so "delete all my data" left the most sensitive
 * things on the device. A list that has to be remembered will eventually not
 * be, which is why the wipe now reads `sqlite_master` instead; this test holds
 * the line for the export, which still names its tables explicitly (it has to —
 * each one is exported under its own key).
 *
 * Read as source text rather than imported: both modules pull in expo-sqlite
 * and expo-file-system, which need a native runtime that Jest does not have.
 * The question here is which tables are named, and that is answerable statically.
 */

const ROOT = join(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/** Source with comments removed — these assertions are about what the code
 *  does, and the files explain the old behaviour in prose. */
const readCode = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

/** Every `sqliteTable('name', …)` declared in the schema. */
function schemaTables(): { variable: string; table: string }[] {
  const source = read('database/schema.ts');
  return [...source.matchAll(/export const (\w+) = sqliteTable\(\s*'(\w+)'/g)].map((m) => ({
    variable: m[1],
    table: m[2],
  }));
}

/**
 * Tables that are deliberately not in the user's export.
 * `notification_log` is delivery bookkeeping the app writes about itself — no
 * part of it is user-authored content.
 */
const EXPORT_EXEMPT = new Set(['notification_log']);

describe('schema coverage', () => {
  it('finds the schema (guards against the regex silently matching nothing)', () => {
    expect(schemaTables().length).toBeGreaterThan(30);
  });

  it('exports every table holding user data', () => {
    const source = readCode('lib/data-export.ts');
    const missing = schemaTables()
      .filter((t) => !EXPORT_EXEMPT.has(t.table))
      .filter((t) => !new RegExp(`\\b${t.variable}\\b`).test(source))
      .map((t) => t.table);

    // Named in the failure so the message says which module was left out.
    expect(missing).toEqual([]);
  });

  it('wipes by discovery rather than by a list that can fall behind', () => {
    const source = readCode('lib/data-management.ts');
    expect(source).toMatch(/sqlite_master/);
    // The old shape. If someone reintroduces a hand-written list, the 15-table
    // gap comes back with it.
    expect(source).not.toMatch(/db\.delete\(/);
  });

  it('frees the on-disk media a wipe would otherwise orphan', () => {
    const source = readCode('lib/data-management.ts');
    for (const directory of ['songs', 'gallery', 'attachments']) {
      expect(source).toContain(`'${directory}'`);
    }
  });

  it('keeps the seeded journal prompts, which are app content not user data', () => {
    expect(readCode('lib/data-management.ts')).toMatch(/journal_prompts:\s*'user_id IS NULL'/);
  });
});
