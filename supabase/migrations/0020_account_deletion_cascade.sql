-- 0020_account_deletion_cascade.sql
--
-- Makes "delete my account" actually delete the account's data.
--
-- ## What was wrong
--
-- Deletion was a hand-written list of 15 table names in the delete-account edge
-- function. Sync covers 38 tables. The 23 it did not name included every water
-- log, the whole gallery and music library, all of the habit/goal/journal/note
-- history added by 0009 and 0016, `private_entries` — cycle and intimacy
-- records, GDPR Art. 9 special category — and `vault_escrow`, the sealed copy
-- of the private space's master key.
--
-- Nothing caught it because nothing could. `user_id` on these tables is a bare
-- `uuid not null` with no foreign key, so `auth.admin.deleteUser()` does not
-- cascade to them: the auth user disappears and the rows stay, now owned by a
-- uuid that no longer resolves to anybody. Every RLS policy here is
-- `user_id = auth.uid()`, so from that moment the rows are unreachable by any
-- client and invisible to any support query that starts from a user — they are
-- not orphaned in the recoverable sense, they are simply undeletable except by
-- somebody who already knows the departed uid.
--
-- ## What this does
--
-- Puts the guarantee in the database instead of in a list somebody has to
-- remember. Every per-user table gets `references auth.users(id) on delete
-- cascade`, so deleting the auth user deletes the data as one transaction, and
-- a row whose owner does not exist becomes unrepresentable rather than merely
-- unlikely.
--
-- The two helper functions exist because the failure being fixed was silent.
-- `account_deletion_uncovered_tables()` is the preflight: it names any table
-- this migration would have had to cover and does not, which is what a table
-- added by a later migration without the constraint looks like. The edge
-- function refuses to delete anything when it returns rows, because a partial
-- delete cannot be retried — the auth user is gone and with it the only handle
-- on what was missed. `account_data_remaining()` is the postflight, and answers
-- the question the old code assumed: is it actually gone.
--
-- ## What deliberately does NOT cascade
--
-- `expense_group_members.user_id` and `expense_groups.created_by` are `on
-- delete set null`, from 0003, and stay that way. A shared ledger has to keep
-- balancing after one member leaves: dropping their membership row would
-- silently rewrite what everybody else in the group is owed. The member row
-- survives as a name with no account behind it, which is the same shape 0008
-- already uses for a removed member. `content_reports.reported_user_id` is
-- `set null` for the same reason in reverse — a report has to outlive the
-- account it names, or deleting your account erases the case against you.

-- ---------------------------------------------------------------------------
-- The per-user tables, given a real owner
-- ---------------------------------------------------------------------------
--
-- Idempotent in both halves: re-running skips tables that already have the
-- constraint. The orphan sweep runs first because ADD CONSTRAINT validates
-- existing rows and would abort on any row whose user_id has no auth user —
-- and those rows are precisely the leak this migration closes, so deleting
-- them is the fix rather than an obstacle to it. It is reported per table
-- rather than done quietly; a non-zero count on a database that has been live
-- means data was already stranded there.

do $do$
declare
  target text;
  orphans bigint;
  targets constant text[] := array[
    'budget_debts', 'budget_settings', 'budget_transactions', 'calendar_events',
    'entry_links', 'gallery_albums', 'gallery_photos', 'goal_milestones',
    'goal_progress_logs', 'goals', 'habit_categories', 'habit_logs',
    'habit_routine_items', 'habit_routines', 'habit_skips', 'habits',
    'journal_attachments', 'journal_entries', 'journal_prompts',
    'journal_reflections', 'note_attachments', 'note_categories',
    'note_tag_links', 'note_tags', 'notes', 'playlist_songs', 'playlists',
    'savings_goals', 'sleep_sessions', 'sleep_settings', 'songs',
    'study_sessions', 'study_settings', 'study_subjects', 'task_categories',
    'tasks', 'water_intake_logs'
  ];
begin
  foreach target in array targets loop
    execute format(
      'delete from public.%I x
        where x.user_id is not null
          and not exists (select 1 from auth.users u where u.id = x.user_id)',
      target);
    get diagnostics orphans = row_count;
    if orphans > 0 then
      raise notice '0020: removed % ownerless row(s) from %', orphans, target;
    end if;

    if not exists (
      select 1 from pg_constraint
       where conrelid = format('public.%I', target)::regclass
         and contype = 'f'
         and confrelid = 'auth.users'::regclass
    ) then
      execute format(
        'alter table public.%I
           add constraint %I foreign key (user_id)
           references auth.users(id) on delete cascade',
        target, target || '_user_id_fkey');
    end if;
  end loop;
end
$do$;

-- ---------------------------------------------------------------------------
-- Preflight: which per-user tables would survive a deletion
-- ---------------------------------------------------------------------------
--
-- Derived from the catalog, not from a list, so it sees a table the day it is
-- created rather than the day somebody remembers to add it here. A `user_id
-- uuid` column with no foreign key to auth.users is the exact shape of the
-- 23-table gap above, and there is no legitimate instance of it: the tables
-- that intentionally outlive their user hold a foreign key too, they just
-- resolve it with `set null`.

create or replace function public.account_deletion_uncovered_tables()
returns setof text
language sql
stable
security definer
set search_path = public, pg_catalog
as $fn$
  select c.relname::text
    from pg_class c
    join pg_namespace ns on ns.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
   where ns.nspname = 'public'
     and c.relkind = 'r'
     and a.attname = 'user_id'
     and a.atttypid = 'uuid'::regtype
     and not a.attisdropped
     and not exists (
       select 1 from pg_constraint fk
        where fk.conrelid = c.oid
          and fk.contype = 'f'
          and fk.confrelid = 'auth.users'::regclass
          and a.attnum = any (fk.conkey)
     )
   order by 1;
$fn$;

-- ---------------------------------------------------------------------------
-- Postflight: what is still here for a user who should be gone
-- ---------------------------------------------------------------------------
--
-- Runs after the auth user is deleted, when every cascade has fired and every
-- `set null` has nulled, so a table that still answers for this uid is a table
-- nothing reached. Scans by catalog for the same reason as above.

create or replace function public.account_data_remaining(p_user_id uuid)
returns table (relation text, rows_left bigint)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $fn$
declare
  target text;
  n bigint;
begin
  for target in
    select c.relname::text
      from pg_class c
      join pg_namespace ns on ns.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid
     where ns.nspname = 'public'
       and c.relkind = 'r'
       and a.attname = 'user_id'
       and a.atttypid = 'uuid'::regtype
       and not a.attisdropped
     order by c.relname
  loop
    execute format('select count(*) from public.%I where user_id = $1', target)
      into n using p_user_id;
    if n > 0 then
      relation := target;
      rows_left := n;
      return next;
    end if;
  end loop;

  -- profiles keys the user on `id`, so the scan above cannot see it.
  select count(*) into n from public.profiles p where p.id = p_user_id;
  if n > 0 then
    relation := 'profiles';
    rows_left := n;
    return next;
  end if;
end;
$fn$;

-- Both read across every user's rows, so they belong to the deletion path and
-- nothing else. Revoked from the roles a client can actually present: without
-- this, `security definer` hands any signed-in user a row-count oracle over
-- everybody else's data.
revoke execute on function public.account_deletion_uncovered_tables() from public, anon, authenticated;
revoke execute on function public.account_data_remaining(uuid) from public, anon, authenticated;
grant execute on function public.account_deletion_uncovered_tables() to service_role;
grant execute on function public.account_data_remaining(uuid) to service_role;
