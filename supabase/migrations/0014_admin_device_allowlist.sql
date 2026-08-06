-- ---------------------------------------------------------------------------
-- 0014 — Admin access is restricted to registered origins.
--
-- Holding an admin row is no longer sufficient. Every `is_admin()` check now
-- also requires the request to arrive from a registered IP range or a
-- registered device id, so a stolen admin session, a leaked password or a
-- phished JWT is not on its own enough to read anything.
--
-- This matters more here than it would in most apps, because 0015 gives the
-- operator the ability to read user content. A capability that broad needs a
-- second factor that is not a secret the admin can be tricked into handing
-- over, and "the request came from the office network / this laptop" is that.
--
-- Bootstrap, and how not to lock yourself out
-- ------------------------------------------
-- An EMPTY allowlist means unrestricted. Otherwise the first migration would
-- lock the owner out of the console needed to add their own IP — a deadlock
-- with no way back except a service-role SQL session. Once the first row
-- exists the restriction is live and total.
--
-- The corollary is worth stating plainly: until you insert a row, this file
-- protects nothing. It is a switch you have to throw.
--
-- Why both IP and device id
-- -------------------------
-- IP alone is unusable from a phone: carrier NAT reassigns constantly and a
-- home connection changes on every router reboot. Device id alone is a bearer
-- token in a header. Either satisfies the check; requiring both would make
-- admin work from a laptop on hotel wifi impossible, which is when it is most
-- often needed.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. TABLE
-- ===========================================================================

create table if not exists public.admin_allowed_origins (
  id text primary key,
  -- Null means "any admin from this origin"; set it to scope an origin to one
  -- person, which is what you want for a personal laptop.
  admin_id uuid references auth.users(id) on delete cascade,
  -- A CIDR range. `inet` accepts a bare address too, which then matches only
  -- that address.
  ip_range cidr,
  -- Registered device, sent as the `x-admin-device` header. Long random string.
  device_id text,
  label text not null,
  created_at timestamptz not null default now(),
  -- A row that constrains nothing would silently widen access to everything.
  constraint admin_allowed_origins_has_a_constraint
    check (ip_range is not null or device_id is not null)
);

create index if not exists admin_allowed_origins_device_idx
  on public.admin_allowed_origins (device_id) where device_id is not null;

alter table public.admin_allowed_origins enable row level security;
-- No policy: invisible and unwritable through the API, exactly like `admins`.
-- Managed from the SQL editor with the service role:
--   insert into public.admin_allowed_origins (id, ip_range, label)
--   values ('office', '203.0.113.0/24'::cidr, 'Office network');

-- ===========================================================================
-- 2. ORIGIN RESOLUTION
-- ===========================================================================

-- The caller's IP as PostgREST sees it.
--
-- `x-forwarded-for` is a comma-separated chain and only the FIRST entry is the
-- real client; the rest are proxies. Reading the last entry (or the whole
-- string) is the classic bug that makes this trivially spoofable — though note
-- that even the first entry is only as trustworthy as Supabase's edge, which
-- overwrites it. Treat this as a control against stolen credentials, not
-- against an attacker who can forge headers at the edge.
create or replace function public.request_ip()
returns inet
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_header text;
  v_first text;
begin
  begin
    v_header := current_setting('request.headers', true)::json ->> 'x-forwarded-for';
  exception when others then
    -- No PostgREST context (a direct psql session, or the test harness).
    return null;
  end;

  if v_header is null or length(trim(v_header)) = 0 then
    return null;
  end if;

  v_first := trim(split_part(v_header, ',', 1));

  begin
    return v_first::inet;
  exception when others then
    return null;
  end;
end;
$$;

create or replace function public.request_device_id()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return current_setting('request.headers', true)::json ->> 'x-admin-device';
exception when others then
  return null;
end;
$$;

-- ===========================================================================
-- 3. THE CHECK
-- ===========================================================================

create or replace function public.admin_origin_allowed(p_admin_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_configured integer;
  v_ip inet := public.request_ip();
  v_device text := public.request_device_id();
begin
  select count(*) into v_configured from public.admin_allowed_origins;
  -- Nothing registered yet: unrestricted, so the first origin can be added.
  if v_configured = 0 then
    return true;
  end if;

  return exists (
    select 1 from public.admin_allowed_origins o
     where (o.admin_id is null or o.admin_id = p_admin_id)
       and (
         (o.device_id is not null and v_device is not null and o.device_id = v_device)
         or (o.ip_range is not null and v_ip is not null and v_ip <<= o.ip_range)
       )
  );
end;
$$;

-- Replaces 0010's definition. Every admin function and policy already routes
-- through this, so the origin check applies everywhere at once rather than
-- needing to be remembered at each call site.
create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return false;
  end if;
  if not exists (select 1 from public.admins a where a.user_id = v_uid) then
    return false;
  end if;
  return public.admin_origin_allowed(v_uid);
end;
$$;

-- Lets an admin find out *why* they are being refused, which is otherwise a
-- miserable thing to debug from a phone on a train. Deliberately answers only
-- for somebody who is genuinely on the admin roster.
create or replace function public.admin_origin_debug()
returns table (on_roster boolean, origin_allowed boolean, seen_ip inet, seen_device text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_on_roster boolean;
begin
  v_on_roster := v_uid is not null
    and exists (select 1 from public.admins a where a.user_id = v_uid);

  if not v_on_roster then
    raise exception 'not an administrator' using errcode = 'insufficient_privilege';
  end if;

  return query
    select v_on_roster,
           public.admin_origin_allowed(v_uid),
           public.request_ip(),
           public.request_device_id();
end;
$$;

-- ===========================================================================
-- 4. GRANTS
-- ===========================================================================

revoke all on function public.request_ip() from public, anon;
revoke all on function public.request_device_id() from public, anon;
revoke all on function public.admin_origin_allowed(uuid) from public, anon, authenticated;
revoke all on function public.admin_origin_debug() from public, anon;
grant execute on function public.admin_origin_debug() to authenticated;
