-- ---------------------------------------------------------------------------
-- Transactional write primitives for expense groups.
--
-- An expense and its shares are one fact, but a client can only issue them as
-- two separate requests. If the second fails you are left with an expense that
-- nobody owes anything for — the shares trigger tolerates that state (it treats
-- "no shares" as not-yet-split rather than corrupt), which is the right call for
-- an intermediate state but the wrong one to arrive at by accident.
--
-- Each function below is one statement from PostgREST's point of view, so it
-- runs in a single transaction: the expense, its shares and the activity entry
-- all land together or not at all. The DEFERRABLE trigger from 0003 fires at
-- that transaction's COMMIT, so a split that does not add up rolls the whole
-- thing back.
--
-- These are deliberately SECURITY INVOKER: RLS still applies, so membership is
-- enforced by the policies in 0003 rather than re-checked here. A non-member's
-- call simply writes nothing and raises.
-- ---------------------------------------------------------------------------

/** Display name for the activity feed, captured at write time so history
 *  survives the actor later changing their name or deleting their account. */
create or replace function public.current_actor_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(display_name, username, email)
    from public.profiles
   where id = auth.uid();
$$;

revoke all on function public.current_actor_name() from public, anon;
grant execute on function public.current_actor_name() to authenticated;

-- ---------------------------------------------------------------------------
-- Add an expense together with its split.
--
-- `p_shares` is [{"member_id": "...", "share_cents": 123}, ...] and must sum to
-- p_amount_cents; the deferred trigger is what enforces that at commit.
-- ---------------------------------------------------------------------------
create or replace function public.create_group_expense(
  p_expense_id text,
  p_group_id text,
  p_paid_by_member_id text,
  p_description text,
  p_amount_cents bigint,
  p_currency text,
  p_spent_at bigint,
  p_note text,
  p_shares jsonb,
  p_activity_id text,
  p_now bigint
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.expense_group_expenses (
    id, group_id, paid_by_member_id, description, amount_cents,
    currency, spent_at, note, created_by, created_at, updated_at
  ) values (
    p_expense_id, p_group_id, p_paid_by_member_id, p_description, p_amount_cents,
    p_currency, p_spent_at, p_note, auth.uid(), p_now, p_now
  );

  insert into public.expense_group_shares (id, expense_id, member_id, share_cents, created_at, updated_at)
  select
    p_expense_id || ':' || (s ->> 'member_id'),
    p_expense_id,
    s ->> 'member_id',
    (s ->> 'share_cents')::bigint,
    p_now,
    p_now
  from jsonb_array_elements(p_shares) as s;

  insert into public.expense_group_activity (
    id, group_id, actor_id, actor_name, action, expense_id, meta, created_at
  ) values (
    p_activity_id, p_group_id, auth.uid(), public.current_actor_name(), 'expense_added',
    p_expense_id,
    jsonb_build_object('description', p_description, 'amount_cents', p_amount_cents),
    p_now
  );

  return p_expense_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Edit an expense and restate its split.
--
-- The shares are replaced wholesale rather than diffed: a split is only ever
-- meaningful as a complete set, and deleting then re-inserting inside one
-- transaction lets the deferred trigger judge the final state. Editing the
-- amount without restating shares is exactly the case the second trigger in
-- 0003 exists to catch.
-- ---------------------------------------------------------------------------
create or replace function public.update_group_expense(
  p_expense_id text,
  p_description text,
  p_amount_cents bigint,
  p_paid_by_member_id text,
  p_spent_at bigint,
  p_note text,
  p_shares jsonb,
  p_activity_id text,
  p_now bigint
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_group_id text;
begin
  update public.expense_group_expenses
     set description        = p_description,
         amount_cents       = p_amount_cents,
         paid_by_member_id  = p_paid_by_member_id,
         spent_at           = p_spent_at,
         note               = p_note,
         updated_at         = p_now
   where id = p_expense_id
     and deleted_at is null
  returning group_id into v_group_id;

  if v_group_id is null then
    raise exception 'expense % not found or not visible', p_expense_id
      using errcode = 'no_data_found';
  end if;

  delete from public.expense_group_shares where expense_id = p_expense_id;

  insert into public.expense_group_shares (id, expense_id, member_id, share_cents, created_at, updated_at)
  select
    p_expense_id || ':' || (s ->> 'member_id'),
    p_expense_id,
    s ->> 'member_id',
    (s ->> 'share_cents')::bigint,
    p_now,
    p_now
  from jsonb_array_elements(p_shares) as s;

  insert into public.expense_group_activity (
    id, group_id, actor_id, actor_name, action, expense_id, meta, created_at
  ) values (
    p_activity_id, v_group_id, auth.uid(), public.current_actor_name(), 'expense_edited',
    p_expense_id,
    jsonb_build_object('description', p_description, 'amount_cents', p_amount_cents),
    p_now
  );

  return p_expense_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Soft-delete an expense, keeping the activity trail.
--
-- The shares stay on the row but computeBalances ignores shares whose expense
-- is gone, so a deleted expense stops affecting anybody's balance immediately
-- while remaining restorable.
-- ---------------------------------------------------------------------------
create or replace function public.delete_group_expense(
  p_expense_id text,
  p_activity_id text,
  p_now bigint
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_group_id text;
  v_description text;
  v_amount bigint;
begin
  update public.expense_group_expenses
     set deleted_at = p_now,
         updated_at = p_now
   where id = p_expense_id
     and deleted_at is null
  returning group_id, description, amount_cents
       into v_group_id, v_description, v_amount;

  if v_group_id is null then
    raise exception 'expense % not found or not visible', p_expense_id
      using errcode = 'no_data_found';
  end if;

  insert into public.expense_group_activity (
    id, group_id, actor_id, actor_name, action, expense_id, meta, created_at
  ) values (
    p_activity_id, v_group_id, auth.uid(), public.current_actor_name(), 'expense_deleted',
    p_expense_id,
    jsonb_build_object('description', v_description, 'amount_cents', v_amount),
    p_now
  );

  return p_expense_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Record a repayment between two members.
-- ---------------------------------------------------------------------------
create or replace function public.record_settlement(
  p_settlement_id text,
  p_group_id text,
  p_from_member_id text,
  p_to_member_id text,
  p_amount_cents bigint,
  p_currency text,
  p_settled_at bigint,
  p_note text,
  p_activity_id text,
  p_now bigint
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.expense_group_settlements (
    id, group_id, from_member_id, to_member_id, amount_cents,
    currency, settled_at, note, created_by, created_at, updated_at
  ) values (
    p_settlement_id, p_group_id, p_from_member_id, p_to_member_id, p_amount_cents,
    p_currency, p_settled_at, p_note, auth.uid(), p_now, p_now
  );

  insert into public.expense_group_activity (
    id, group_id, actor_id, actor_name, action, settlement_id, meta, created_at
  ) values (
    p_activity_id, p_group_id, auth.uid(), public.current_actor_name(), 'settlement_added',
    p_settlement_id,
    jsonb_build_object(
      'amount_cents', p_amount_cents,
      'from_member_id', p_from_member_id,
      'to_member_id', p_to_member_id
    ),
    p_now
  );

  return p_settlement_id;
end;
$$;

revoke all on function public.create_group_expense(text, text, text, text, bigint, text, bigint, text, jsonb, text, bigint) from public, anon;
revoke all on function public.update_group_expense(text, text, bigint, text, bigint, text, jsonb, text, bigint) from public, anon;
revoke all on function public.delete_group_expense(text, text, bigint) from public, anon;
revoke all on function public.record_settlement(text, text, text, text, bigint, text, bigint, text, text, bigint) from public, anon;

grant execute on function public.create_group_expense(text, text, text, text, bigint, text, bigint, text, jsonb, text, bigint) to authenticated;
grant execute on function public.update_group_expense(text, text, bigint, text, bigint, text, jsonb, text, bigint) to authenticated;
grant execute on function public.delete_group_expense(text, text, bigint) to authenticated;
grant execute on function public.record_settlement(text, text, text, text, bigint, text, bigint, text, text, bigint) to authenticated;
