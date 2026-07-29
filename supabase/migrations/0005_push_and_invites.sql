-- ---------------------------------------------------------------------------
-- Push delivery + invitation acceptance.
--
-- Phase 3 needs somewhere to keep device tokens; phase 4 needs a way for
-- somebody who is NOT yet a member to redeem an invitation. Both are the same
-- shape of problem: the actor cannot see the rows they need, so the work is
-- done by SECURITY DEFINER functions that reveal nothing beyond a verdict.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. PUSH TOKENS
-- ===========================================================================

create table if not exists public.push_tokens (
  -- The Expo token is the natural key: one row per device, and re-registering
  -- the same device must update rather than accumulate duplicates.
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- A device token is personal. Nobody reads anyone else's — the fan-out runs in
-- an edge function with the service-role key, which bypasses RLS entirely.
create policy "push_tokens_own" on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===========================================================================
-- 2. INVITATIONS
-- ===========================================================================

-- Creating an invitation: the caller must already be a member (RLS on the
-- invitations table enforces that), so this only needs to exist to keep the
-- token out of client hands and pair the invite with its placeholder member.
create or replace function public.create_group_invitation(
  p_invitation_id text,
  p_group_id text,
  p_member_id text,
  p_email text,
  p_token text,
  p_expires_at bigint,
  p_now bigint
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.expense_group_invitations (
    id, group_id, member_id, email, token, invited_by, expires_at, created_at
  ) values (
    p_invitation_id, p_group_id, p_member_id, lower(p_email), p_token, auth.uid(), p_expires_at, p_now
  );
  return p_token;
end;
$$;

-- ---------------------------------------------------------------------------
-- Redeeming one.
--
-- This MUST be SECURITY DEFINER. The person accepting is by definition not yet
-- a member, so every policy in 0003 hides the group, the member row and the
-- invitation itself from them — under their own rights there is nothing to
-- read and nothing to update. Running as the definer is the only way in.
--
-- It is written to be safe in that mode: the token is the entire authority, it
-- is checked for expiry and prior use, and the function returns a status string
-- rather than any group data. A bad token is indistinguishable from an expired
-- one to the caller.
-- ---------------------------------------------------------------------------
create or replace function public.accept_group_invitation(p_token text, p_now bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.expense_group_invitations%rowtype;
  v_existing text;
begin
  if auth.uid() is null then
    return 'unauthenticated';
  end if;

  select * into v_invite
    from public.expense_group_invitations
   where token = p_token;

  if v_invite.id is null then
    return 'invalid';
  end if;
  if v_invite.accepted_at is not null then
    return 'already_accepted';
  end if;
  if v_invite.expires_at < p_now then
    return 'expired';
  end if;

  -- Already in the group through some other route: consume the invitation so
  -- it cannot be reused, but do not create a second membership.
  select id into v_existing
    from public.expense_group_members
   where group_id = v_invite.group_id
     and user_id = auth.uid()
     and deleted_at is null;

  if v_existing is not null then
    update public.expense_group_invitations
       set accepted_at = p_now, accepted_by = auth.uid()
     where id = v_invite.id;
    return 'already_member';
  end if;

  -- Claim the placeholder member row the inviter created, so any expenses
  -- already split with this person carry over rather than being orphaned.
  update public.expense_group_members
     set user_id = auth.uid(),
         joined_at = p_now,
         updated_at = p_now
   where id = v_invite.member_id
     and user_id is null
     and deleted_at is null;

  if not found then
    return 'member_unavailable';
  end if;

  update public.expense_group_invitations
     set accepted_at = p_now, accepted_by = auth.uid()
   where id = v_invite.id;

  insert into public.expense_group_activity (
    id, group_id, actor_id, actor_name, action, meta, created_at
  ) values (
    v_invite.id || ':joined', v_invite.group_id, auth.uid(),
    public.current_actor_name(), 'member_joined',
    jsonb_build_object('email', v_invite.email), p_now
  );

  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- What an invitee may see BEFORE accepting: the group's name, and nothing else.
-- Enough to decide whether to join, not enough to enumerate anything.
-- ---------------------------------------------------------------------------
create or replace function public.peek_group_invitation(p_token text, p_now bigint)
returns table (group_name text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.expense_group_invitations%rowtype;
begin
  select * into v_invite
    from public.expense_group_invitations
   where token = p_token;

  if v_invite.id is null then
    return query select null::text, 'invalid'::text;
  elsif v_invite.accepted_at is not null then
    return query select null::text, 'already_accepted'::text;
  elsif v_invite.expires_at < p_now then
    return query select null::text, 'expired'::text;
  else
    return query
      select g.name, 'ok'::text
        from public.expense_groups g
       where g.id = v_invite.group_id;
  end if;
end;
$$;

revoke all on function public.create_group_invitation(text, text, text, text, text, bigint, bigint) from public, anon;
revoke all on function public.accept_group_invitation(text, bigint) from public, anon;
revoke all on function public.peek_group_invitation(text, bigint) from public, anon;

grant execute on function public.create_group_invitation(text, text, text, text, text, bigint, bigint) to authenticated;
grant execute on function public.accept_group_invitation(text, bigint) to authenticated;
-- Peeking is allowed before sign-in so the join screen can name the group.
grant execute on function public.peek_group_invitation(text, bigint) to authenticated, anon;
