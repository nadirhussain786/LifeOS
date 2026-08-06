/**
 * Deciding what to apply, separated from applying it.
 *
 * Everything here is a pure function of "the files on disk" and "what the
 * ledger says", which means it can be tested without a database — and this is
 * the half that needs testing, because it is the half that decides which
 * statements run against production. The I/O half (connect, lock, execute) is
 * in migrate.mjs and is mostly the `pg` client doing its job.
 *
 * Kept as .mjs alongside the runner rather than moved under features/ so the
 * script stays readable as one unit: a deploy tool nobody can follow is a
 * deploy tool nobody checks before running.
 */
import { createHash } from 'node:crypto';

/**
 * @typedef {{ filename: string, sql: string, checksum: string }} MigrationFile
 * @typedef {{ filename: string, checksum: string }} LedgerRow
 * @typedef {Map<string, LedgerRow>} Ledger
 * @typedef {{ ok: true, pending: MigrationFile[] }
 *          | { ok: false, reason: 'drift', drift: MigrationFile[], pending: MigrationFile[] }
 *          | { ok: false, reason: 'unknown-target', target: string, pending: MigrationFile[] }
 *          } PlanResult
 */

/**
 * The environments `--reset` will destroy, which is a list of exactly one.
 *
 * Production is absent and there is no flag that adds it. A `--force` would
 * make this a reset-production command that merely asks nicely first, and the
 * whole value of the guard is that no combination of arguments typed at 3am can
 * get past it. Resetting production, if that day ever comes, is a thing to do
 * deliberately by hand with the SQL in front of you.
 */
const RESETTABLE = new Set(['staging']);

/**
 * The identity of the database a URL points at, for comparison.
 *
 * Username is part of it and has to be: Supabase's session pooler gives every
 * project in a region the same host and the same database name, and
 * distinguishes them only by the user (`postgres.<project-ref>`). Comparing
 * host and path alone would call two different projects the same database —
 * which, for the check below, is the failure that matters.
 *
 * Password is deliberately excluded: a rotated password does not make it a
 * different database.
 *
 * @param {string} url
 * @returns {string}
 */
function endpoint(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.username}@${parsed.host}${parsed.pathname}`.toLowerCase();
  } catch {
    // Not a URL we can parse — fall back to the whole string. Worst case this
    // fails to spot a match, which leaves the check no weaker than absent.
    return url.trim().toLowerCase();
  }
}

/**
 * Whether two connection strings reach the same database.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function sameDatabase(a, b) {
  return endpoint(a) === endpoint(b);
}

/**
 * Whether `--reset` may run against this environment, and against this URL.
 *
 * Split out of the runner and tested, because it is the single assertion
 * standing between a routine command and deleting every account. The rest of
 * reset is `drop schema public cascade`, which needs no help being dangerous.
 *
 * The environment name is only a label on a variable. Somebody who exported
 * production's URL into `SUPABASE_DB_URL_STAGING` — to run a one-off query, an
 * hour ago, in this same shell — has a "staging" that is production, and the
 * name guard alone would wave them straight through. So the URLs are compared
 * too, and matching ones are refused before anything connects.
 *
 * @param {string} environment
 * @param {{ url?: string | null, productionUrl?: string | null }} [connections]
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function assertResettable(environment, { url = null, productionUrl = null } = {}) {
  if (environment === 'production') {
    return {
      ok: false,
      reason:
        'refusing to reset production.\n' +
        '  There is no flag that overrides this. If you genuinely need to rebuild\n' +
        '  production, do it by hand with the SQL in front of you — a command that\n' +
        '  can do it is a command that will eventually be run by accident.',
    };
  }
  if (!RESETTABLE.has(environment)) {
    return { ok: false, reason: `refusing to reset unknown environment "${environment}"` };
  }
  if (url && productionUrl && sameDatabase(url, productionUrl)) {
    return {
      ok: false,
      reason:
        `refusing to reset ${environment}: SUPABASE_DB_URL_${environment.toUpperCase()} and\n` +
        '  SUPABASE_DB_URL_PRODUCTION point at the same database. One of them is wrong,\n' +
        '  and until you know which, every command in this shell is aimed somewhere you\n' +
        '  did not intend — not just this one.',
    };
  }
  return { ok: true };
}

/** Short but wide enough that an accidental collision is not a thing that
 * happens — this only has to distinguish edits to a handful of files.
 * @param {string} sql
 * @returns {string}
 */
export function checksum(sql) {
  return createHash('sha256').update(sql).digest('hex').slice(0, 16);
}

/**
 * Migrations that have already been applied and have since been edited.
 *
 * This is the check that matters most. Editing an applied migration does not
 * change the database that already ran it, so staging and production quietly
 * stop being the same schema — and nothing else in the system would ever
 * mention it. Re-running the new text is not a fix either: these files are full
 * of `create table if not exists`, so a re-run of an edited file frequently
 * succeeds while doing nothing, which is the worst possible outcome because it
 * looks like it worked.
 *
 * @param {MigrationFile[]} files
 * @param {Ledger} ledger
 * @returns {MigrationFile[]}
 */
export function findDrift(files, ledger) {
  return files.filter((file) => {
    const record = ledger.get(file.filename);
    return record !== undefined && record.checksum !== file.checksum;
  });
}

/**
 * The migrations to apply, in order.
 *
 * `--to` stops after a named file, for a staged rollout where a later migration
 * needs a client release in front of it. It is deliberately an error to name a
 * file that is neither pending nor applied: a typo there would otherwise apply
 * *everything*, silently, which is the opposite of what somebody reaching for
 * `--to` wants.
 *
 * @param {MigrationFile[]} files
 * @param {Ledger} ledger
 * @param {{ to?: string | null }} [options]
 * @returns {PlanResult}
 */
export function plan(files, ledger, { to = null } = {}) {
  const drift = findDrift(files, ledger);
  if (drift.length > 0) {
    return { ok: false, reason: 'drift', drift, pending: [] };
  }

  const pending = files.filter((file) => !ledger.has(file.filename));

  if (to === null) return { ok: true, pending };

  const known = files.some((file) => file.filename === to);
  if (!known) return { ok: false, reason: 'unknown-target', target: to, pending: [] };

  const index = pending.findIndex((file) => file.filename === to);
  // Already applied: nothing to do, and that is a success rather than an error —
  // re-running a deploy that partly succeeded should be a no-op.
  if (index === -1) return { ok: true, pending: [] };

  return { ok: true, pending: pending.slice(0, index + 1) };
}

/**
 * Applied files the working tree no longer has.
 *
 * Not fatal — a migration deleted from the repo is usually somebody tidying a
 * branch, and the database is still correct. Worth saying out loud, because the
 * other explanation is that this database is running a schema from a different
 * project entirely, and finding that out during a deploy is better than after.
 *
 * @param {MigrationFile[]} files
 * @param {Ledger} ledger
 * @returns {string[]}
 */
export function findOrphans(files, ledger) {
  const onDisk = new Set(files.map((file) => file.filename));
  return [...ledger.keys()].filter((filename) => !onDisk.has(filename)).sort();
}
