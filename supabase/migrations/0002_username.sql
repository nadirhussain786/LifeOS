-- ---------------------------------------------------------------------------
-- Unique account usernames
--
-- `profiles` is protected by `profiles_own` (id = auth.uid()), so a client
-- cannot see anybody else's row. That makes the obvious availability check —
-- `select 1 from profiles where username = $1` — actively dangerous: RLS
-- filters the conflicting row out, the query returns empty, the UI says
-- "available", and the insert then fails on the unique index. Both entry
-- points below are therefore SECURITY DEFINER and return only a verdict,
-- never another user's data.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists username text;

-- Case-insensitive uniqueness: "Nadir" and "nadir" are the same account name.
-- Partial, so the many rows without a username yet don't collide on null.
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

-- Shape is enforced in the database as well as the client, because the client
-- is not the only thing that can write here.
alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-zA-Z][a-zA-Z0-9_]{2,19}$');

-- ---------------------------------------------------------------------------
-- Availability probe. Returns a bare boolean — no row, no id, no email — so a
-- signed-in user can test a name without being able to enumerate accounts.
-- ---------------------------------------------------------------------------
create or replace function public.is_username_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    candidate ~ '^[a-zA-Z][a-zA-Z0-9_]{2,19}$'
    and not exists (
      select 1 from public.profiles
      where lower(username) = lower(candidate)
        and id <> auth.uid()          -- keeping your own name is not a clash
    );
$$;

revoke all on function public.is_username_available(text) from public, anon;
grant execute on function public.is_username_available(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Claim. The unique index is the real arbiter: two clients can both pass the
-- probe and race, so the insert is attempted and the unique violation is
-- translated into a normal 'taken' result instead of a 500.
-- ---------------------------------------------------------------------------
create or replace function public.claim_username(candidate text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return 'unauthenticated';
  end if;

  if candidate is null or candidate !~ '^[a-zA-Z][a-zA-Z0-9_]{2,19}$' then
    return 'invalid';
  end if;

  update public.profiles
     set username = candidate,
         updated_at = (extract(epoch from now()) * 1000)::bigint
   where id = auth.uid();

  return 'ok';
exception
  when unique_violation then
    return 'taken';
end;
$$;

revoke all on function public.claim_username(text) from public, anon;
grant execute on function public.claim_username(text) to authenticated;

-- NOTE: `handle_new_user` deliberately still does NOT set a username. A unique
-- violation inside that trigger would abort the auth.users insert and fail the
-- whole sign-up with an opaque 500. The client creates the account first, then
-- calls claim_username, so a race surfaces as a normal "that name just went"
-- message with the account already safely created.
