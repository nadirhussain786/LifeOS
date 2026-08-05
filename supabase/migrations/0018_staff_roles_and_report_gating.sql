-- ---------------------------------------------------------------------------
-- 0018 — Two tiers of operator, and a reason requirement for the lower one.
--
-- Until now `admins` was one flat roster and `is_admin()` was one flat answer:
-- everybody on it could read anybody's account, at any time, for any reason.
-- That is a workable arrangement for a single owner and a bad one the moment a
-- second person is added, because the question "why were you looking at that
-- account" has no answer the database can give.
--
-- So the roster gains a role:
--
--   'admin'  — unrestricted, and the tier the owner holds. Can read any
--              account, any row, including soft-deleted ones, without a report
--              and without anybody's password or PIN. Every call is audited.
--   'staff'  — day-to-day moderation. Can only reach an account that somebody
--              has actually reported, and only while that report is live. Every
--              call is audited, and additionally records WHICH report justified
--              it, so a review later reads "opened X because of report Y"
--              rather than "opened X".
--
-- Why gate the lower tier at all, given the operator can already read
-- everything through 0015's escrow: because the escrow is the capability and
-- this is the control on it. Blanket access is needed roughly never — a
-- moderator's actual job arrives as a report naming a specific account — and an
-- access path that requires a reason is the difference between a moderation
-- team and a team that can look up an ex-partner.
--
-- Existing rows default to 'admin'. There is exactly one of them (the owner),
-- and silently demoting it during a deploy would lock them out of their own
-- operator console.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. THE ROLE
-- ===========================================================================

do $do$ begin
  if not exists (select 1 from pg_type where typname = 'operator_role') then
    create type public.operator_role as enum ('staff', 'admin');
  end if;
end $do$;

alter table public.admins
  add column if not exists role public.operator_role not null default 'admin';

-- ===========================================================================
-- 2. PREDICATES
-- ===========================================================================

-- Anyone on the roster, at either tier, from a registered origin. 0014's origin
-- allowlist still applies to both — a staff account on an unregistered network
-- is not staff.
create or replace function public.is_staff()
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

-- The full tier. Replaces 0014's definition, which answered "on the roster at
-- all" — every existing caller (0011–0015) keeps its meaning of "unrestricted
-- operator", because those functions are the unrestricted ones.
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
  if not exists (
    select 1 from public.admins a where a.user_id = v_uid and a.role = 'admin'
  ) then
    return false;
  end if;
  return public.admin_origin_allowed(v_uid);
end;
$$;

/**
 * The report that entitles staff to look at `p_user_id`, or NULL if none does.
 *
 * "Live" is deliberately not "open". A report that has been actioned still
 * justifies access for a window afterwards, because the work does not stop at
 * the moment of the verdict — appeals arrive, related accounts turn up, and a
 * moderator who has just restricted somebody needs to be able to check their
 * own decision. Thirty days is long enough for that and short enough that an
 * old report is not a permanent key to an account.
 *
 * A dismissed report grants nothing from the moment it is dismissed: staff
 * looked, found nothing, and the reason to keep looking is gone.
 */
create or replace function public.staff_access_report(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.id
    from public.content_reports r
   where r.reported_user_id = p_user_id
     and (
       r.status = 'open'
       or (r.status = 'actioned' and r.resolved_at > now() - interval '30 days')
     )
   order by r.created_at desc
   limit 1;
$$;

/**
 * May the caller reach this account at all, and on what grounds.
 *
 * Returns the justification so the audit row can record it: 'admin' for the
 * unrestricted tier, or the report id for staff. NULL means no.
 */
create or replace function public.operator_grounds(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return 'admin';
  end if;
  if public.is_staff() then
    return public.staff_access_report(p_user_id);
  end if;
  return null;
end;
$$;

-- ===========================================================================
-- 3. THE GATED SURFACE
-- ===========================================================================

/**
 * Raises unless the caller may reach this account, and writes the audit row
 * before returning. Every operator function below calls this first.
 *
 * The audit write happens BEFORE the data is produced, not after, so a query
 * that errors halfway still leaves a record that somebody looked. A log written
 * on success only is a log that misses exactly the attempts worth reviewing.
 */
create or replace function public.assert_operator_access(
  p_user_id uuid,
  p_action text,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grounds text := public.operator_grounds(p_user_id);
begin
  if v_grounds is null then
    if public.is_staff() then
      -- Said precisely: staff are on the roster, this account simply is not
      -- theirs to look at. The vaguer "not an administrator" sends people to
      -- the wrong problem.
      raise exception 'no live report against this account'
        using errcode = 'insufficient_privilege';
    end if;
    raise exception 'not an operator' using errcode = 'insufficient_privilege';
  end if;

  if p_reason is null or length(trim(p_reason)) < 8 then
    raise exception 'a reason is required' using errcode = 'invalid_parameter_value';
  end if;

  insert into public.admin_audit_log (actor, action, target_user, detail)
  values (
    auth.uid(),
    p_action,
    p_user_id,
    jsonb_build_object(
      'reason', trim(p_reason),
      'grounds', v_grounds,
      'ip', public.request_ip()::text
    )
  );

  return v_grounds;
end;
$$;

/**
 * One account's profile, for the moderation console.
 *
 * Available to staff only while a report justifies it, and to admins always.
 * Deliberately includes the soft-deleted case: an account that deleted its
 * profile row is exactly the one a report is most likely to be about.
 */
create or replace function public.operator_user_profile(
  p_user_id uuid,
  p_reason text
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  username text,
  avatar_path text,
  created_at bigint,
  status public.moderation_status,
  status_reason text,
  status_expires_at timestamptz,
  open_reports bigint,
  grounds text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grounds text := public.assert_operator_access(p_user_id, 'read_user_profile', p_reason);
begin
  return query
    select p.id,
           p.email,
           p.display_name,
           p.username,
           p.avatar_path,
           p.created_at,
           coalesce(s.status, 'active'::public.moderation_status),
           s.reason,
           s.expires_at,
           (select count(*) from public.content_reports r
             where r.reported_user_id = p_user_id and r.status = 'open'),
           v_grounds
      from public.profiles p
      left join public.account_status s on s.user_id = p.id
     where p.id = p_user_id;
end;
$$;

/**
 * The reports filed against one account, so a moderator sees the pattern rather
 * than the single complaint that happened to reach them.
 *
 * `reporter_id` is NOT returned. Telling the reported party's moderator who
 * complained is one leak away from telling the reported party, and retaliation
 * against reporters is the failure mode that stops people reporting at all.
 * Admins who genuinely need it can read the table directly with the service
 * role, which is a deliberate speed bump.
 */
create or replace function public.operator_user_reports(
  p_user_id uuid,
  p_reason text
)
returns table (
  id text,
  surface text,
  surface_id text,
  reason text,
  note text,
  evidence jsonb,
  status text,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_operator_access(p_user_id, 'read_user_reports', p_reason);

  return query
    select r.id, r.surface, r.surface_id, r.reason, r.note, r.evidence,
           r.status, r.resolution, r.resolved_at, r.created_at
      from public.content_reports r
     where r.reported_user_id = p_user_id
     order by r.created_at desc
     limit 200;
end;
$$;

/**
 * The queue: accounts with at least one open report.
 *
 * Not gated per-account, because this IS the gate — it is how staff find out
 * which accounts they are allowed to open. It reveals that an account has been
 * reported and how often, and nothing about the account's content.
 */
create or replace function public.operator_report_queue(p_limit integer)
returns table (
  reported_user_id uuid,
  display_name text,
  username text,
  open_reports bigint,
  latest_reason text,
  latest_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'not an operator' using errcode = 'insufficient_privilege';
  end if;

  return query
    select r.reported_user_id,
           p.display_name,
           p.username,
           count(*) filter (where r.status = 'open'),
           (array_agg(r.reason order by r.created_at desc))[1],
           max(r.created_at)
      from public.content_reports r
      left join public.profiles p on p.id = r.reported_user_id
     where r.reported_user_id is not null
     group by r.reported_user_id, p.display_name, p.username
    having count(*) filter (where r.status = 'open') > 0
     order by max(r.created_at) desc
     limit least(coalesce(p_limit, 100), 500);
end;
$$;

-- ===========================================================================
-- 4. THE EXISTING ADMIN SURFACE STAYS ADMIN-ONLY
-- ===========================================================================
--
-- 0012's `admin_list_users` / `admin_user_detail` and 0015's escrow functions
-- all call `is_admin()`, which now means the full tier. Nothing about them
-- changes except who passes the check — staff added to the roster get the
-- report-gated functions above and not those. That is the intended split:
-- browsing the entire user directory is not a moderation action, it is an
-- ownership one.

-- ===========================================================================
-- 5. GRANTS
-- ===========================================================================

revoke all on function public.is_staff() from public, anon;
revoke all on function public.staff_access_report(uuid) from public, anon;
revoke all on function public.operator_grounds(uuid) from public, anon;
revoke all on function public.assert_operator_access(uuid, text, text) from public, anon;
revoke all on function public.operator_user_profile(uuid, text) from public, anon;
revoke all on function public.operator_user_reports(uuid, text) from public, anon;
revoke all on function public.operator_report_queue(integer) from public, anon;

grant execute on function public.is_staff() to authenticated;
grant execute on function public.operator_user_profile(uuid, text) to authenticated;
grant execute on function public.operator_user_reports(uuid, text) to authenticated;
grant execute on function public.operator_report_queue(integer) to authenticated;

-- Not granted to `authenticated`: these are internals of the functions above,
-- which run as SECURITY DEFINER and so call them as the owner. Exposing
-- `staff_access_report` directly would let any signed-in user probe whether a
-- given account has an open report against it.
