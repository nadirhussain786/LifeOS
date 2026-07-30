-- ---------------------------------------------------------------------------
-- Removing a member, and deleting a group.
--
-- Two gaps and one correctness bug.
--
-- 1. A group could never be deleted. `expense_groups.deleted_at` existed and
--    every read filtered on it, but nothing ever set it — so a trip that ended
--    two years ago stayed in the list forever, and the only listed alternative
--    (the `expense_groups_delete` policy) is a HARD delete that cascades away
--    the entire ledger, including the other members' history.
--
-- 2. `expense_groups_update` is `using (is_expense_group_member(id))`, i.e. ANY
--    member may update ANY column — including `deleted_at`. So the moment a
--    soft delete becomes possible, every member can make the whole group vanish
--    for everybody else. The policy has to stay permissive (members legitimately
--    rename a group), so the narrowing is done with a trigger on the one column
--    that is not theirs to touch.
--
-- 3. Removing a member silently corrupted the balances. The removal set
--    `deleted_at`, `listMembers` filtered those rows out, and balances are
--    computed only for the members returned — so everything the removed person
--    had PAID left the ledger while everything they were OWED for stayed. A
--    £100 dinner paid by Alice and split four ways left Bob, Carol and Dave
--    owing £25 each and nobody owed anything: £75 gone, and "Settle up" showing
--    "everyone's square" over three unsettled debts. The client fix is to keep
--    computing over removed members; the server side is here — removal is a
--    tombstone, never a delete, and it is recorded in the activity feed like
--    every other change to the ledger.
-- ---------------------------------------------------------------------------

-- Two new kinds of history. `member_left` (0003) is somebody leaving of their
-- own accord; `member_removed` is the owner removing them — different events,
-- and the feed should not claim the first when the second happened.
alter table public.expense_group_activity
  drop constraint if exists expense_group_activity_action_check;

alter table public.expense_group_activity
  add constraint expense_group_activity_action_check check (action in (
    'group_created', 'group_deleted', 'group_renamed',
    'member_added', 'member_joined', 'member_left', 'member_removed',
    'expense_added', 'expense_edited', 'expense_deleted',
    'settlement_added', 'settlement_deleted'
  ));

-- ---------------------------------------------------------------------------
-- Only an owner may retire a group.
--
-- A trigger rather than a policy: RLS decides whether a row may be written at
-- all, and members must keep being able to write to this row. What needs
-- guarding is one column, so the check belongs where the column change is
-- visible — and OLD/NEW give exactly that.
--
-- Un-deleting is deliberately allowed on the same terms, so an owner who
-- retires a group by mistake can bring it back.
-- ---------------------------------------------------------------------------
create or replace function public.guard_expense_group_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is distinct from old.deleted_at
     and not public.is_expense_group_owner(new.id) then
    raise exception 'only the group owner can delete or restore this group'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists expense_groups_deletion_guard on public.expense_groups;
create trigger expense_groups_deletion_guard
  before update on public.expense_groups
  for each row execute function public.guard_expense_group_deletion();

-- ---------------------------------------------------------------------------
-- Retire a group. Soft, so the ledger survives for everyone who was in it —
-- a shared history is not the deleter's alone to destroy.
-- ---------------------------------------------------------------------------
create or replace function public.delete_expense_group(
  p_group_id text,
  p_activity_id text,
  p_now bigint
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_expense_group_owner(p_group_id) then
    raise exception 'only the group owner can delete this group'
      using errcode = '42501';
  end if;

  -- Activity first: once the group is marked deleted the row is gone from every
  -- read, and the entry explaining why would have nowhere to be written from.
  insert into public.expense_group_activity (
    id, group_id, actor_id, actor_name, action, meta, created_at
  ) values (
    p_activity_id, p_group_id, auth.uid(), public.current_actor_name(),
    'group_deleted', jsonb_build_object(
      'name', (select name from public.expense_groups where id = p_group_id)
    ), p_now
  );

  update public.expense_groups
     set deleted_at = p_now, updated_at = p_now
   where id = p_group_id
     and deleted_at is null;
end;
$$;

revoke all on function public.delete_expense_group(text, text, bigint) from public, anon;
grant execute on function public.delete_expense_group(text, text, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Remove a member (owner), or leave (yourself).
--
-- The member row is tombstoned, never deleted: their expenses, their shares and
-- their settlements all reference it, and the arithmetic only balances while
-- every party to it still resolves. What removal means is "no longer part of
-- new expenses", not "was never here".
--
-- The owner cannot be removed, including by themselves — a group with no owner
-- can never be deleted or administered again.
-- ---------------------------------------------------------------------------
create or replace function public.remove_group_member(
  p_member_id text,
  p_activity_id text,
  p_now bigint
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_group_id text;
  v_user_id uuid;
  v_role text;
  v_name text;
  v_self boolean;
begin
  select group_id, user_id, role, coalesce(display_name, email)
    into v_group_id, v_user_id, v_role, v_name
    from public.expense_group_members
   where id = p_member_id
     and deleted_at is null;

  if v_group_id is null then
    raise exception 'no such member' using errcode = 'P0002';
  end if;

  v_self := v_user_id is not distinct from auth.uid();

  if v_role = 'owner' then
    raise exception 'the group owner cannot be removed' using errcode = 'P0001';
  end if;

  if not v_self and not public.is_expense_group_owner(v_group_id) then
    raise exception 'only the group owner can remove other members'
      using errcode = '42501';
  end if;

  -- Written before the tombstone: leaving removes your own membership, and the
  -- activity insert policy needs you to still have it.
  insert into public.expense_group_activity (
    id, group_id, actor_id, actor_name, action, meta, created_at
  ) values (
    p_activity_id, v_group_id, auth.uid(), public.current_actor_name(),
    case when v_self then 'member_left' else 'member_removed' end,
    jsonb_build_object('name', v_name), p_now
  );

  update public.expense_group_members
     set deleted_at = p_now, updated_at = p_now
   where id = p_member_id;
end;
$$;

revoke all on function public.remove_group_member(text, text, bigint) from public, anon;
grant execute on function public.remove_group_member(text, text, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Removed members must stay readable.
--
-- `expense_group_members_read` already returns them (it filters by group, not by
-- deleted_at) — the filtering was the client's. Recorded here because the
-- balances depend on it: if this policy is ever narrowed to live members, the
-- £75-vanishes bug comes straight back, silently.
-- ---------------------------------------------------------------------------
