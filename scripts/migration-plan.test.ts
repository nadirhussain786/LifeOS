import {
  assertResettable,
  checksum,
  findDrift,
  findOrphans,
  plan,
  sameDatabase,
} from './migration-plan.mjs';

/**
 * The half of the migration runner that decides what runs against production.
 *
 * Tested without a database on purpose: the connection, the advisory lock and
 * the per-file transaction are the `pg` client doing its documented job, but
 * "which of these files do we execute" is our own logic and it is the part that
 * cannot be allowed to be wrong.
 */

type File = { filename: string; sql: string; checksum: string };
type Record_ = { filename: string; checksum: string };

const file = (filename: string, sql = `-- ${filename}`): File => ({
  filename,
  sql,
  checksum: checksum(sql),
});

const ledgerOf = (...entries: File[]): Map<string, Record_> =>
  new Map(entries.map((f) => [f.filename, { filename: f.filename, checksum: f.checksum }]));

const names = (files: File[]) => files.map((f) => f.filename);

describe('migration plan', () => {
  const a = file('0001_init.sql');
  const b = file('0002_username.sql');
  const c = file('0003_groups.sql');
  const all = [a, b, c];

  it('applies everything against an empty database', () => {
    expect(names(plan(all, new Map()).pending)).toEqual([
      '0001_init.sql',
      '0002_username.sql',
      '0003_groups.sql',
    ]);
  });

  it('applies only what is missing, keeping filename order', () => {
    expect(names(plan(all, ledgerOf(a)).pending)).toEqual(['0002_username.sql', '0003_groups.sql']);
  });

  it('is a no-op when the database is up to date', () => {
    const result = plan(all, ledgerOf(a, b, c));
    expect(result.ok).toBe(true);
    expect(result.pending).toEqual([]);
  });

  it('refuses when an applied migration was edited afterwards', () => {
    // The dangerous case. Most of these files are `create ... if not exists`,
    // so re-running an edited one often succeeds while changing nothing — which
    // reads as success and leaves staging and production silently different.
    const edited = file('0002_username.sql', '-- 0002 with a new statement');
    const result = plan([a, edited, c], ledgerOf(a, b, c));

    if (result.ok) throw new Error('expected the plan to be refused');
    expect(result.reason).toBe('drift');
    expect(names(result.reason === 'drift' ? result.drift : [])).toEqual(['0002_username.sql']);
    // Nothing is offered for application while drift is unresolved.
    expect(result.pending).toEqual([]);
  });

  it('does not mistake a not-yet-applied migration for drift', () => {
    expect(findDrift(all, ledgerOf(a))).toEqual([]);
  });

  it('stops after the migration named by --to', () => {
    expect(names(plan(all, new Map(), { to: '0002_username.sql' }).pending)).toEqual([
      '0001_init.sql',
      '0002_username.sql',
    ]);
  });

  it('treats --to a migration that is already applied as nothing to do', () => {
    // Re-running a deploy that partly succeeded must be a no-op, not an error.
    const result = plan(all, ledgerOf(a, b), { to: '0001_init.sql' });
    expect(result.ok).toBe(true);
    expect(result.pending).toEqual([]);
  });

  it('refuses a --to that names nothing, rather than applying everything', () => {
    // A typo here would otherwise fall through to "no filter" and apply every
    // pending migration — the exact opposite of what somebody reaching for
    // --to is asking for.
    const result = plan(all, new Map(), { to: '0002_usernam.sql' });
    if (result.ok) throw new Error('expected the plan to be refused');
    expect(result.reason).toBe('unknown-target');
    expect(result.pending).toEqual([]);
  });

  it('reports applied migrations the checkout no longer has', () => {
    // Usually a branch being tidied. Occasionally it means this database
    // belongs to a different project, which is worth learning before a deploy
    // rather than after one.
    expect(findOrphans([a, c], ledgerOf(a, b, c))).toEqual(['0002_username.sql']);
    expect(findOrphans(all, ledgerOf(a))).toEqual([]);
  });

  it('checksums content, not filenames', () => {
    expect(checksum('select 1')).toBe(checksum('select 1'));
    expect(checksum('select 1')).not.toBe(checksum('select 2'));
    // Whitespace counts — a reformatted migration is an edited migration, and
    // the runner should say so rather than guess that it does not matter.
    expect(checksum('select 1')).not.toBe(checksum('select  1'));
  });
});

describe('reset guard', () => {
  const STAGING =
    'postgres://postgres.stagingref:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
  const PRODUCTION =
    'postgres://postgres.prodref:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

  it('allows staging', () => {
    expect(assertResettable('staging', { url: STAGING, productionUrl: PRODUCTION })).toEqual({
      ok: true,
    });
  });

  it('refuses production, with no argument that changes its mind', () => {
    // There is deliberately no --force. A reset command that can be talked into
    // production is a reset command that eventually is, at the worst moment.
    const verdict = assertResettable('production', { url: PRODUCTION, productionUrl: PRODUCTION });
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toMatch(/refusing to reset production/);
  });

  it('refuses an environment it does not recognise', () => {
    expect(assertResettable('prod').ok).toBe(false);
    expect(assertResettable('').ok).toBe(false);
  });

  it('refuses staging when the staging URL is production', () => {
    // The way this actually goes wrong: production's URL gets exported into
    // SUPABASE_DB_URL_STAGING for a one-off query, and an hour later the same
    // shell runs a reset. The name says staging; the socket says otherwise.
    const verdict = assertResettable('staging', { url: PRODUCTION, productionUrl: PRODUCTION });
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toMatch(/same database/);
  });

  it('still allows staging when only the password differs', () => {
    // A rotated password does not make it a different database — but it does not
    // make it the same one either, and this pair genuinely is different projects.
    const rotated = STAGING.replace(':pw@', ':newpw@');
    expect(assertResettable('staging', { url: rotated, productionUrl: PRODUCTION }).ok).toBe(true);
  });

  it('compares by user as well as host, because the pooler shares hosts', () => {
    // Supabase's session pooler gives every project in a region the same host
    // and the same database name; only the username carries the project ref. A
    // host-and-path comparison would call these two the same database and
    // refuse every legitimate staging reset.
    expect(sameDatabase(STAGING, PRODUCTION)).toBe(false);
    expect(sameDatabase(PRODUCTION, PRODUCTION.replace(':pw@', ':other@'))).toBe(true);
  });

  it('falls back to comparing whole strings when a URL will not parse', () => {
    expect(sameDatabase('host=db port=5432', 'host=db port=5432')).toBe(true);
    expect(sameDatabase('host=db port=5432', 'host=other port=5432')).toBe(false);
  });
});
