-- ---------------------------------------------------------------------------
-- 0017 — Make row-level security affordable, and enforce a block server-side.
--
-- Two changes, both about what happens when there are ten million accounts
-- rather than ten.
--
-- ## 1. `auth.uid()` becomes `(select auth.uid())`
--
-- Every owner policy in this schema was written `using (user_id = auth.uid())`.
-- That is correct and it is expensive: `auth.uid()` reads a GUC and is declared
-- STABLE, but written bare inside a policy it appears in the qualifier as a
-- per-row expression, so the planner evaluates it again for every row it
-- considers. Wrapping it in a scalar subquery turns it into an InitPlan —
-- computed once per statement and compared against as a constant, which also
-- lets the comparison be pushed down to the (user_id, updated_at) index instead
-- of being applied as a filter after the rows are read.
--
-- The difference does not show up on a developer's database. It shows up as a
-- sequential scan on the largest table the busiest user owns, and it is the
-- single cheapest scaling fix available here — the semantics are identical, so
-- there is no behaviour to re-verify beyond "the policies still refuse".
--
-- Applied by a loop rather than forty hand-written stanzas: forty near-identical
-- policies rewritten by hand is forty chances to type `user_id = user_id`, and
-- that particular typo is a schema-wide data leak that still passes a smoke
-- test. The loop cannot make it.
--
-- ## 2. A blocked account cannot write
--
-- 0010 gave the app `account_status` and the sync engine checks it before it
-- starts. That check is a courtesy — it exists so a blocked user sees an
-- explanation instead of a wall of RLS errors — and it lives in the client,
-- which means it is advice, not enforcement. Anyone with the anon key and the
-- user's own token could write regardless.
--
-- The predicate is added to WITH CHECK only, deliberately. A blocked account
-- cannot put anything new on the server; it can still read what it already
-- has, because the alternative is using moderation to cut somebody off from
-- their own journal, and export-my-data is a legal obligation rather than a
-- privilege. Blocking abuse and destroying someone's records are different
-- actions and should not be the same switch.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. THE OWNER POLICIES, REBUILT
-- ===========================================================================

do $$
declare
  -- Every table whose policy is exactly "the row belongs to the caller". The
  -- shared tables (expense groups and their children) are NOT here: their
  -- policies ask a different question — "is the caller a member of this group"
  -- — through helper functions that take a per-row argument and so cannot be
  -- hoisted the same way. They are left as they are rather than half-rewritten.
  t text;
  synced text[] := array[
    'task_categories', 'tasks',
    'note_categories', 'notes', 'note_tags', 'note_tag_links', 'note_attachments',
    'entry_links',
    'habit_categories', 'habits', 'habit_routines', 'habit_routine_items',
    'habit_logs', 'habit_skips',
    'journal_entries', 'journal_prompts', 'journal_reflections', 'journal_attachments',
    'calendar_events',
    'goals', 'goal_milestones', 'goal_progress_logs',
    'sleep_sessions', 'sleep_settings',
    'study_subjects', 'study_sessions', 'study_settings',
    'water_intake_logs',
    'budget_transactions', 'savings_goals', 'budget_debts', 'budget_settings',
    'gallery_albums', 'gallery_photos',
    'songs', 'playlists', 'playlist_songs',
    'private_entries'
  ];
begin
  foreach t in array synced loop
    -- Drop by the name each table's policy actually has. 0001, 0009, 0015 and
    -- 0016 all used the same `<table>_own` convention, which is what makes this
    -- loop possible at all.
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format(
      'create policy %I on public.%I for all
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()) and (select public.is_active((select auth.uid()))))',
      t || '_own', t
    );
  end loop;
end;
$$;

-- `profiles` keys on `id`, not `user_id`, so it is not part of the loop.
-- No is_active() here: a blocked account must still be able to correct its own
-- display name, and locking the profile row would also break the repair path in
-- features/auth/services/ensure-profile.ts.
drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  for all using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ===========================================================================
-- 2. THE REMAINING BARE auth.uid() CALLS
-- ===========================================================================
--
-- These are single-row-scope policies where the planner has much less to gain,
-- but they are rewritten for consistency: a schema where the rule is "always
-- (select auth.uid())" is one a reviewer can check by grepping, and one where
-- the rule is "usually" is not.

drop policy if exists "vault_escrow_write_own" on public.vault_escrow;
create policy "vault_escrow_write_own" on public.vault_escrow
  for insert with check (user_id = (select auth.uid()));

drop policy if exists "vault_escrow_update_own" on public.vault_escrow;
create policy "vault_escrow_update_own" on public.vault_escrow
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "push_tokens_own" on public.push_tokens;
create policy "push_tokens_own" on public.push_tokens
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- The three read-only owner policies from 0010 and 0013. `usage_daily` is the
-- one of these that actually grows without bound — a row per user per day — so
-- it is the one where the InitPlan matters rather than merely being tidy.
drop policy if exists "usage_daily_read_own" on public.usage_daily;
create policy "usage_daily_read_own" on public.usage_daily
  for select using (user_id = (select auth.uid()));

drop policy if exists "account_status_read_own" on public.account_status;
create policy "account_status_read_own" on public.account_status
  for select using (user_id = (select auth.uid()));

-- Reporter-scoped, not subject-scoped: you may see what you reported, never
-- what was reported about you. Preserved exactly — only the evaluation changes.
drop policy if exists "content_reports_read_own" on public.content_reports;
create policy "content_reports_read_own" on public.content_reports
  for select using (reporter_id = (select auth.uid()));

-- ===========================================================================
-- 3. WHAT THIS DOES NOT COVER
-- ===========================================================================
--
-- `account_status` is read by the client to explain a restriction and written
-- only by the admin functions in 0010 — its policies are already scoped to
-- is_admin(), which is a single evaluation per statement.
--
-- The expense-group tables keep their membership-function policies. Making
-- those cheap is a different piece of work: it needs the membership check to
-- become a join the planner can see through rather than a function call per
-- row, and doing it carelessly is how a shared-data schema starts leaking
-- between groups. It is the right next optimisation and it is not this one.

-- ===========================================================================
-- 4. PROOF THAT THE LOOP DID WHAT IT CLAIMS
-- ===========================================================================
--
-- A loop that silently matched nothing would leave every policy exactly as it
-- was and this migration would report success. Fail loudly instead.

do $$
declare
  offender text;
begin
  -- Postgres does not store a policy expression as it was written; it stores
  -- the parsed form and prints it back normalised, so `(select auth.uid())`
  -- reads as `( SELECT auth.uid() AS uid)`. The test is therefore: delete every
  -- *wrapped* call, then see whether any call is left. That works whatever the
  -- normaliser does to whitespace and case, which a lookbehind on the literal
  -- text does not.
  select string_agg(policyname, ', ') into offender
    from pg_policies
   where schemaname = 'public'
     and policyname like '%\_own'
     and (
       regexp_replace(coalesce(qual, ''), 'select\s+auth\.uid\(\)', '', 'gi') ~* 'auth\.uid\(\)'
       or regexp_replace(coalesce(with_check, ''), 'select\s+auth\.uid\(\)', '', 'gi')
            ~* 'auth\.uid\(\)'
     );

  if offender is not null then
    raise exception '0017 left a bare auth.uid() in: %', offender;
  end if;
end;
$$;
