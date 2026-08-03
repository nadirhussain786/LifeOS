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

const { db, files } = await bootDatabase();
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const count = async (sql, params = []) => Number((await one(sql, params)).n);

console.log(`applied ${files.length} migrations\n`);

await createUser(db, ALICE, 'alice@example.com');
await createUser(db, BOB, 'bob@example.com');
await createUser(db, STRANGER, 'stranger@example.com');

// ---------------------------------------------------------------------------
console.log('schema');
// ---------------------------------------------------------------------------

await test('0001 auto-creates a profile for each new auth user', async () => {
  expectEqual(await count('select count(*)::int n from public.profiles'), 3, 'profile count');
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

summary();
