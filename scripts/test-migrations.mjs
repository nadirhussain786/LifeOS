#!/usr/bin/env node
/**
 * Executes supabase/migrations against a real (WASM) Postgres and asserts the
 * behaviour that only running it can prove: that the migrations apply at all,
 * that row-level security actually refuses what it should, and that the
 * constraint triggers fire when they should.
 *
 * `check-migrations.mjs` reads the SQL; this one runs it.
 *
 * Every policy assertion goes through asUser(), which SETs ROLE to
 * `authenticated`. Postgres exempts superusers from RLS, so an assertion made on
 * the default connection would pass without proving anything.
 *
 * Run with `npm run test:sql`.
 */
import {
  asAnon,
  asUser,
  bootDatabase,
  createUser,
  expectEqual,
  expectRejection,
  summary,
  test,
} from './sql-harness.mjs';

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const STRANGER = '33333333-3333-3333-3333-333333333333';
// 0010: moderation needs an operator, somebody to moderate, and somebody whose
// behaviour trips a rule on its own.
const ADMIN = '55555555-5555-5555-5555-555555555555';
const MALLORY = '66666666-6666-6666-6666-666666666666';
const VANDAL = '77777777-7777-7777-7777-777777777777';

/** Today as the server sees it — the window checks in record_usage are relative
 * to current_date, so the test has to speak the same calendar. */
const TODAY = new Date().toISOString().slice(0, 10);

const { db, files } = await bootDatabase();
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const count = async (sql, params = []) => Number((await one(sql, params)).n);

console.log(`applied ${files.length} migrations\n`);

await createUser(db, ALICE, 'alice@example.com');
await createUser(db, BOB, 'bob@example.com');
await createUser(db, STRANGER, 'stranger@example.com');
await createUser(db, ADMIN, 'admin@example.com');
await createUser(db, MALLORY, 'mallory@example.com');
await createUser(db, VANDAL, 'vandal@example.com');

// ---------------------------------------------------------------------------
console.log('schema');
// ---------------------------------------------------------------------------

await test('0001 auto-creates a profile for each new auth user', async () => {
  expectEqual(await count('select count(*)::int n from public.profiles'), 6, 'profile count');
});

await test('every public table has row level security enabled', async () => {
  const n = await count(`
    select count(*)::int n from pg_tables t
     where t.schemaname = 'public'
       and not exists (
         select 1 from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
          where ns.nspname = 'public' and c.relname = t.tablename and c.relrowsecurity
       )`);
  expectEqual(n, 0, 'tables without RLS');
});

// ---------------------------------------------------------------------------
console.log('\nusernames (0002)');
// ---------------------------------------------------------------------------

await test('a free username reads as available', async () => {
  await asUser(db, ALICE, async () => {
    expectEqual((await one(`select public.is_username_available('alice') as v`)).v, true);
  });
});

await test('claiming succeeds and then reads as taken by somebody else', async () => {
  await asUser(db, ALICE, async () => {
    expectEqual((await one(`select public.claim_username('alice') as v`)).v, 'ok');
  });
  // The bug this guards: `profiles_own` RLS hides Alice's row from Bob, so a
  // plain `select ... where username='alice'` returns nothing and the name looks
  // free. The SECURITY DEFINER probe is what makes this false.
  await asUser(db, BOB, async () => {
    expectEqual((await one(`select public.is_username_available('alice') as v`)).v, false);
  });
});

await test('uniqueness is case-insensitive', async () => {
  await asUser(db, BOB, async () => {
    expectEqual((await one(`select public.is_username_available('ALICE') as v`)).v, false);
  });
});

await test('your own name is not a clash with yourself', async () => {
  await asUser(db, ALICE, async () => {
    expectEqual((await one(`select public.is_username_available('alice') as v`)).v, true);
  });
});

await test('a lost race returns taken rather than a 500', async () => {
  await asUser(db, BOB, async () => {
    expectEqual((await one(`select public.claim_username('alice') as v`)).v, 'taken');
  });
});

await test('malformed names are rejected by shape', async () => {
  await asUser(db, BOB, async () => {
    for (const bad of ['ab', '1bob', 'has space', 'no-dashes', 'x'.repeat(21)]) {
      const r = await one(`select public.is_username_available($1) as v`, [bad]);
      expectEqual(r.v, false, `availability of ${JSON.stringify(bad)}`);
    }
  });
});

// ---------------------------------------------------------------------------
console.log('\nusernames from the sign-up screen (0006)');
// ---------------------------------------------------------------------------

// Sign-up is the only caller of the probe, and it runs BEFORE the account exists
// — so the identity that matters is `anon` with a NULL auth.uid(). Every test
// above runs through asUser() and so cannot see this path at all. 0002 granted
// the function to `authenticated` only: anon got "permission denied", the client
// read any error as a negative verdict, and every name on the sign-up form came
// back "already taken" — which also made the form impossible to submit, since it
// gates on a positive verdict.

await test('an anonymous visitor may probe a name at all', async () => {
  await asAnon(db, async () => {
    expectEqual((await one(`select public.is_username_available('freename') as v`)).v, true);
  });
});

await test('an anonymous visitor sees a taken name as taken', async () => {
  // The null-safe self-exclusion is what this proves. With `id <> auth.uid()`,
  // a NULL uid makes the comparison NULL for every row, the NOT EXISTS matches
  // nothing, and 'alice' would come back free — the exact opposite failure.
  await asAnon(db, async () => {
    expectEqual((await one(`select public.is_username_available('alice') as v`)).v, false);
    expectEqual((await one(`select public.is_username_available('ALICE') as v`)).v, false);
  });
});

await test('an anonymous visitor still cannot read the profiles table', async () => {
  // The grant widens exactly one boolean function, not the table behind it.
  await asAnon(db, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.profiles`),
      0,
      'profile rows visible to anon',
    );
  });
});

await test('claiming a name still requires a session', async () => {
  await asAnon(db, async () => {
    await expectRejection(
      () => db.query(`select public.claim_username('freename')`),
      'permission denied',
    );
  });
});

// ---------------------------------------------------------------------------
console.log('\ngroups & RLS (0003)');
// ---------------------------------------------------------------------------

let groupId;

await test('creating a group makes the creator an owner member, atomically', async () => {
  await asUser(db, ALICE, async () => {
    const r = await one(
      `select public.create_expense_group('g1','Goa trip','trip','$','m-alice',null,'act-1',$1) as id`,
      [Date.now()],
    );
    expectEqual(r.id, 'g1', 'returned group id');
  });
  groupId = 'g1';

  const role = (await one(`select role from public.expense_group_members where id = 'm-alice'`))
    .role;
  expectEqual(role, 'owner', "creator's role");
});

await test('0007 a user with no profile row can still create a group', async () => {
  // The bug 0007 fixes. 0004 added the owner with INSERT..SELECT FROM profiles,
  // which inserts nothing when there is no profile row — so the creator was not
  // a member, the activity insert was then refused by RLS, and the whole
  // transaction rolled back with an opaque 42501 that the app reported to the
  // user as a connection failure.
  const GHOST = '44444444-4444-4444-4444-444444444444';
  await db.exec(`alter table auth.users disable trigger on_auth_user_created;`);
  await db.query(`insert into auth.users (id, email) values ($1::uuid, 'ghost@example.com')`, [
    GHOST,
  ]);
  await db.exec(`alter table auth.users enable trigger on_auth_user_created;`);
  expectEqual(
    await count(`select count(*)::int n from public.profiles where id = $1::uuid`, [GHOST]),
    0,
    'profile rows before',
  );

  await asUser(db, GHOST, async () => {
    const r = await one(
      `select public.create_expense_group('g-ghost','Flat 3B','home','$','m-ghost',null,'act-ghost',$1) as id`,
      [Date.now()],
    );
    expectEqual(r.id, 'g-ghost', 'returned group id');
  });

  expectEqual(
    await count(`select count(*)::int n from public.profiles where id = $1::uuid`, [GHOST]),
    1,
    'profile self-healed',
  );
  expectEqual(
    await count(
      `select count(*)::int n from public.expense_group_members
        where group_id = 'g-ghost' and role = 'owner'`,
    ),
    1,
    'owner member row',
  );
  // And the creator can actually see what they made.
  await asUser(db, GHOST, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.expense_groups where id = 'g-ghost'`),
      1,
      'group visible to its creator',
    );
  });
});

await test('0007 ensure_profile is idempotent and never clobbers an existing name', async () => {
  await asUser(db, ALICE, async () => {
    await db.query(`select public.ensure_profile()`);
    await db.query(`select public.ensure_profile()`);
  });
  expectEqual(
    await count(`select count(*)::int n from public.profiles where id = $1::uuid`, [ALICE]),
    1,
    'profile rows for Alice',
  );
  expectEqual(
    (await one(`select display_name from public.profiles where id = $1::uuid`, [ALICE]))
      .display_name,
    'alice',
    "Alice's display name",
  );
});

await test('0007 ensure_profile refuses an anonymous caller', async () => {
  await asAnon(db, async () => {
    await expectRejection(() => db.query(`select public.ensure_profile()`), 'permission denied');
  });
});

await test('a member can read their group', async () => {
  await asUser(db, ALICE, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.expense_groups`),
      1,
      'groups visible',
    );
  });
});

await test('a non-member cannot see the group at all', async () => {
  await asUser(db, STRANGER, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.expense_groups`),
      0,
      'groups visible',
    );
  });
});

await test('a stranger cannot insert themselves into somebody elses group', async () => {
  // The hole in the first draft of 0003: `with check (user_id = auth.uid())`
  // would have let anyone join any group and read every expense in it.
  await asUser(db, STRANGER, async () => {
    await expectRejection(
      () =>
        db.query(
          `insert into public.expense_group_members
             (id, group_id, user_id, email, role, created_at, updated_at)
           values ('m-hack', $1, $2, 'stranger@example.com', 'member', 0, 0)`,
          [groupId, STRANGER],
        ),
      'policy',
    );
  });
});

await test('a member can add somebody by email before they have an account', async () => {
  await asUser(db, ALICE, async () => {
    await db.query(
      `insert into public.expense_group_members
         (id, group_id, user_id, email, display_name, role, created_at, updated_at)
       values ('m-bob', $1, null, 'bob@example.com', 'Bob', 'member', 0, 0)`,
      [groupId],
    );
  });

  const row = await one(`select user_id, email from public.expense_group_members where id='m-bob'`);
  expectEqual(row.user_id, null, 'placeholder user_id');
});

await test('a non-member cannot add members', async () => {
  await asUser(db, STRANGER, async () => {
    await expectRejection(
      () =>
        db.query(
          `insert into public.expense_group_members
             (id, group_id, user_id, email, role, created_at, updated_at)
           values ('m-x', $1, null, 'x@example.com', 'member', 0, 0)`,
          [groupId],
        ),
      'policy',
    );
  });
});

// ---------------------------------------------------------------------------
console.log('\nexpenses, shares & the sum invariant (0003 + 0004)');
// ---------------------------------------------------------------------------

await test('an expense and its split commit together', async () => {
  await asUser(db, ALICE, async () => {
    await db.query(
      `select public.create_group_expense('e1',$1,'m-alice','Dinner',1000,'$',$2,null,
         $3::jsonb,'act-2',$2)`,
      [
        groupId,
        Date.now(),
        JSON.stringify([
          { member_id: 'm-alice', share_cents: 334 },
          { member_id: 'm-bob', share_cents: 333 },
        ]),
      ],
    );
  }).catch(() => {});
  // 334 + 333 = 667, not 1000 — the deferred trigger must have rejected it.
  expectEqual(
    await count(`select count(*)::int n from public.expense_group_expenses`),
    0,
    'expenses after an unbalanced split',
  );
});

await test('a split that does not add up is refused', async () => {
  await asUser(db, ALICE, async () => {
    await expectRejection(
      () =>
        db.query(
          `select public.create_group_expense('e-bad',$1,'m-alice','Bad',1000,'$',$2,null,
             $3::jsonb,'act-bad',$2)`,
          [groupId, Date.now(), JSON.stringify([{ member_id: 'm-alice', share_cents: 999 }])],
        ),
      'shares total',
    );
  });
});

await test('a split that adds up is accepted', async () => {
  await asUser(db, ALICE, async () => {
    await db.query(
      `select public.create_group_expense('e1',$1,'m-alice','Dinner',1000,'$',$2,null,
         $3::jsonb,'act-2',$2)`,
      [
        groupId,
        Date.now(),
        JSON.stringify([
          { member_id: 'm-alice', share_cents: 500 },
          { member_id: 'm-bob', share_cents: 500 },
        ]),
      ],
    );
  });
  expectEqual(
    await count(`select count(*)::int n from public.expense_group_shares where expense_id='e1'`),
    2,
    'share rows',
  );
});

await test('editing only the amount is refused, leaving no stale split', async () => {
  // The second trigger exists for exactly this: guarding the shares side alone
  // would let an amount edit orphan a split that no longer sums.
  await asUser(db, ALICE, async () => {
    await expectRejection(
      () => db.query(`update public.expense_group_expenses set amount_cents = 5000 where id='e1'`),
      'shares total',
    );
  });
  expectEqual(
    Number(
      (await one(`select amount_cents from public.expense_group_expenses where id='e1'`))
        .amount_cents,
    ),
    1000,
    'amount after the refused edit',
  );
});

await test('editing amount and split together succeeds', async () => {
  await asUser(db, ALICE, async () => {
    await db.query(
      `select public.update_group_expense('e1','Dinner',2000,'m-alice',$1,null,$2::jsonb,'act-3',$1)`,
      [
        Date.now(),
        JSON.stringify([
          { member_id: 'm-alice', share_cents: 1000 },
          { member_id: 'm-bob', share_cents: 1000 },
        ]),
      ],
    );
  });
  expectEqual(
    Number(
      (await one(`select amount_cents from public.expense_group_expenses where id='e1'`))
        .amount_cents,
    ),
    2000,
    'amount after a valid edit',
  );
});

await test('a non-member cannot read the groups expenses', async () => {
  await asUser(db, STRANGER, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.expense_group_expenses`),
      0,
      'expenses visible',
    );
  });
});

await test('a non-member cannot read its shares either', async () => {
  await asUser(db, STRANGER, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.expense_group_shares`),
      0,
      'shares visible',
    );
  });
});

await test('activity is append-only — even for its own author', async () => {
  // With no UPDATE policy the rows are invisible to UPDATE, so this affects zero
  // rows rather than raising. The history is protected either way; asserting the
  // value is what proves it.
  await asUser(db, ALICE, async () => {
    await db.query(
      `update public.expense_group_activity set action='expense_deleted' where id='act-2'`,
    );
  });
  expectEqual(
    (await one(`select action from public.expense_group_activity where id='act-2'`)).action,
    'expense_added',
    'action after an attempted rewrite',
  );
});

// ---------------------------------------------------------------------------
console.log('\ninvitations & push (0005)');
// ---------------------------------------------------------------------------

await test('an invitation can be created by a member', async () => {
  await asUser(db, ALICE, async () => {
    await db.query(
      `select public.create_group_invitation('inv-1',$1,'m-bob','bob@example.com','tok-good',$2,$3)`,
      [groupId, Date.now() + 86400000, Date.now()],
    );
  });
  expectEqual(
    await count(`select count(*)::int n from public.expense_group_invitations`),
    1,
    'invitations',
  );
});

await test('peeking reveals the group name and nothing else', async () => {
  await asUser(db, BOB, async () => {
    const r = await one(`select * from public.peek_group_invitation('tok-good',$1)`, [Date.now()]);
    expectEqual(r.status, 'ok');
    expectEqual(r.group_name, 'Goa trip');
  });
});

await test('an unknown token is invalid', async () => {
  await asUser(db, BOB, async () => {
    const r = await one(`select * from public.peek_group_invitation('nope',$1)`, [Date.now()]);
    expectEqual(r.status, 'invalid');
  });
});

await test('accepting claims the placeholder member, so prior splits carry over', async () => {
  await asUser(db, BOB, async () => {
    expectEqual(
      (await one(`select public.accept_group_invitation('tok-good',$1) as v`, [Date.now()])).v,
      'ok',
    );
  });
  const row = await one(`select user_id from public.expense_group_members where id='m-bob'`);
  expectEqual(row.user_id, BOB, "Bob's claimed member row");
  // The share written before Bob had an account is still his.
  expectEqual(
    await count(`select count(*)::int n from public.expense_group_shares where member_id='m-bob'`),
    1,
    'shares carried over',
  );
});

await test('Bob can now read the group he joined', async () => {
  await asUser(db, BOB, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.expense_groups`),
      1,
      'groups visible',
    );
  });
});

await test('an invitation cannot be redeemed twice', async () => {
  await asUser(db, STRANGER, async () => {
    expectEqual(
      (await one(`select public.accept_group_invitation('tok-good',$1) as v`, [Date.now()])).v,
      'already_accepted',
    );
  });
});

await test('an expired invitation is refused', async () => {
  await asUser(db, ALICE, async () => {
    await db.query(
      `select public.create_group_invitation('inv-2',$1,'m-bob','x@example.com','tok-old',$2,$3)`,
      [groupId, Date.now() - 1000, Date.now()],
    );
  });
  await asUser(db, STRANGER, async () => {
    expectEqual(
      (await one(`select public.accept_group_invitation('tok-old',$1) as v`, [Date.now()])).v,
      'expired',
    );
  });
});

await test('a device token is private to its owner', async () => {
  const now = Date.now();
  await asUser(db, ALICE, async () => {
    await db.query(`select public.register_push_token('ExponentPushToken[alice]','ios',$1)`, [now]);
  });
  await asUser(db, BOB, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.push_tokens`),
      0,
      'tokens Bob can see',
    );
  });
  await asUser(db, ALICE, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.push_tokens`),
      1,
      'tokens Alice can see',
    );
  });
});

await test('re-registering the same device updates rather than duplicates', async () => {
  const now = Date.now();
  await asUser(db, BOB, async () => {
    await db.query(`select public.register_push_token('ExponentPushToken[alice]','android',$1)`, [
      now,
    ]);
  });
  expectEqual(await count(`select count(*)::int n from public.push_tokens`), 1, 'total token rows');
  expectEqual((await one(`select user_id from public.push_tokens`)).user_id, BOB, 'new owner');
});

// ---------------------------------------------------------------------------
console.log('\ngroup lifecycle (0008)');
// ---------------------------------------------------------------------------

await test('0008 removing a member tombstones them rather than deleting the row', async () => {
  // The row has to survive: expenses, shares and settlements all reference it,
  // and the balances only add up while every party still resolves.
  await asUser(db, ALICE, async () => {
    await db.query(
      `insert into public.expense_group_members (id, group_id, user_id, email, display_name, role, created_at, updated_at)
       values ('m-temp', $1, null, 'temp@example.com', 'Temp', 'member', $2, $2)`,
      [groupId, Date.now()],
    );
    await db.query(`select public.remove_group_member('m-temp','act-rm',$1)`, [Date.now()]);
  });

  expectEqual(
    await count(`select count(*)::int n from public.expense_group_members where id = 'm-temp'`),
    1,
    'member row still present',
  );
  expectEqual(
    await count(
      `select count(*)::int n from public.expense_group_members
        where id = 'm-temp' and deleted_at is not null`,
    ),
    1,
    'member tombstoned',
  );
});

await test('0008 a removed member is still readable, so balances stay complete', async () => {
  await asUser(db, ALICE, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.expense_group_members where id = 'm-temp'`),
      1,
      'removed member visible to the group',
    );
  });
});

await test('0008 removing somebody is recorded in the activity feed', async () => {
  expectEqual(
    await count(
      `select count(*)::int n from public.expense_group_activity
        where id = 'act-rm' and action = 'member_removed'`,
    ),
    1,
    'member_removed entries',
  );
});

await test('0008 a member cannot remove another member', async () => {
  await asUser(db, ALICE, async () => {
    await db.query(
      `insert into public.expense_group_members (id, group_id, user_id, email, display_name, role, created_at, updated_at)
       values ('m-victim', $1, null, 'victim@example.com', 'Victim', 'member', $2, $2)`,
      [groupId, Date.now()],
    );
  });
  await asUser(db, BOB, async () => {
    await expectRejection(
      () => db.query(`select public.remove_group_member('m-victim','act-bad',$1)`, [Date.now()]),
      'only the group owner',
    );
  });
});

await test('0008 anybody may remove themselves, and it reads as leaving', async () => {
  const bobMember = await one(
    `select id from public.expense_group_members
      where group_id = $1 and user_id = $2::uuid and deleted_at is null`,
    [groupId, BOB],
  );
  await asUser(db, BOB, async () => {
    await db.query(`select public.remove_group_member($1,'act-left',$2)`, [
      bobMember.id,
      Date.now(),
    ]);
  });
  expectEqual(
    await count(
      `select count(*)::int n from public.expense_group_activity
        where id = 'act-left' and action = 'member_left'`,
    ),
    1,
    'member_left entries',
  );
});

await test('0008 the owner cannot be removed, which would orphan the group', async () => {
  await asUser(db, ALICE, async () => {
    await expectRejection(
      () => db.query(`select public.remove_group_member('m-alice','act-owner',$1)`, [Date.now()]),
      'owner cannot be removed',
    );
  });
});

await test('0008 a non-owner cannot delete the group', async () => {
  await asUser(db, ALICE, async () => {
    await db.query(
      `insert into public.expense_group_members (id, group_id, user_id, email, display_name, role, created_at, updated_at)
       values ('m-carol', $1, $2::uuid, 'stranger@example.com', 'Carol', 'member', $3, $3)`,
      [groupId, STRANGER, Date.now()],
    );
  });
  await asUser(db, STRANGER, async () => {
    await expectRejection(
      () =>
        db.query(`select public.delete_expense_group($1,'act-del-bad',$2)`, [groupId, Date.now()]),
      'only the group owner',
    );
  });
});

await test('0008 a member cannot soft-delete the group by writing the column directly', async () => {
  // expense_groups_update lets any member write any column, so the narrowing
  // has to be a trigger — a policy cannot see which column changed.
  await asUser(db, STRANGER, async () => {
    await expectRejection(
      () =>
        db.query(`update public.expense_groups set deleted_at = $1 where id = $2`, [
          Date.now(),
          groupId,
        ]),
      'only the group owner',
    );
  });
});

await test('0008 the owner can delete the group, and it is a tombstone', async () => {
  await asUser(db, ALICE, async () => {
    await db.query(`select public.delete_expense_group($1,'act-del',$2)`, [groupId, Date.now()]);
  });
  expectEqual(
    await count(`select count(*)::int n from public.expense_groups where id = $1`, [groupId]),
    1,
    'group row survives',
  );
  expectEqual(
    await count(
      `select count(*)::int n from public.expense_groups where id = $1 and deleted_at is not null`,
      [groupId],
    ),
    1,
    'group tombstoned',
  );
  // The whole point of soft-deleting: the ledger is still there for everyone.
  expectEqual(
    (await count(`select count(*)::int n from public.expense_group_expenses where group_id = $1`, [
      groupId,
    ])) > 0,
    true,
    'expenses preserved',
  );
});

await test('0008 deleting the group is recorded before it disappears from reads', async () => {
  expectEqual(
    await count(
      `select count(*)::int n from public.expense_group_activity
        where id = 'act-del' and action = 'group_deleted'`,
    ),
    1,
    'group_deleted entries',
  );
});

// ---------------------------------------------------------------------------
console.log('\nhistory sync (0009)');
// ---------------------------------------------------------------------------

const HISTORY_TABLES = [
  'habit_logs',
  'habit_skips',
  'water_intake_logs',
  'goal_milestones',
  'goal_progress_logs',
  'study_sessions',
  'journal_reflections',
];

await test('0009 every history table exists with the columns the engine needs', async () => {
  for (const table of HISTORY_TABLES) {
    const n = await count(
      `select count(*)::int n from information_schema.columns
        where table_schema = 'public' and table_name = $1
          and column_name in ('id','user_id','updated_at','deleted_at')`,
      [table],
    );
    expectEqual(n, 4, `${table} sync columns`);
  }
});

await test('0009 history is private to its owner', async () => {
  const now = Date.now();
  await asUser(db, ALICE, async () => {
    await db.query(
      `insert into public.habit_logs (id, user_id, habit_id, log_date, value, logged_at, created_at, updated_at)
       values ('hl-alice', $1::uuid, 'h1', '2026-07-30', 1, $2, $2, $2)`,
      [ALICE, now],
    );
  });
  await asUser(db, BOB, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.habit_logs`),
      0,
      'habit logs Bob can see',
    );
  });
  await asUser(db, ALICE, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.habit_logs`),
      1,
      'habit logs Alice can see',
    );
  });
});

await test('0009 one user cannot write history under another uid', async () => {
  const now = Date.now();
  await asUser(db, BOB, async () => {
    await expectRejection(
      () =>
        db.query(
          `insert into public.habit_logs (id, user_id, habit_id, log_date, value, logged_at, created_at, updated_at)
           values ('hl-forged', $1::uuid, 'h1', '2026-07-30', 1, $2, $2, $2)`,
          [ALICE, now],
        ),
      'row-level security',
    );
  });
});

await test('0009 a soft-deleted row still syncs, so the delete propagates', async () => {
  // The whole reason deleted_at exists here: a hard delete leaves nothing to
  // pull, so the row is resurrected on the next sync from another device.
  const now = Date.now();
  await asUser(db, ALICE, async () => {
    await db.query(
      `update public.habit_logs set deleted_at = $1, updated_at = $1 where id = 'hl-alice'`,
      [now + 1000],
    );
    expectEqual(
      await count(`select count(*)::int n from public.habit_logs where deleted_at is not null`),
      1,
      'tombstoned rows still readable',
    );
  });
});

// ---------------------------------------------------------------------------
console.log('\nusage rollups (0010)');
// ---------------------------------------------------------------------------

await test('0010 usage accumulates rather than overwrites', async () => {
  // The whole reason record_usage exists instead of a PostgREST upsert: the
  // client sends a delta per flush, and two flushes in a day must add up.
  await asUser(db, ALICE, async () => {
    await db.query(`select public.record_usage($1::jsonb, $2::bigint)`, [
      JSON.stringify([{ day: TODAY, module: 'habits', opens: 2, writes: 1 }]),
      Date.now(),
    ]);
    await db.query(`select public.record_usage($1::jsonb, $2::bigint)`, [
      JSON.stringify([{ day: TODAY, module: 'habits', opens: 3, writes: 2 }]),
      Date.now(),
    ]);
  });
  const row = await one(
    `select opens, writes from public.usage_daily
      where user_id = $1::uuid and module = 'habits' and day = $2::date`,
    [ALICE, TODAY],
  );
  expectEqual(row.opens, 5, 'opens');
  expectEqual(row.writes, 3, 'writes');
});

await test('0010 a client cannot move a counter by six orders of magnitude', async () => {
  await asUser(db, ALICE, async () => {
    await db.query(`select public.record_usage($1::jsonb, $2::bigint)`, [
      JSON.stringify([{ day: TODAY, module: 'vault', opens: 999999, writes: 0 }]),
      Date.now(),
    ]);
  });
  expectEqual(
    (
      await one(
        `select opens from public.usage_daily
          where user_id = $1::uuid and module = 'vault' and day = $2::date`,
        [ALICE, TODAY],
      )
    ).opens,
    10000,
    'clamped opens',
  );
});

await test('0010 a device with a wrong clock cannot write history', async () => {
  const longAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  await asUser(db, ALICE, async () => {
    await db.query(`select public.record_usage($1::jsonb, $2::bigint)`, [
      JSON.stringify([{ day: longAgo, module: 'sleep', opens: 1, writes: 1 }]),
      Date.now(),
    ]);
  });
  expectEqual(
    await count(`select count(*)::int n from public.usage_daily where day = $1::date`, [longAgo]),
    0,
    'rows written outside the window',
  );
});

await test('0010 usage is private to its owner', async () => {
  await asUser(db, BOB, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.usage_daily`),
      0,
      'usage rows Bob can see',
    );
  });
  await asUser(db, ALICE, async () => {
    expectEqual(
      (await count(`select count(*)::int n from public.usage_daily`)) > 0,
      true,
      'Alice can see her own',
    );
  });
});

await test('0010 recording usage requires a session', async () => {
  await asAnon(db, async () => {
    await expectRejection(
      () =>
        db.query(`select public.record_usage($1::jsonb, $2::bigint)`, [
          JSON.stringify([{ day: TODAY, module: 'habits', opens: 1, writes: 0 }]),
          Date.now(),
        ]),
      'permission denied',
    );
  });
});

await test('0010 a signed-out install can be counted, once per day', async () => {
  // Guest mode is a supported way to use LifeOS, so actives measured only from
  // usage_daily would silently under-report by everyone without an account.
  const install = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  await asAnon(db, async () => {
    await db.query(`select public.record_anon_activity($1,'ios','1.3.0')`, [install]);
    await db.query(`select public.record_anon_activity($1,'ios','1.3.0')`, [install]);
  });
  expectEqual(
    await count(`select count(*)::int n from public.anon_activity_daily where install_id = $1`, [
      install,
    ]),
    1,
    'rows for one install in one day',
  );
});

await test('0010 a malformed install id is refused', async () => {
  await asAnon(db, async () => {
    await expectRejection(
      () => db.query(`select public.record_anon_activity('not-a-uuid','ios','1.3.0')`),
      'invalid install id',
    );
  });
});

await test('0010 nobody can read the anonymous table through the API', async () => {
  // RLS with zero policies denies everything; the RPC is the only door.
  await asAnon(db, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.anon_activity_daily`),
      0,
      'rows visible to anon',
    );
  });
  await asUser(db, ALICE, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.anon_activity_daily`),
      0,
      'rows visible to a signed-in user',
    );
  });
});

// ---------------------------------------------------------------------------
console.log('\nmoderation (0010)');
// ---------------------------------------------------------------------------

await db.query(`insert into public.admins (user_id, note) values ($1::uuid, 'owner')`, [ADMIN]);

await test('0010 the admin roster is invisible, including to admins', async () => {
  await asUser(db, ADMIN, async () => {
    expectEqual(await count(`select count(*)::int n from public.admins`), 0, 'roster rows visible');
    // ...but the predicate built on it still answers.
    expectEqual((await one(`select public.is_admin() as v`)).v, true, 'is_admin');
  });
});

await test('0010 a non-admin cannot read the operator dashboards', async () => {
  await asUser(db, STRANGER, async () => {
    await expectRejection(
      () => db.query(`select * from public.admin_active_users($1::date, $2::date)`, [TODAY, TODAY]),
      'not an administrator',
    );
    await expectRejection(
      () => db.query(`select * from public.admin_module_reach($1::date, $2::date)`, [TODAY, TODAY]),
      'not an administrator',
    );
  });
});

await test('0010 an admin sees both halves of the active population', async () => {
  await asUser(db, ADMIN, async () => {
    const row = await one(`select * from public.admin_active_users($1::date, $2::date)`, [
      TODAY,
      TODAY,
    ]);
    expectEqual(Number(row.accounts), 1, 'signed-in accounts today');
    expectEqual(Number(row.installs), 1, 'signed-out installs today');
  });
});

await test('0010 module reach counts people, not rows', async () => {
  await asUser(db, ADMIN, async () => {
    const rows = (
      await db.query(`select * from public.admin_module_reach($1::date, $2::date)`, [TODAY, TODAY])
    ).rows;
    const habits = rows.find((r) => r.module === 'habits');
    expectEqual(Number(habits.accounts), 1, 'accounts touching habits');
    expectEqual(Number(habits.opens), 5, 'habit opens');
  });
});

await test('0010 a non-admin cannot set anybody standing, including their own', async () => {
  await asUser(db, STRANGER, async () => {
    await expectRejection(
      () =>
        db.query(
          `select public.admin_set_account_status($1::uuid,'active'::public.moderation_status,'self-pardon',null::timestamptz)`,
          [STRANGER],
        ),
      'not an administrator',
    );
  });
});

await test('0010 a client cannot write standing directly either', async () => {
  await asUser(db, MALLORY, async () => {
    await expectRejection(
      () =>
        db.query(
          `insert into public.account_status (user_id, status) values ($1::uuid,'active'::public.moderation_status)`,
          [MALLORY],
        ),
      'row-level security',
    );
  });
});

let mallorysGroup;

await test('0010 an account in good standing can create a group and invite', async () => {
  await asUser(db, MALLORY, async () => {
    await db.query(
      `select public.create_expense_group('g-mal','Flatmates','home','$','m-mal',null,'act-mal',$1)`,
      [Date.now()],
    );
    await db.query(
      `insert into public.expense_group_invitations
         (id, group_id, member_id, email, token, invited_by, expires_at, created_at)
       values ('inv-mal-1','g-mal',null,'friend@example.com','tok-mal-1',$1::uuid,$2,$2)`,
      [MALLORY, Date.now() + 86400000],
    );
  });
  mallorysGroup = 'g-mal';
  expectEqual(
    await count(`select count(*)::int n from public.expense_groups where id = 'g-mal'`),
    1,
    'group created',
  );
});

await test('0010 restricting an account is recorded and audited', async () => {
  await asUser(db, ADMIN, async () => {
    await db.query(
      `select public.admin_set_account_status($1::uuid,'restricted'::public.moderation_status,'invite spam',null::timestamptz)`,
      [MALLORY],
    );
  });
  const row = await one(
    `select status, auto, actor from public.account_status where user_id = $1::uuid`,
    [MALLORY],
  );
  expectEqual(row.status, 'restricted', 'status');
  expectEqual(row.auto, false, 'marked as a human decision');
  expectEqual(row.actor, ADMIN, 'actor');
  expectEqual(
    await count(
      `select count(*)::int n from public.admin_audit_log
        where action = 'set_account_status' and target_user = $1::uuid`,
      [MALLORY],
    ),
    1,
    'audit entries',
  );
});

await test('0010 a restricted account cannot invite anybody new', async () => {
  await asUser(db, MALLORY, async () => {
    await expectRejection(
      () =>
        db.query(
          `insert into public.expense_group_invitations
             (id, group_id, member_id, email, token, invited_by, expires_at, created_at)
           values ('inv-mal-2',$1,null,'victim@example.com','tok-mal-2',$2::uuid,$3,$3)`,
          [mallorysGroup, MALLORY, Date.now() + 86400000],
        ),
      'row-level security',
    );
  });
});

await test('0010 a restricted account cannot start a new group', async () => {
  await asUser(db, MALLORY, async () => {
    await expectRejection(
      () =>
        db.query(
          `select public.create_expense_group('g-mal-2','Another','home','$','m-mal-2',null,'act-mal-2',$1)`,
          [Date.now()],
        ),
      'row-level security',
    );
  });
});

await test('0010 restriction takes away reach, not their own data', async () => {
  // The distinction the whole ladder is built on: somebody who spams invitations
  // has not forfeited the ledger they share with three flatmates.
  await asUser(db, MALLORY, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.expense_groups where id = $1`, [
        mallorysGroup,
      ]),
      1,
      'their group is still readable',
    );
    expectEqual(
      await count(
        `select count(*)::int n from public.expense_group_invitations where id = 'inv-mal-1'`,
      ),
      1,
      'existing invitations still readable',
    );
  });
});

await test('0010 an expired restriction stops applying on its own', async () => {
  await asUser(db, ADMIN, async () => {
    await db.query(
      `select public.admin_set_account_status($1::uuid,'restricted'::public.moderation_status,'cooling off',$2::timestamptz)`,
      [MALLORY, new Date(Date.now() - 3600000).toISOString()],
    );
  });
  await asUser(db, MALLORY, async () => {
    expectEqual((await one(`select public.can_share($1::uuid) as v`, [MALLORY])).v, true);
    await db.query(
      `insert into public.expense_group_invitations
         (id, group_id, member_id, email, token, invited_by, expires_at, created_at)
       values ('inv-mal-3',$1,null,'friend2@example.com','tok-mal-3',$2::uuid,$3,$3)`,
      [mallorysGroup, MALLORY, Date.now() + 86400000],
    );
  });
});

await test('0010 blocked and restricted are different questions', async () => {
  await asUser(db, ADMIN, async () => {
    await db.query(
      `select public.admin_set_account_status($1::uuid,'blocked'::public.moderation_status,'abuse',null::timestamptz)`,
      [MALLORY],
    );
  });
  await asUser(db, ALICE, async () => {
    expectEqual(
      (await one(`select public.is_active($1::uuid) as v`, [MALLORY])).v,
      false,
      'blocked is not active',
    );
    expectEqual(
      (await one(`select public.can_share($1::uuid) as v`, [MALLORY])).v,
      false,
      'blocked cannot share',
    );
    expectEqual(
      (await one(`select public.is_active($1::uuid) as v`, [ALICE])).v,
      true,
      'a normal account is active',
    );
  });
});

await test('0010 an account can read why it was blocked', async () => {
  // A verdict a user cannot see is a support ticket you will answer by hand.
  await asUser(db, MALLORY, async () => {
    const row = await one(`select status, reason from public.account_status`);
    expectEqual(row.status, 'blocked', 'own status');
    expectEqual(row.reason, 'abuse', 'own reason');
  });
});

await test('0010 one account cannot read another account standing', async () => {
  await asUser(db, BOB, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.account_status`),
      0,
      'standing rows Bob can see',
    );
  });
});

// ---------------------------------------------------------------------------
console.log('\nautomatic rate rules (0010)');
// ---------------------------------------------------------------------------

await test('0010 crossing the invitation limit restricts the account automatically', async () => {
  await asUser(db, VANDAL, async () => {
    await db.query(
      `select public.create_expense_group('g-van','Spam Co','home','$','m-van',null,'act-van',$1)`,
      [Date.now()],
    );
    // The limit is 20/hour. The 21st is deliberately allowed through: the rule
    // records rather than raises, because an exception would roll back the
    // restriction it just wrote along with the offending insert.
    for (let i = 0; i < 21; i++) {
      await db.query(
        `insert into public.expense_group_invitations
           (id, group_id, member_id, email, token, invited_by, expires_at, created_at)
         values ($1,'g-van',null,'target@example.com',$2,$3::uuid,$4,$4)`,
        [`inv-van-${i}`, `tok-van-${i}`, VANDAL, Date.now() + 86400000],
      );
    }
  });

  const row = await one(
    `select status, auto, expires_at from public.account_status where user_id = $1::uuid`,
    [VANDAL],
  );
  expectEqual(row.status, 'restricted', 'status');
  expectEqual(row.auto, true, 'marked automatic');
  expectEqual(row.expires_at !== null, true, 'automatic actions always expire');
});

await test('0010 and the next invitation is refused', async () => {
  await asUser(db, VANDAL, async () => {
    await expectRejection(
      () =>
        db.query(
          `insert into public.expense_group_invitations
             (id, group_id, member_id, email, token, invited_by, expires_at, created_at)
           values ('inv-van-x','g-van',null,'target@example.com','tok-van-x',$1::uuid,$2,$2)`,
          [VANDAL, Date.now() + 86400000],
        ),
      'row-level security',
    );
  });
});

await test('0010 a rule never overrules a person', async () => {
  // Somebody looked at this account and decided it was fine. A counter crossing
  // a threshold twenty minutes later must not quietly undo that — otherwise
  // every manual pardon has a shelf life measured in minutes.
  await asUser(db, ADMIN, async () => {
    await db.query(
      `select public.admin_set_account_status($1::uuid,'active'::public.moderation_status,'reviewed: legitimate',null::timestamptz)`,
      [VANDAL],
    );
  });
  await asUser(db, VANDAL, async () => {
    for (let i = 0; i < 25; i++) {
      await db.query(
        `insert into public.expense_group_invitations
           (id, group_id, member_id, email, token, invited_by, expires_at, created_at)
         values ($1,'g-van',null,'target@example.com',$2,$3::uuid,$4,$4)`,
        [`inv-van-b-${i}`, `tok-van-b-${i}`, VANDAL, Date.now() + 86400000],
      );
    }
  });
  const row = await one(
    `select status, auto, reason from public.account_status where user_id = $1::uuid`,
    [VANDAL],
  );
  expectEqual(row.status, 'active', 'status after a rule fired against a human verdict');
  expectEqual(row.auto, false, 'still a human decision');
  expectEqual(row.reason, 'reviewed: legitimate', 'reason preserved');
});

// ---------------------------------------------------------------------------
console.log('\nremote module switches (0011)');
// ---------------------------------------------------------------------------

await test('0011 an unknown module reads as enabled, with no row needed', async () => {
  // Rule 1: the table holds overrides only, so a new module ships working
  // rather than waiting on a migration to enable it.
  expectEqual(
    await count(`select count(*)::int n from public.module_flags where module = 'habits'`),
    0,
    'rows for an untouched module',
  );
});

await test('0011 a non-admin cannot switch a module off for everybody', async () => {
  await asUser(db, STRANGER, async () => {
    await expectRejection(
      () => db.query(`select public.admin_set_module_enabled('split', false, 'nope')`),
      'not an administrator',
    );
  });
});

await test('0011 a non-admin cannot write the table directly either', async () => {
  await asUser(db, STRANGER, async () => {
    await expectRejection(
      () => db.query(`insert into public.module_flags (module, enabled) values ('split', false)`),
      'row-level security',
    );
  });
});

await test('0011 an admin can disable a module, with a reason', async () => {
  await asUser(db, ADMIN, async () => {
    await db.query(
      `select public.admin_set_module_enabled('split', false, 'Paused while we fix balances')`,
    );
  });
  const row = await one(
    `select enabled, message, actor from public.module_flags where module = 'split'`,
  );
  expectEqual(row.enabled, false, 'enabled');
  expectEqual(row.message, 'Paused while we fix balances', 'message');
  expectEqual(row.actor, ADMIN, 'actor');
});

await test('0011 every user can read the flags, including signed-out guests', async () => {
  // Guests are the population most likely to be sitting on a broken build, so
  // gating flags behind a session would leave exactly them unprotected.
  await asUser(db, BOB, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.module_flags where module = 'split'`),
      1,
      'flags Bob can see',
    );
  });
  await asAnon(db, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.module_flags where module = 'split'`),
      1,
      'flags a guest can see',
    );
  });
});

await test('0011 flipping a module is audit-logged', async () => {
  expectEqual(
    await count(
      `select count(*)::int n from public.admin_audit_log
        where action = 'set_module_enabled' and detail ->> 'module' = 'split'`,
    ),
    1,
    'audit entries',
  );
});

await test('0011 disabling a module touches none of its data', async () => {
  // Rule 2. The expenses written back in the 0003/0004 tests are still there —
  // a kill switch that deleted anything would be unusable, because nobody
  // would dare flip it.
  expectEqual(
    (await count(`select count(*)::int n from public.expense_group_expenses`)) > 0,
    true,
    'expenses after the module was switched off',
  );
});

await test('0011 clearing an override returns the module to the default', async () => {
  await asUser(db, ADMIN, async () => {
    await db.query(`select public.admin_clear_module_flag('split')`);
  });
  expectEqual(
    await count(`select count(*)::int n from public.module_flags where module = 'split'`),
    0,
    'rows after clearing',
  );
});

await test('0011 a module id is normalised, so casing cannot fork a flag', async () => {
  // Two rows for 'Split' and 'split' would mean the switch silently stops
  // matching what the client asks for.
  await asUser(db, ADMIN, async () => {
    await db.query(`select public.admin_set_module_enabled('  GALLERY  ', false, null)`);
  });
  expectEqual(
    await count(`select count(*)::int n from public.module_flags where module = 'gallery'`),
    1,
    'normalised row',
  );
});

await test('0011 an empty module id is refused', async () => {
  await asUser(db, ADMIN, async () => {
    await expectRejection(
      () => db.query(`select public.admin_set_module_enabled('   ', false, null)`),
      'module is required',
    );
  });
});

// ---------------------------------------------------------------------------
console.log('\nadmin user directory (0012)');
// ---------------------------------------------------------------------------

await test('0012 a non-admin cannot list the users', async () => {
  await asUser(db, STRANGER, async () => {
    await expectRejection(
      () => db.query(`select * from public.admin_list_users(null, 50, 0)`),
      'not an administrator',
    );
  });
});

await test('0012 a non-admin cannot open somebody else profile', async () => {
  await asUser(db, STRANGER, async () => {
    await expectRejection(
      () => db.query(`select * from public.admin_user_detail($1::uuid)`, [ALICE]),
      'not an administrator',
    );
  });
});

await test('0012 an admin sees every account', async () => {
  await asUser(db, ADMIN, async () => {
    const rows = (await db.query(`select * from public.admin_list_users(null, 200, 0)`)).rows;
    expectEqual(rows.length >= 6, true, 'accounts listed');
  });
});

await test('0012 the directory can be searched by email and by username', async () => {
  await asUser(db, ADMIN, async () => {
    const byEmail = (await db.query(`select * from public.admin_list_users('alice@', 50, 0)`)).rows;
    expectEqual(byEmail.length, 1, 'matches for an email fragment');
    expectEqual(byEmail[0].user_id, ALICE, 'matched account');

    const byName = (await db.query(`select * from public.admin_list_users('alice', 50, 0)`)).rows;
    expectEqual(byName.length, 1, 'matches for a username');
  });
});

await test('0012 the drill-down carries the signals an abuse call is made from', async () => {
  await asUser(db, ADMIN, async () => {
    const row = (await db.query(`select * from public.admin_user_detail($1::uuid)`, [VANDAL]))
      .rows[0];
    expectEqual(row.user_id, VANDAL, 'account');
    // Vandal sent 46 invitations across the two rate-limit tests.
    expectEqual(Number(row.invitations_sent) > 20, true, 'invitations sent');
    expectEqual(row.recent_actions.invitation_created > 20, true, 'recent action counters');
    expectEqual(row.status, 'active', 'standing after the manual pardon');
  });
});

await test('0012 opening a profile is itself audit-logged', async () => {
  // The check that makes broad read access safe to hold: an operator with a
  // reason to look is unaffected, one browsing out of curiosity leaves a trail.
  expectEqual(
    await count(
      `select count(*)::int n from public.admin_audit_log
        where action = 'view_user_detail' and target_user = $1::uuid`,
      [VANDAL],
    ),
    1,
    'audit entries for the profile view',
  );
});

await test('0012 the directory exposes no user content, only account data', async () => {
  // The property that matters most here, asserted against the shape of the
  // result rather than by trusting the implementation to stay honest.
  //
  // `display_name` and `username` are deliberately not in the forbidden list:
  // they are account identity, which is the whole point of a directory. What
  // must never appear is anything that could carry something the user *wrote*.
  await asUser(db, ADMIN, async () => {
    const row = (await db.query(`select * from public.admin_user_detail($1::uuid)`, [ALICE]))
      .rows[0];
    const keys = Object.keys(row);

    for (const forbidden of ['title', 'body', 'content', 'payload', 'caption', 'file']) {
      expectEqual(
        keys.some((k) => k.includes(forbidden)),
        false,
        `no "${forbidden}" column in the drill-down`,
      );
    }
    // `status_reason` is a moderator's own note, not the user's writing — it is
    // the one free-text field here and it is written by the operator.
    expectEqual(
      keys.filter((k) => k.includes('reason')).join(','),
      'status_reason',
      'the only free-text column',
    );
  });
});

await test('0012 per-module usage counts activity, never content', async () => {
  await asUser(db, ADMIN, async () => {
    const rows = (
      await db.query(`select * from public.admin_user_module_usage($1::uuid, $2::date, $3::date)`, [
        ALICE,
        TODAY,
        TODAY,
      ])
    ).rows;
    const habits = rows.find((r) => r.module === 'habits');
    expectEqual(Number(habits.opens), 5, 'habit opens');
    expectEqual(Object.keys(habits).sort().join(','), 'days_active,module,opens,writes', 'columns');
  });
});

// ---------------------------------------------------------------------------
console.log('\nreports (0013)');
// ---------------------------------------------------------------------------

await test('0013 a member can report content, attaching what they can see', async () => {
  // The evidence gets here by the only route that exists under end-to-end
  // encryption: somebody who could already read it chose to attach it.
  await asUser(db, BOB, async () => {
    await db.query(
      `select public.submit_content_report('rep-1', $1::uuid, 'expense_group', 'g1',
         'harassment', 'abusive expense description', $2::jsonb)`,
      [ALICE, JSON.stringify({ text: 'the reported message' })],
    );
  });
  expectEqual(
    await count(`select count(*)::int n from public.content_reports where id = 'rep-1'`),
    1,
    'reports filed',
  );
});

await test('0013 you cannot report yourself', async () => {
  await asUser(db, BOB, async () => {
    await expectRejection(
      () =>
        db.query(
          `select public.submit_content_report('rep-self', $1::uuid, 'expense_group', 'g1',
             'spam', null, '{}'::jsonb)`,
          [BOB],
        ),
      'cannot report yourself',
    );
  });
});

await test('0013 a reporter can see their own report but not others', async () => {
  await asUser(db, BOB, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.content_reports`),
      1,
      'own reports',
    );
  });
  // The accused must never learn who reported them — that is how a reporter
  // gets retaliated against.
  await asUser(db, ALICE, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.content_reports`),
      0,
      'reports visible to the reported account',
    );
  });
});

await test('0013 a report cannot be marked resolved by the person who filed it', async () => {
  await asUser(db, BOB, async () => {
    await db.query(`update public.content_reports set status = 'dismissed' where id = 'rep-1'`);
  });
  expectEqual(
    (await one(`select status from public.content_reports where id = 'rep-1'`)).status,
    'open',
    'status after a reporter tried to close it',
  );
});

await test('0013 brigading is rate-limited', async () => {
  // A brigade filing hundreds of reports is a denial of service on the
  // operator's attention, and on the accused.
  await asUser(db, STRANGER, async () => {
    for (let i = 0; i < 20; i++) {
      await db.query(
        `select public.submit_content_report($1, $2::uuid, 'expense_group', 'g1', 'spam', null, '{}'::jsonb)`,
        [`rep-flood-${i}`, ALICE],
      );
    }
    await expectRejection(
      () =>
        db.query(
          `select public.submit_content_report('rep-flood-x', $1::uuid, 'expense_group', 'g1',
             'spam', null, '{}'::jsonb)`,
          [ALICE],
        ),
      'too many reports',
    );
  });
});

await test('0013 a non-admin cannot read the report queue', async () => {
  await asUser(db, STRANGER, async () => {
    await expectRejection(
      () => db.query(`select * from public.admin_list_reports(null, 100)`),
      'not an administrator',
    );
  });
});

await test('0013 the queue shows the evidence and how often the account is reported', async () => {
  await asUser(db, ADMIN, async () => {
    const rows = (await db.query(`select * from public.admin_list_reports('open', 100)`)).rows;
    const first = rows.find((r) => r.id === 'rep-1');
    expectEqual(first.evidence.text, 'the reported message', 'attached evidence');
    // One report is a disagreement; a pile from different people is a pattern.
    expectEqual(Number(first.reports_against), 21, 'total reports against the account');
  });
});

await test('0013 resolving a report is audit-logged', async () => {
  await asUser(db, ADMIN, async () => {
    await db.query(`select public.admin_resolve_report('rep-1', 'dismissed', 'not abusive')`);
  });
  expectEqual(
    (await one(`select status from public.content_reports where id = 'rep-1'`)).status,
    'dismissed',
    'status',
  );
  expectEqual(
    await count(
      `select count(*)::int n from public.admin_audit_log where action = 'resolve_report'`,
    ),
    1,
    'audit entries',
  );
});

await test('0013 profiles carry an avatar path', async () => {
  expectEqual(
    await count(
      `select count(*)::int n from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles'
          and column_name in ('avatar_path', 'avatar_updated_at')`,
    ),
    2,
    'avatar columns',
  );
});

// ---------------------------------------------------------------------------
console.log('\nadmin origin allowlist (0014)');
// ---------------------------------------------------------------------------

/** Impersonates PostgREST's request headers, which is where the client IP and
 * the registered device id arrive from. */
const withHeaders = async (headers, fn) => {
  await db.query(`select set_config('request.headers', $1, false)`, [JSON.stringify(headers)]);
  try {
    return await fn();
  } finally {
    await db.query(`select set_config('request.headers', '', false)`);
  }
};

await test('0014 an empty allowlist leaves admin access unrestricted', async () => {
  // The bootstrap case. Without it the first migration locks the owner out of
  // the console they need in order to register their own IP.
  await asUser(db, ADMIN, async () => {
    expectEqual((await one(`select public.is_admin() as v`)).v, true);
  });
});

await test('0014 registering an origin immediately restricts everyone else', async () => {
  await db.query(
    `insert into public.admin_allowed_origins (id, ip_range, label)
     values ('office', '203.0.113.0/24'::cidr, 'Office network')`,
  );
  await asUser(db, ADMIN, async () => {
    await withHeaders({ 'x-forwarded-for': '198.51.100.7' }, async () => {
      expectEqual((await one(`select public.is_admin() as v`)).v, false, 'from an unknown IP');
    });
  });
});

await test('0014 a request from the registered range is allowed', async () => {
  await asUser(db, ADMIN, async () => {
    await withHeaders({ 'x-forwarded-for': '203.0.113.44' }, async () => {
      expectEqual((await one(`select public.is_admin() as v`)).v, true);
    });
  });
});

await test('0014 only the first x-forwarded-for entry counts', async () => {
  // The classic bug: reading the last entry (or the whole string) lets a caller
  // prepend anything they like and walk straight through the allowlist.
  await asUser(db, ADMIN, async () => {
    await withHeaders({ 'x-forwarded-for': '198.51.100.7, 203.0.113.44' }, async () => {
      expectEqual(
        (await one(`select public.is_admin() as v`)).v,
        false,
        'spoofed proxy chain ending in an allowed IP',
      );
    });
  });
});

await test('0014 a registered device id works from any network', async () => {
  // IP alone is unusable from a phone — carrier NAT reassigns constantly.
  await db.query(
    `insert into public.admin_allowed_origins (id, device_id, label)
     values ('laptop', 'device-secret-abc', 'Owner laptop')`,
  );
  await asUser(db, ADMIN, async () => {
    await withHeaders(
      { 'x-forwarded-for': '198.51.100.7', 'x-admin-device': 'device-secret-abc' },
      async () => {
        expectEqual((await one(`select public.is_admin() as v`)).v, true);
      },
    );
  });
});

await test('0014 a non-admin on an allowed origin is still not an admin', async () => {
  // The allowlist is a second factor, never a first one.
  await asUser(db, STRANGER, async () => {
    await withHeaders({ 'x-forwarded-for': '203.0.113.44' }, async () => {
      expectEqual((await one(`select public.is_admin() as v`)).v, false);
    });
  });
});

await test('0014 the origin gate covers every admin function, not just is_admin', async () => {
  // The whole point of gating inside is_admin(): one change, applied at every
  // call site that already existed.
  await asUser(db, ADMIN, async () => {
    await withHeaders({ 'x-forwarded-for': '198.51.100.7' }, async () => {
      await expectRejection(
        () => db.query(`select * from public.admin_list_users(null, 10, 0)`),
        'not an administrator',
      );
      await expectRejection(
        () => db.query(`select public.admin_set_module_enabled('split', false, null)`),
        'not an administrator',
      );
    });
  });
});

await test('0014 an admin can find out why they are being refused', async () => {
  await asUser(db, ADMIN, async () => {
    await withHeaders({ 'x-forwarded-for': '198.51.100.7' }, async () => {
      const row = await one(`select * from public.admin_origin_debug()`);
      expectEqual(row.on_roster, true, 'on the roster');
      expectEqual(row.origin_allowed, false, 'origin allowed');
      expectEqual(row.seen_ip, '198.51.100.7', 'the IP the server actually saw');
    });
  });
});

// Clear the allowlist so the escrow tests below run unrestricted.
await db.query(`delete from public.admin_allowed_origins`);

// ---------------------------------------------------------------------------
console.log('\nvault escrow & private sync (0015)');
// ---------------------------------------------------------------------------

await test('0015 a user can write their own escrow blob', async () => {
  await asUser(db, ALICE, async () => {
    await db.query(
      `insert into public.vault_escrow (user_id, ephemeral_public_key, wrapped_key)
       values ($1::uuid, 'eph-alice', 'wrapped-alice')`,
      [ALICE],
    );
  });
  expectEqual(await count(`select count(*)::int n from public.vault_escrow`), 1, 'escrow rows');
});

await test('0015 one user cannot forge an escrow under another uid', async () => {
  await asUser(db, BOB, async () => {
    await expectRejection(
      () =>
        db.query(
          `insert into public.vault_escrow (user_id, ephemeral_public_key, wrapped_key)
           values ($1::uuid, 'eph-forged', 'wrapped-forged')`,
          [ALICE],
        ),
      'row-level security',
    );
  });
});

await test('0015 no client can read an escrow blob, not even its owner', async () => {
  // There is no SELECT policy at all: the blob only ever leaves through the
  // audited admin function, so reading a vault key always leaves a record.
  await asUser(db, ALICE, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.vault_escrow`),
      0,
      'escrow rows visible to its owner',
    );
  });
  await asUser(db, BOB, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.vault_escrow`),
      0,
      'escrow rows visible to a stranger',
    );
  });
});

await test('0015 private entries are private to their owner', async () => {
  const now = Date.now();
  await asUser(db, ALICE, async () => {
    await db.query(
      `insert into public.private_entries (id, user_id, payload, created_at, updated_at)
       values ('pe-1', $1::uuid, 'ciphertext-alice', $2, $2)`,
      [ALICE, now],
    );
  });
  await asUser(db, BOB, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.private_entries`),
      0,
      'private entries Bob can see',
    );
  });
});

await test('0015 a non-admin cannot unseal anybody vault', async () => {
  await asUser(db, BOB, async () => {
    await expectRejection(
      () =>
        db.query(`select * from public.admin_fetch_vault_escrow($1::uuid, 'investigating abuse')`, [
          ALICE,
        ]),
      'not an administrator',
    );
  });
});

await test('0015 unsealing requires a stated reason', async () => {
  // An operator who cannot articulate why they are opening somebody's private
  // space does not get to open it.
  await asUser(db, ADMIN, async () => {
    await expectRejection(
      () => db.query(`select * from public.admin_fetch_vault_escrow($1::uuid, 'x')`, [ALICE]),
      'a reason is required',
    );
  });
});

await test('0015 an admin can unseal, and it is recorded before anything is returned', async () => {
  await asUser(db, ADMIN, async () => {
    const row = await one(
      `select * from public.admin_fetch_vault_escrow($1::uuid, 'report #42: harassment')`,
      [ALICE],
    );
    expectEqual(row.wrapped_key, 'wrapped-alice', 'returned blob');
  });
  const audit = await one(
    `select detail from public.admin_audit_log
      where action = 'unseal_vault_escrow' and target_user = $1::uuid`,
    [ALICE],
  );
  expectEqual(audit.detail.reason, 'report #42: harassment', 'the logged reason');
});

await test('0015 reading private rows is logged separately from unsealing', async () => {
  // Pulling ciphertext without the key is a legitimate diagnostic and should
  // not read as an unseal in the audit trail.
  await asUser(db, ADMIN, async () => {
    const rows = (
      await db.query(
        `select * from public.admin_fetch_private_entries($1::uuid, 'report #42', 100)`,
        [ALICE],
      )
    ).rows;
    expectEqual(rows.length, 1, 'rows returned');
    expectEqual(rows[0].payload, 'ciphertext-alice', 'still ciphertext on the wire');
  });
  expectEqual(
    await count(
      `select count(*)::int n from public.admin_audit_log where action = 'read_private_entries'`,
    ),
    1,
    'separate audit action',
  );
});

await test('0015 escrow status reveals existence without unsealing', async () => {
  await asUser(db, ADMIN, async () => {
    const row = await one(`select * from public.admin_escrow_status($1::uuid)`, [ALICE]);
    expectEqual(row.has_escrow, true, 'has escrow');
    expectEqual(Number(row.entry_count), 1, 'entry count');
  });
  // Checking status is not an unseal, so it must not have added one.
  expectEqual(
    await count(
      `select count(*)::int n from public.admin_audit_log where action = 'unseal_vault_escrow'`,
    ),
    1,
    'unseal entries after a status check',
  );
});

// ---------------------------------------------------------------------------
console.log('\nfull sync coverage (0016)');
// ---------------------------------------------------------------------------

/** Every table the sync engine touches, and the column it is keyed by. Kept in
 *  step with features/sync/config/sync-tables.ts by the contract test there;
 *  what is checked here is the half that only a real database can answer. */
const SYNCED = [
  ...[
    'task_categories',
    'tasks',
    'note_categories',
    'notes',
    'note_tags',
    'note_tag_links',
    'note_attachments',
    'entry_links',
    'habit_categories',
    'habits',
    'habit_routines',
    'habit_routine_items',
    'habit_logs',
    'habit_skips',
    'journal_entries',
    'journal_prompts',
    'journal_reflections',
    'journal_attachments',
    'calendar_events',
    'goals',
    'goal_milestones',
    'goal_progress_logs',
    'sleep_sessions',
    'study_subjects',
    'study_sessions',
    'water_intake_logs',
    'budget_transactions',
    'savings_goals',
    'budget_debts',
    'gallery_albums',
    'gallery_photos',
    'songs',
    'playlists',
    'playlist_songs',
    'private_entries',
  ].map((table) => ({ table, key: 'id' })),
  ...['sleep_settings', 'study_settings', 'budget_settings'].map((table) => ({
    table,
    key: 'user_id',
  })),
];

await test('0016 every synced table exists with the columns the engine reads', async () => {
  for (const { table, key } of SYNCED) {
    const columns = (
      await db.query(
        `select column_name from information_schema.columns
          where table_schema = 'public' and table_name = $1`,
        [table],
      )
    ).rows.map((row) => row.column_name);
    if (columns.length === 0) throw new Error(`${table}: no such table`);
    for (const required of [key, 'user_id', 'updated_at']) {
      if (!columns.includes(required)) throw new Error(`${table}: missing ${required}`);
    }
  }
});

await test('0016 no synced table exposes a device-local column', async () => {
  // Uploading another device's notification handles or file paths is worse than
  // not syncing the row at all — see SYNC_DEVICE_LOCAL_COLUMNS. The server not
  // having the column is what makes that impossible rather than merely
  // discouraged.
  const leaked = (
    await db.query(
      `select table_name, column_name from information_schema.columns
        where table_schema = 'public'
          and table_name = any($1)
          and column_name in ('uri', 'thumbnail_uri', 'reminder_notification_id')`,
      [SYNCED.map((s) => s.table)],
    )
  ).rows;
  expectEqual(
    leaked.map((row) => `${row.table_name}.${row.column_name}`).join(', '),
    '',
    'device-local columns on the server',
  );
});

await test('0016 every synced table is indexed on (user_id, updated_at)', async () => {
  // The engine reads nothing else. Without the index this is a sequential scan
  // of every user's rows on every pull.
  const missing = [];
  for (const { table } of SYNCED) {
    const found = await count(
      `select count(*)::int n from pg_indexes
        where schemaname = 'public' and tablename = $1
          and indexdef like '%(user_id, updated_at)%'`,
      [table],
    );
    if (found === 0) missing.push(table);
  }
  expectEqual(missing.join(', '), '', 'tables without a sync index');
});

await test('0016 every synced table refuses another user', async () => {
  // RLS, asserted per table rather than per migration: a table added later with
  // `enable row level security` but no policy reads as locked down to a static
  // check and is wide open to nobody, which is a different bug with the same
  // shape. This inserts as Alice and reads as Bob.
  await asUser(db, ALICE, async () => {
    await db.query(
      `insert into public.note_tags (id, user_id, name, created_at, updated_at)
        values ('tag-a', $1, 'private tag', 1, 1)`,
      [ALICE],
    );
    await db.query(
      `insert into public.sleep_settings (user_id, goal_minutes, updated_at)
        values ($1, 400, 1)`,
      [ALICE],
    );
  });

  await asUser(db, BOB, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.note_tags`),
      0,
      "Bob's view of Alice's tags",
    );
    expectEqual(
      await count(`select count(*)::int n from public.sleep_settings`),
      0,
      "Bob's view of Alice's sleep settings",
    );
  });

  await asUser(db, ALICE, async () => {
    expectEqual(await count(`select count(*)::int n from public.note_tags`), 1, 'Alice sees hers');
  });
});

await test('0016 one user cannot write a row under another uid', async () => {
  await asUser(db, BOB, async () => {
    await expectRejection(
      () =>
        db.query(
          `insert into public.entry_links
            (id, user_id, source_type, source_id, target_type, target_id, relation,
             created_at, updated_at)
           values ('forged', $1, 'note', 'n1', 'note', 'n2', 'mentions', 1, 1)`,
          [ALICE],
        ),
      'row-level security',
    );
  });
});

await test('0016 an anonymous caller sees none of it', async () => {
  await asAnon(db, async () => {
    for (const table of ['note_tags', 'gallery_photos', 'songs', 'budget_settings']) {
      expectEqual(
        await count(`select count(*)::int n from public.${table}`),
        0,
        `anon rows in ${table}`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
console.log('\nRLS at scale (0017)');
// ---------------------------------------------------------------------------

await test('0017 owner policies still refuse another user after the rewrite', async () => {
  // The rewrite is meant to be semantics-preserving. This is the assertion that
  // says so: if the loop had produced `user_id = user_id`, every table in the
  // schema would be world-readable and every other test here would still pass.
  await asUser(db, ALICE, async () => {
    await db.query(
      `insert into public.tasks (id, user_id, title, created_at, updated_at)
        values ('t-rls', $1, 'Alice private task', 1, 1)`,
      [ALICE],
    );
  });
  await asUser(db, BOB, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.tasks where id = 't-rls'`),
      0,
      "Bob's view of Alice's task",
    );
  });
  await asUser(db, ALICE, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.tasks where id = 't-rls'`),
      1,
      'Alice sees her own',
    );
  });
});

await test('0017 a blocked account cannot write, server-side', async () => {
  // The sync engine refuses to run for a blocked account, but that check is in
  // the client and is therefore advice. This is the enforcement.
  await asUser(db, VANDAL, async () => {
    await db.query(
      `insert into public.notes (id, user_id, title, created_at, updated_at)
        values ('n-before', $1, 'written while in good standing', 1, 1)`,
      [VANDAL],
    );
  });

  await db.query(
    `insert into public.account_status (user_id, status, reason, actor)
      values ($1, 'blocked', 'abuse', $2)
     on conflict (user_id) do update set status = 'blocked', reason = 'abuse', expires_at = null`,
    [VANDAL, ADMIN],
  );

  await asUser(db, VANDAL, async () => {
    await expectRejection(
      () =>
        db.query(
          `insert into public.notes (id, user_id, title, created_at, updated_at)
            values ('n-after', $1, 'written while blocked', 2, 2)`,
          [VANDAL],
        ),
      'row-level security',
    );
  });
});

await test('0019 a blocked account cannot read its own data either', async () => {
  // 0017 allowed this; 0019 deliberately does not. A block that leaves the
  // cloud copy readable through any HTTP client is not a block, and the
  // export-my-data obligation is now served by the operator surface (an admin
  // can produce the rows) rather than by leaving the account's own access open.
  await asUser(db, VANDAL, async () => {
    expectEqual(
      await count(`select count(*)::int n from public.notes where id = 'n-before'`),
      0,
      'blocked user reading their own note',
    );
  });
});

await test('0019 a blocked account can still read why', async () => {
  // account_status, profiles and device_commands stay reachable on purpose:
  // "you are blocked" with no reason and no expiry is how an appeal turns into
  // a support ticket answered by hand.
  await asUser(db, VANDAL, async () => {
    const row = await one(
      `select status::text, reason from public.account_status where user_id = $1`,
      [VANDAL],
    );
    expectEqual(row.status, 'blocked', 'own standing is readable');
    expectEqual(row.reason, 'abuse', 'and says why');
  });
});

await test('0017 lifting the block restores writing', async () => {
  await db.query(`update public.account_status set status = 'active' where user_id = $1`, [VANDAL]);
  await asUser(db, VANDAL, async () => {
    await db.query(
      `insert into public.notes (id, user_id, title, created_at, updated_at)
        values ('n-restored', $1, 'unblocked', 3, 3)`,
      [VANDAL],
    );
  });
  expectEqual(
    await count(`select count(*)::int n from public.notes where id = 'n-restored'`),
    1,
    'write after the block was lifted',
  );
});

await test('0017 an expired block stops applying on its own', async () => {
  // `is_active()` honours expires_at, so a timed restriction lapses without
  // anybody having to remember to clear it.
  await db.query(
    `update public.account_status
        set status = 'blocked', expires_at = now() - interval '1 hour'
      where user_id = $1`,
    [VANDAL],
  );
  await asUser(db, VANDAL, async () => {
    await db.query(
      `insert into public.notes (id, user_id, title, created_at, updated_at)
        values ('n-expired', $1, 'block already lapsed', 4, 4)`,
      [VANDAL],
    );
  });
  expectEqual(
    await count(`select count(*)::int n from public.notes where id = 'n-expired'`),
    1,
    'write after the block expired',
  );
});
summary();
