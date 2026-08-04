-- ---------------------------------------------------------------------------
-- 0011 — Remote module switches.
--
-- Lets the operator turn a module off for everybody without shipping a build:
-- a module found to be broken, a feature pulled pending a fix, a server-backed
-- module whose backend is down. The alternative is an app-store round trip
-- measured in days, during which every user keeps hitting the same bug.
--
-- Three rules the design follows, because a remote kill switch is a loaded gun
-- pointed at your own users:
--
--  1. **Absence means enabled.** The table holds overrides only, so a module
--     that nobody has ever touched needs no row, and a new module ships
--     working rather than waiting on a migration.
--  2. **Off means hidden, never destructive.** Disabling a module removes it
--     from the Hub and blocks its routes. It does not delete, unlink or
--     migrate a single row — the data is intact and returns untouched the
--     moment the flag flips back.
--  3. **Failure means enabled.** The client treats an unreachable or
--     unparseable flag as "on" (see features/module-flags). A network blip must
--     never silently strip somebody's app down to nothing, and an offline-first
--     app is unreachable most of the time by design.
--
-- Flags are readable by anyone, including signed-out guests. They describe the
-- app, not the user, and gating them behind a session would leave guest mode —
-- the population most likely to be on a broken build — unprotected.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. TABLE
-- ===========================================================================

create table if not exists public.module_flags (
  -- Module id from features/hub/config/modules.ts (or a private module id).
  -- Untyped on purpose: see rule 1 — adding a module must not need DDL.
  module text primary key,
  enabled boolean not null default true,
  -- Shown to the user in place of the module. Without it, a disabled module is
  -- indistinguishable from a bug, and the support mail arrives anyway.
  message text,
  actor uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.module_flags enable row level security;

-- Readable by everyone, writable by nobody through the API. The only writer is
-- the admin function below.
create policy "module_flags_read" on public.module_flags
  for select using (true);

-- ===========================================================================
-- 2. FUNCTIONS
-- ===========================================================================

create or replace function public.admin_set_module_enabled(
  p_module text,
  p_enabled boolean,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not an administrator' using errcode = 'insufficient_privilege';
  end if;

  if p_module is null or length(trim(p_module)) = 0 then
    raise exception 'module is required' using errcode = 'invalid_parameter_value';
  end if;

  insert into public.module_flags (module, enabled, message, actor, updated_at)
  values (lower(trim(p_module)), p_enabled, nullif(trim(coalesce(p_message, '')), ''), auth.uid(), now())
  on conflict (module) do update
    set enabled = excluded.enabled,
        message = excluded.message,
        actor = excluded.actor,
        updated_at = now();

  -- Same log as account moderation: a switch that can darken a feature for
  -- every user is not something to flip without a record of who and when.
  insert into public.admin_audit_log (actor, action, target_user, detail)
  values (
    auth.uid(),
    'set_module_enabled',
    null,
    jsonb_build_object('module', lower(trim(p_module)), 'enabled', p_enabled, 'message', p_message)
  );
end;
$$;

-- Clears an override, returning the module to the default (enabled). Distinct
-- from setting enabled = true: it removes the row, so the table stays a list of
-- deliberate exceptions rather than accumulating every module ever touched.
create or replace function public.admin_clear_module_flag(p_module text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not an administrator' using errcode = 'insufficient_privilege';
  end if;

  delete from public.module_flags where module = lower(trim(p_module));

  insert into public.admin_audit_log (actor, action, target_user, detail)
  values (auth.uid(), 'clear_module_flag', null, jsonb_build_object('module', lower(trim(p_module))));
end;
$$;

-- ===========================================================================
-- 3. GRANTS
-- ===========================================================================

revoke all on function public.admin_set_module_enabled(text, boolean, text) from public, anon;
revoke all on function public.admin_clear_module_flag(text) from public, anon;
grant execute on function public.admin_set_module_enabled(text, boolean, text) to authenticated;
grant execute on function public.admin_clear_module_flag(text) to authenticated;
