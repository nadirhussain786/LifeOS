-- ---------------------------------------------------------------------------
-- 0019 — What a block actually does.
--
-- Before this, "blocked" meant the app showed an overlay and the sync engine
-- declined to run (0010), and after 0017 it also meant the server refused
-- writes. The account could still read everything it had in the cloud, and
-- every byte of it stayed on the device — so a blocked account could sign out,
-- drop to guest mode, and carry on using the app with all its content intact.
-- For an account blocked over spam or blackmail material, that is not a block.
--
-- A block now means:
--
--   * **No reads and no writes against the server.** Enforced in RLS, which is
--     the only place enforcement is real — an app-side check is advice that a
--     modified client ignores.
--   * **The local database is wiped.** The device is told to, by a command it
--     picks up on next launch, and the app refuses to open until it has.
--   * **Their data survives in production**, soft-deleted, so an unblock
--     restores it rather than resurrecting nothing.
--
-- ## The evacuation window, and why it is not a loophole
--
-- The three requirements above are in tension: wipe the device, but do not lose
-- the data, and the data can only be preserved by uploading it — which a
-- blocked account is forbidden to do. Something has to give, and the honest
-- place is a short window.
--
-- `admin_block_user` sets `evacuation_until` (15 minutes by default). Until it
-- passes the account may still reach its OWN rows, so the device gets one final
-- push before it wipes. It is not a loophole because the thing a blocked
-- account is blocked from is *other people* — groups, invitations, shared
-- surfaces — and that is governed by `can_share()` (0010), which this does not
-- touch. Fifteen minutes of writing to your own journal harms nobody.
--
-- An admin who is dealing with active abuse and wants none of that passes
-- `p_evacuation_minutes => 0`. Then the wipe is unrecoverable for anything the
-- device had not already synced, and that is a decision a person makes
-- deliberately rather than a default anybody stumbles into.
--
-- ## What cannot be preserved, and is therefore lost
--
-- Modules the user had switched OFF in Sync settings were never uploaded, and
-- an evacuation push does not override that choice — consent to sync is not
-- something a block should be able to revoke retroactively. Those modules are
-- lost by the wipe. The app says so on the block screen, by name, before it
-- wipes. This is the sharpest edge in the whole design and it is stated rather
-- than hidden.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. THE EVACUATION WINDOW
-- ===========================================================================

alter table public.account_status
  add column if not exists evacuation_until timestamptz;

/**
 * May the CALLER reach their own rows at all?
 *
 * `is_active()` (0010) answers "not blocked". This adds the window, and is what
 * the owner policies now gate BOTH reading and writing on — reading included,
 * because a block that leaves the cloud copy readable through any HTTP client
 * is not a block.
 *
 * Two details that are not stylistic:
 *
 *  - **No argument.** It reads `auth.uid()` itself rather than taking a user
 *    id. A policy expression is evaluated with the *querying* user's rights, so
 *    this has to be executable by `authenticated` — and a version taking a uuid
 *    would then be a way for anyone signed in to ask whether any account they
 *    can name is blocked. Answering only about the caller closes that.
 *  - **STABLE, not VOLATILE**, so Postgres evaluates it once per statement
 *    rather than once per row. It is inside the qualifier of every synced
 *    table's policy; per-row would undo the work 0017 did.
 */
create or replace function public.may_access_own_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and (
       public.is_active(auth.uid())
       or exists (
         select 1 from public.account_status s
          where s.user_id = auth.uid()
            and s.evacuation_until is not null
            and s.evacuation_until > now()
       )
     );
$$;

-- ===========================================================================
-- 2. THE OWNER POLICIES, GATED ON IT
-- ===========================================================================
--
-- Same loop as 0017, same list, same reason for being a loop. What changes is
-- that the predicate is now on USING as well as WITH CHECK.
--
-- USING matters for more than reading: an UPDATE has to find the existing row
-- through USING before WITH CHECK ever sees the new one. A policy that denied
-- reads but permitted writes would therefore let a blocked account INSERT and
-- nothing else, which is not a coherent state to be in — and would break the
-- evacuation push, whose whole job is to UPDATE rows already on the server.

do $$
declare
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
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format(
      'create policy %I on public.%I for all
         using (
           user_id = (select auth.uid())
           and (select public.may_access_own_data())
         )
         with check (
           user_id = (select auth.uid())
           and (select public.may_access_own_data())
         )',
      t || '_own', t
    );
  end loop;
end;
$$;

-- Deliberately NOT gated, and each for its own reason:
--
--   account_status  — the blocked screen reads the verdict and its expiry from
--                     here. Gating it would produce "you are blocked" with no
--                     reason and no end date, which is how an appeal becomes a
--                     support ticket answered by hand.
--   device_commands — below. The wipe instruction has to be readable at exactly
--                     the moment the account is least able to read anything.
--   profiles        — an account must be able to see its own name and email to
--                     appeal, and there is nothing in a profile row that a
--                     block is protecting anybody from.

-- ===========================================================================
-- 3. DEVICE COMMANDS
-- ===========================================================================

/**
 * Instructions for a specific user's devices, picked up on launch and on each
 * foreground.
 *
 * A queue rather than a flag, because a wipe has to be *acknowledged*: the
 * operator needs to know whether the device ever came back to receive it, and
 * "the account is blocked" alone cannot tell them that. A phone that is off, or
 * has been factory reset, or whose owner uninstalled the app, never acks — and
 * that is a materially different outcome from a wipe that ran.
 */
create table if not exists public.device_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  command text not null check (command in ('wipe_local')),
  /** Free-form context the client may show or log. */
  detail jsonb not null default '{}'::jsonb,
  issued_by uuid references auth.users(id) on delete set null,
  issued_at timestamptz not null default now(),
  /** Past this, the client ignores it. An unblock cancels pending wipes by
   * setting this to now(), so a device that was offline through the whole
   * episode does not wake up and wipe an account that is fine again. */
  expires_at timestamptz,
  /** When a device reported carrying it out. Null while outstanding. */
  acked_at timestamptz,
  /** What the device said it did — including what it could not preserve. */
  ack_detail jsonb
);

create index if not exists device_commands_pending_idx
  on public.device_commands (user_id) where acked_at is null;

alter table public.device_commands enable row level security;

-- Readable by its subject, and by nobody else. NOT gated on
-- may_access_own_data: this table exists to be read by a blocked account.
create policy "device_commands_read_own" on public.device_commands
  for select using (user_id = (select auth.uid()));

-- No insert or update policy. Devices acknowledge through the function below,
-- which is the only way `acked_at` is ever written — a client that could set it
-- directly could mark a wipe done without doing it.

/** Outstanding commands for the caller's own account. */
create or replace function public.pending_device_commands()
returns table (id uuid, command text, detail jsonb, issued_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.command, c.detail, c.issued_at
    from public.device_commands c
   where c.user_id = auth.uid()
     and c.acked_at is null
     and (c.expires_at is null or c.expires_at > now())
   order by c.issued_at asc;
$$;

/**
 * A device reporting that it carried a command out.
 *
 * `p_detail` carries what the wipe could and could not preserve, which is the
 * part an operator reviewing an appeal needs — "wiped, 4 modules were never
 * synced and are gone" is a different conversation from "wiped, all recoverable".
 */
create or replace function public.ack_device_command(p_id uuid, p_detail jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.device_commands
     set acked_at = now(),
         ack_detail = coalesce(p_detail, '{}'::jsonb)
   where id = p_id
     and user_id = auth.uid()
     and acked_at is null;
end;
$$;

-- ===========================================================================
-- 4. BLOCKING, WITH TEETH
-- ===========================================================================

/**
 * Blocks an account, opens an evacuation window, and queues the device wipe.
 *
 * One function rather than three calls, because the three have to happen
 * together: a block without the wipe leaves the content on the phone, and a
 * wipe without the window destroys whatever was not synced.
 */
create or replace function public.admin_block_user(
  p_user_id uuid,
  p_reason text,
  p_expires_at timestamptz,
  p_wipe_local boolean,
  p_evacuation_minutes integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_minutes integer := greatest(coalesce(p_evacuation_minutes, 15), 0);
  v_evacuation timestamptz;
begin
  if not public.is_admin() then
    raise exception 'not an administrator' using errcode = 'insufficient_privilege';
  end if;
  if p_reason is null or length(trim(p_reason)) < 8 then
    raise exception 'a reason is required' using errcode = 'invalid_parameter_value';
  end if;

  -- Zero means "no window": the account is cut off the instant this commits,
  -- and anything the device had not already synced is lost when it wipes.
  v_evacuation := case when v_minutes > 0
                       then now() + make_interval(mins => v_minutes)
                       else null end;

  insert into public.account_status
    (user_id, status, reason, auto, expires_at, evacuation_until, actor, updated_at)
  values
    (p_user_id, 'blocked', trim(p_reason), false, p_expires_at, v_evacuation, auth.uid(), now())
  on conflict (user_id) do update
    set status = 'blocked',
        reason = excluded.reason,
        auto = false,
        expires_at = excluded.expires_at,
        evacuation_until = excluded.evacuation_until,
        actor = excluded.actor,
        updated_at = now();

  if coalesce(p_wipe_local, true) then
    -- Superseding rather than adding to: a second block should not leave two
    -- outstanding wipes for one device to perform twice.
    update public.device_commands
       set expires_at = now()
     where user_id = p_user_id and command = 'wipe_local' and acked_at is null;

    insert into public.device_commands (user_id, command, detail, issued_by, expires_at)
    values (
      p_user_id,
      'wipe_local',
      jsonb_build_object('reason', trim(p_reason), 'evacuation_until', v_evacuation),
      auth.uid(),
      -- Long-lived on purpose: the point is to catch a device that has been off
      -- for a month, not only one that is online right now.
      now() + interval '365 days'
    );
  end if;

  insert into public.admin_audit_log (actor, action, target_user, detail)
  values (
    auth.uid(),
    'block_user',
    p_user_id,
    jsonb_build_object(
      'reason', trim(p_reason),
      'expires_at', p_expires_at,
      'wipe_local', coalesce(p_wipe_local, true),
      'evacuation_minutes', v_minutes,
      'ip', public.request_ip()::text
    )
  );
end;
$$;

/**
 * Lifts a block and cancels any wipe that has not yet been carried out.
 *
 * The cancellation matters: a device that was offline for the whole episode
 * would otherwise come back, find a year-old wipe command, and destroy the
 * local copy of an account that is now in good standing. It would re-sync from
 * production, so nothing is permanently lost — but only for the modules that
 * sync, and a user watching their phone empty itself after being told they were
 * unblocked is not an experience to ship.
 */
create or replace function public.admin_unblock_user(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not an administrator' using errcode = 'insufficient_privilege';
  end if;

  update public.account_status
     set status = 'active',
         reason = p_reason,
         auto = false,
         expires_at = null,
         evacuation_until = null,
         actor = auth.uid(),
         updated_at = now()
   where user_id = p_user_id;

  update public.device_commands
     set expires_at = now()
   where user_id = p_user_id and command = 'wipe_local' and acked_at is null;

  insert into public.admin_audit_log (actor, action, target_user, detail)
  values (auth.uid(), 'unblock_user', p_user_id,
          jsonb_build_object('reason', p_reason, 'ip', public.request_ip()::text));
end;
$$;

-- ===========================================================================
-- 5. ADMIN READS EVERYTHING, INCLUDING WHAT WAS DELETED
-- ===========================================================================

/**
 * Every synced table, as a whitelist for the dynamic query below.
 *
 * A whitelist and not `p_table` interpolated directly: `format('%I')` quotes an
 * identifier but does not check it exists, and a function that will select from
 * any name an admin types is a function that will happily read `auth.users`.
 */
create or replace function public.operator_readable_tables()
returns text[]
language sql
immutable
as $$
  select array[
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
$$;

/**
 * Any user's rows from any synced table, soft-deleted ones included, with no
 * password and no PIN.
 *
 * Admin tier only — this is the unrestricted capability, and it is the one the
 * report gate in 0018 exists to keep staff away from. Rows come back as jsonb
 * so one function serves every table rather than thirty-nine returning
 * different shapes.
 *
 * `private_entries` is in the list and returns exactly what the server holds:
 * ciphertext. Reading it in the clear additionally needs the escrow key from
 * `admin_fetch_vault_escrow` (0015) and happens offline, which keeps unsealing
 * a separate, separately-audited act.
 */
create or replace function public.admin_user_rows(
  p_user_id uuid,
  p_table text,
  p_reason text,
  p_include_deleted boolean,
  p_limit integer
)
returns table (row_data jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sql text;
begin
  if not public.is_admin() then
    raise exception 'not an administrator' using errcode = 'insufficient_privilege';
  end if;
  if p_reason is null or length(trim(p_reason)) < 8 then
    raise exception 'a reason is required' using errcode = 'invalid_parameter_value';
  end if;
  if not (p_table = any (public.operator_readable_tables())) then
    raise exception 'table % is not readable through this function', p_table
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.admin_audit_log (actor, action, target_user, detail)
  values (
    auth.uid(),
    'read_user_rows',
    p_user_id,
    jsonb_build_object(
      'reason', trim(p_reason),
      'table', p_table,
      'include_deleted', coalesce(p_include_deleted, true),
      'ip', public.request_ip()::text
    )
  );

  v_sql := format(
    'select to_jsonb(t) from public.%I t where t.user_id = $1 %s order by t.updated_at desc limit $2',
    p_table,
    case when coalesce(p_include_deleted, true) then '' else 'and t.deleted_at is null' end
  );

  return query execute v_sql using p_user_id, least(coalesce(p_limit, 500), 5000);
end;
$$;

/**
 * Soft-deletes everything an account owns, in production.
 *
 * Soft, not hard, and the distinction is the point: the rows stay for an
 * appeal, for a legal hold, and for the case where the block turns out to be
 * wrong. `deleted_at` is what the sync engine reads as a tombstone, so a device
 * that syncs after this removes its local copies too — the purge propagates
 * without needing a second mechanism.
 */
create or replace function public.admin_purge_user_data(p_user_id uuid, p_reason text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
  v_total integer := 0;
  v_count integer;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if not public.is_admin() then
    raise exception 'not an administrator' using errcode = 'insufficient_privilege';
  end if;
  if p_reason is null or length(trim(p_reason)) < 8 then
    raise exception 'a reason is required' using errcode = 'invalid_parameter_value';
  end if;

  foreach t in array public.operator_readable_tables() loop
    -- The settings singletons have no deleted_at: there is one row per account
    -- and it exists for as long as the account does. Skipped rather than
    -- special-cased, since deleting somebody's preferred currency is not what
    -- a purge is for.
    if not exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = t and column_name = 'deleted_at'
    ) then
      continue;
    end if;

    execute format(
      'update public.%I set deleted_at = $1, updated_at = $1
        where user_id = $2 and deleted_at is null', t
    ) using v_now, p_user_id;
    get diagnostics v_count = row_count;
    v_total := v_total + v_count;
  end loop;

  insert into public.admin_audit_log (actor, action, target_user, detail)
  values (
    auth.uid(),
    'purge_user_data',
    p_user_id,
    jsonb_build_object('reason', trim(p_reason), 'rows', v_total, 'ip', public.request_ip()::text)
  );

  return v_total;
end;
$$;

/** Issues a local wipe without changing the account's standing — for the case
 * where content has to come off a device but the account itself is fine. */
create or replace function public.admin_wipe_user_device(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not an administrator' using errcode = 'insufficient_privilege';
  end if;
  if p_reason is null or length(trim(p_reason)) < 8 then
    raise exception 'a reason is required' using errcode = 'invalid_parameter_value';
  end if;

  insert into public.device_commands (user_id, command, detail, issued_by, expires_at)
  values (p_user_id, 'wipe_local', jsonb_build_object('reason', trim(p_reason)),
          auth.uid(), now() + interval '365 days');

  insert into public.admin_audit_log (actor, action, target_user, detail)
  values (auth.uid(), 'wipe_user_device', p_user_id,
          jsonb_build_object('reason', trim(p_reason), 'ip', public.request_ip()::text));
end;
$$;

-- ===========================================================================
-- 6. GRANTS
-- ===========================================================================

revoke all on function public.may_access_own_data() from public;
revoke all on function public.pending_device_commands() from public, anon;
revoke all on function public.ack_device_command(uuid, jsonb) from public, anon;
revoke all on function public.admin_block_user(uuid, text, timestamptz, boolean, integer)
  from public, anon;
revoke all on function public.admin_unblock_user(uuid, text) from public, anon;
revoke all on function public.admin_user_rows(uuid, text, text, boolean, integer) from public, anon;
revoke all on function public.admin_purge_user_data(uuid, text) from public, anon;
revoke all on function public.admin_wipe_user_device(uuid, text) from public, anon;

grant execute on function public.pending_device_commands() to authenticated;
grant execute on function public.ack_device_command(uuid, jsonb) to authenticated;
grant execute on function public.admin_block_user(uuid, text, timestamptz, boolean, integer)
  to authenticated;
grant execute on function public.admin_unblock_user(uuid, text) to authenticated;
grant execute on function public.admin_user_rows(uuid, text, text, boolean, integer)
  to authenticated;
grant execute on function public.admin_purge_user_data(uuid, text) to authenticated;
grant execute on function public.admin_wipe_user_device(uuid, text) to authenticated;

-- `may_access_own_data` MUST be executable by `authenticated`: a policy
-- expression is evaluated with the querying user's rights, not the policy
-- owner's, so an unexecutable function makes every synced table return
-- "permission denied" for everybody. It is safe to expose because it takes no
-- argument and answers only about the caller.
-- `anon` too. Not an oversight: the policy qualifier is evaluated for every
-- role that reaches the table, and a role that cannot execute the function gets
-- "permission denied for function" instead of an empty result. An anonymous
-- caller should see nothing, which is a different thing from an error — and
-- since the function takes no argument and reads `auth.uid()`, it tells anon
-- exactly one thing: false.
grant execute on function public.may_access_own_data() to authenticated, anon;
