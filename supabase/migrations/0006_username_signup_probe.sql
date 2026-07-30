-- ---------------------------------------------------------------------------
-- Make the username availability probe usable from the sign-up screen.
--
-- 0002 granted is_username_available() to `authenticated` only, and explicitly
-- revoked it from `anon`. But the one screen that calls it — sign-up — runs
-- before the account exists, so the caller is `anon` every single time. Postgres
-- refuses with "permission denied for function is_username_available", the
-- client treats any error as a negative verdict, and the form reports EVERY
-- name, however unused, as already taken. Sign-up then can't be completed at
-- all, because it gates its submit button on a positive verdict.
--
-- Two things have to change together, and the second is the subtler one.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Null-safe self-exclusion.
--
-- The original predicate ends `and id <> auth.uid()`, whose purpose is "your own
-- name is not a clash with yourself". For `anon`, auth.uid() is NULL, so
-- `id <> NULL` evaluates to NULL for every row — never true — and the NOT EXISTS
-- subquery matches nothing. The function would then report every name as free,
-- including taken ones, and the taken name would only be caught later by
-- claim_username's unique violation. Simply adding the GRANT without this would
-- swap one wrong answer for the opposite wrong answer.
--
-- `auth.uid() is distinct from id` is the null-safe form: with no session it is
-- true for every row (nothing is excluded, so all taken names are seen), and
-- with a session it excludes exactly the caller's own row.
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
        and auth.uid() is distinct from id   -- keeping your own name is not a clash
    );
$$;

-- ---------------------------------------------------------------------------
-- 2. Let the sign-up screen call it.
--
-- This does let an anonymous caller test whether a name is in use, one name at a
-- time. That is the same exposure every sign-up form with a live availability
-- check has (the alternative — telling people a name is free and failing after
-- they have filled in the whole form — is worse), and the function is built for
-- it: SECURITY DEFINER returning a bare boolean, so it reveals no row, no id and
-- no email, and `profiles` itself stays sealed behind `profiles_own`.
-- ---------------------------------------------------------------------------
grant execute on function public.is_username_available(text) to anon, authenticated;

-- claim_username deliberately stays authenticated-only: it writes, and it
-- already returns 'unauthenticated' rather than throwing if reached without a
-- session. Sign-up calls it only after the account exists.
