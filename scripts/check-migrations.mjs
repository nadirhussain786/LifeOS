#!/usr/bin/env node
/**
 * Static checks for supabase/migrations/*.sql.
 *
 * These migrations are applied by hand against a hosted database, so there is
 * no CI step that would catch a file that simply fails on first run. Every rule
 * below exists because the mistake it catches is silent, easy to make, and only
 * shows up once you are already talking to production:
 *
 *  - Statement order. LANGUAGE SQL bodies are parsed and validated at CREATE
 *    time, so a helper that reads a table defined further down the file aborts
 *    the migration. (PL/pgSQL bodies are not checked this way, which makes the
 *    inconsistency easy to trip over.)
 *  - RLS coverage. A table created without `enable row level security` is world
 *    readable to every authenticated user.
 *  - search_path on SECURITY DEFINER. Without it, a function running as its
 *    owner resolves objects through the caller's search_path — the classic
 *    privilege-escalation shape.
 *  - Deferrability of constraint triggers that validate a multi-row invariant:
 *    non-deferred, they fire after the first row and fail every time.
 *
 * Objects are accumulated across files in filename order, so a later migration
 * may reference anything an earlier one created.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'supabase/migrations';
/** Schemas we do not own and therefore cannot verify. */
const EXTERNAL = new Set(['auth', 'storage', 'extensions']);

const problems = [];
const note = (file, message) => problems.push(`${file}: ${message}`);

/** Strips line comments and string/dollar-quoted literals' comment lookalikes. */
const decomment = (sql) => sql.replace(/--[^\n]*/g, '');

const knownTables = new Map(); // name -> "file:offset"
const knownFunctions = new Map();

const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  const raw = readFileSync(join(DIR, file), 'utf8');
  const sql = decomment(raw);

  if ((sql.match(/\$\$/g) ?? []).length % 2 !== 0) {
    note(file, 'unbalanced $$ quoting');
  }

  // Tables created by THIS file, with their offsets, so intra-file ordering can
  // be checked; earlier files are already in knownTables.
  const localTables = new Map();
  for (const m of sql.matchAll(/create table (?:if not exists )?public\.(\w+)/g)) {
    localTables.set(m[1], m.index);
  }

  const definedBefore = (name, offset) =>
    knownTables.has(name) || (localTables.has(name) && localTables.get(name) < offset);

  // 1. Foreign keys point at something that already exists.
  for (const m of sql.matchAll(/references\s+(?:(\w+)\.)?(\w+)\s*\(/g)) {
    const [schema, table] = [m[1] ?? 'public', m[2]];
    if (EXTERNAL.has(schema)) continue;
    if (!definedBefore(table, m.index)) {
      note(file, `foreign key -> ${table} which is not created before this point`);
    }
  }

  // 2. LANGUAGE SQL bodies may only read tables that already exist.
  for (const m of sql.matchAll(
    /create (?:or replace )?function public\.(\w+)\s*\([^)]*\)[\s\S]*?language sql([\s\S]*?)\$\$([\s\S]*?)\$\$/g,
  )) {
    const [fn, body, offset] = [m[1], m[3], m.index];
    // `a is [not] distinct from b` is a comparison operator, not a FROM clause —
    // without stripping it, `auth.uid() is distinct from id` reads as a query
    // against a table named `id`.
    const clauses = body.replace(/\bis\s+(?:not\s+)?distinct\s+from\b/gi, ' ');
    for (const r of clauses.matchAll(/(?:from|join)\s+(?:(\w+)\.)?(\w+)/g)) {
      const [schema, table] = [r[1] ?? 'public', r[2]];
      if (EXTERNAL.has(schema)) continue;
      if (!definedBefore(table, offset)) {
        note(file, `${fn}() reads ${table} before it is created — validated at CREATE time`);
      }
    }
  }

  // Functions defined by this file.
  const localFunctions = new Map();
  for (const m of sql.matchAll(/create (?:or replace )?function public\.(\w+)\s*\(/g)) {
    localFunctions.set(m[1], m.index);
  }

  // 3. Policies may only call helpers that already exist.
  for (const m of sql.matchAll(/create policy[\s\S]*?;/g)) {
    for (const c of m[0].matchAll(/public\.(\w+)\s*\(/g)) {
      const fn = c[1];
      const ok =
        knownFunctions.has(fn) || (localFunctions.has(fn) && localFunctions.get(fn) < m.index);
      if (!ok) note(file, `policy calls ${fn}() before it is defined`);
    }
  }

  // 4. Every table this file creates enables RLS somewhere in the file.
  const rlsOn = new Set(
    [...sql.matchAll(/alter table public\.(\w+) enable row level security/g)].map((m) => m[1]),
  );
  for (const table of localTables.keys()) {
    if (!rlsOn.has(table)) note(file, `table ${table} never enables row level security`);
  }

  // 5. SECURITY DEFINER functions pin search_path.
  for (const m of sql.matchAll(
    /create (?:or replace )?function public\.(\w+)\s*\([^)]*\)([\s\S]*?)\$\$/g,
  )) {
    const [fn, head] = [m[1], m[2]];
    if (/security definer/i.test(head) && !/set\s+search_path/i.test(head)) {
      note(file, `${fn}() is SECURITY DEFINER without a pinned search_path`);
    }
  }

  // 6. Constraint triggers that guard a multi-row invariant must be deferrable.
  for (const m of sql.matchAll(/create constraint trigger (\w+)([\s\S]*?)execute function/g)) {
    if (!/deferrable/i.test(m[2])) {
      note(file, `constraint trigger ${m[1]} is not deferrable — fires after the first row`);
    }
  }

  for (const [t, off] of localTables) knownTables.set(t, `${file}:${off}`);
  for (const [f, off] of localFunctions) knownFunctions.set(f, `${file}:${off}`);
}

console.log(
  `checked ${files.length} migration${files.length === 1 ? '' : 's'} · ` +
    `${knownTables.size} tables · ${knownFunctions.size} functions`,
);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log('all checks passed');
