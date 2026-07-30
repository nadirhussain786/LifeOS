-- ---------------------------------------------------------------------------
-- Creating a Split group fails for any user without a `profiles` row.
--
-- 0004's create_expense_group adds the owner with
--
--   insert into expense_group_members (...)
--   select p_member_id, ..., p.email, coalesce(...)
--     from public.profiles p
--    where p.id = auth.uid();
--
-- INSERT ... SELECT inserts however many rows the SELECT returns — including
-- none. A caller with no profile row therefore creates the group, adds NOBODY
-- to it, and only fails one statement later when the activity insert is refused
-- by expense_group_activity_insert (which requires membership). The whole
-- transaction rolls back, so the user sees an opaque 42501 and the group never
-- appears. The client reported this as "check your connection", which is the
-- one thing it definitely was not.
--
-- A profile row can be missing for several ordinary reasons: the account was
-- created before 0001 installed the trigger, 0001 was applied to a project that
-- already had users, or the row was removed by hand. The dependency was never
-- intentional, so the fix is to remove it rather than to backfill and hope.
--
-- Three changes, in order of how much they matter:
--   1. ensure_profile() — self-heals the row from auth.users, so every later
--      statement (and current_actor_name) has something to read.
--   2. create_expense_group inserts the owner with VALUES, not INSERT..SELECT,
--      so "no profile" can no longer mean "no member".
--   3. It then asserts the owner row actually landed and raises a named error
--      if not, so a future regression here can never again masquerade as a
--      network problem.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Self-healing profile.
--
-- SECURITY DEFINER because auth.users is not readable by `authenticated`, and
-- deliberately scoped to auth.uid() only — it can create or repair the caller's
-- own profile and no one else's, and it returns nothing.
--
-- `on conflict do nothing` keeps it idempotent and, importantly, non-destructive:
-- an existing profile (with its username and chosen display name) is never
-- overwritten by the auth-metadata fallbacks below.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  insert into public.profiles (id, email, display_name, created_at, updated_at)
  select
    u.id,
    u.email,
    coalesce(
      u.raw_user_meta_data ->> 'display_name',
      u.raw_user_meta_data ->> 'full_name',
      split_part(u.email, '@', 1)
    ),
    (extract(epoch from now()) * 1000)::bigint,
    (extract(epoch from now()) * 1000)::bigint
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.ensure_profile() from public, anon;
grant execute on function public.ensure_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- 2 & 3. Group creation that cannot half-succeed.
--
-- Still SECURITY INVOKER: RLS is what proves the caller may do this, and that
-- has not changed. expense_groups_insert still requires created_by = auth.uid(),
-- and the member row still goes in under is_expense_group_creator.
--
-- The owner's name is resolved from the profile, but every part of it has a
-- fallback, so the insert no longer has a row it depends on existing:
--   p_display_name (what the client already had) → profiles.display_name →
--   profiles.username → the local part of the email → 'Someone'.
-- ---------------------------------------------------------------------------
create or replace function public.create_expense_group(
  p_group_id text,
  p_name text,
  p_kind text,
  p_currency text,
  p_member_id text,
  p_display_name text,
  p_activity_id text,
  p_now bigint
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_members int;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  -- Repair the caller's profile first, so the lookups below and the activity
  -- feed's current_actor_name() all have a row to read.
  perform public.ensure_profile();

  select p.email, coalesce(p_display_name, p.display_name, p.username)
    into v_email, v_name
    from public.profiles p
   where p.id = v_uid;

  -- Fallbacks for the case where the profile still could not be created (an
  -- auth.users row that has since been deleted, say). The group is worth more
  -- than a perfect display name.
  v_name := coalesce(v_name, p_display_name, split_part(coalesce(v_email, ''), '@', 1));
  if v_name = '' then
    v_name := null;
  end if;

  insert into public.expense_groups (id, name, kind, currency, created_by, created_at, updated_at)
  values (p_group_id, p_name, p_kind, p_currency, v_uid, p_now, p_now);

  -- VALUES, not INSERT..SELECT: this row must exist or the group is unusable,
  -- so it must not be conditional on another table having something to say.
  insert into public.expense_group_members (
    id, group_id, user_id, email, display_name, role, joined_at, created_at, updated_at
  ) values (
    p_member_id, p_group_id, v_uid, v_email, v_name, 'owner', p_now, p_now, p_now
  );

  -- Belt and braces. If membership is ever silently skipped again, fail here
  -- with something a human can act on rather than one statement later with an
  -- RLS violation that reads like a connectivity fault.
  select count(*) into v_members
    from public.expense_group_members
   where group_id = p_group_id and user_id = v_uid and deleted_at is null;

  if v_members = 0 then
    raise exception 'group owner could not be added to %', p_group_id
      using errcode = 'P0001';
  end if;

  insert into public.expense_group_activity (
    id, group_id, actor_id, actor_name, action, meta, created_at
  ) values (
    p_activity_id, p_group_id, v_uid, coalesce(public.current_actor_name(), v_name),
    'group_created', jsonb_build_object('name', p_name), p_now
  );

  return p_group_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Backfill: any account that predates the profiles trigger gets its row now, so
-- existing users are not left waiting for their next group-creation attempt to
-- repair them. Runs as the migration owner, hence no auth.uid() involved.
-- ---------------------------------------------------------------------------
insert into public.profiles (id, email, display_name, created_at, updated_at)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'display_name',
    u.raw_user_meta_data ->> 'full_name',
    split_part(u.email, '@', 1)
  ),
  (extract(epoch from now()) * 1000)::bigint,
  (extract(epoch from now()) * 1000)::bigint
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Groups stranded by the old function — created, but with no members, so they
-- are invisible to their own creator (read needs membership) and undeletable
-- (delete needs ownership). Nobody can ever see or remove these, so nothing is
-- lost by clearing them; leaving them would keep a permanently orphaned row per
-- failed attempt.
-- ---------------------------------------------------------------------------
delete from public.expense_groups g
 where not exists (
   select 1 from public.expense_group_members m
    where m.group_id = g.id
 );
