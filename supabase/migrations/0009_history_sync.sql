-- ---------------------------------------------------------------------------
-- Sync the history, not just the definitions.
--
-- v1 synced each module's primary record — your habits, your goals, your study
-- subjects — and none of the tables holding what you actually DID with them.
-- Sign in on a second device and you got your habits back with every streak at
-- zero, goals at 0%, no water history and no study sessions. Sync looked like
-- it was working, which is the worst way for it not to.
--
-- The tables below were left out for a mechanical reason, not a deliberate one:
-- the engine detects change with `updated_at` and needs a soft-delete column so
-- a removal propagates instead of being resurrected by the next pull, and none
-- of them had either. The client side of that is in database/schema.ts
-- (ADDITIVE_COLUMNS + BACKFILL_SQL); this is the server half.
--
-- Column types mirror the on-device SQLite exactly, as everywhere else in this
-- schema: TEXT -> text, INTEGER -> bigint (epoch-ms, booleans as 0/1),
-- REAL -> double precision. The engine pushes raw rows with no per-column
-- mapping, so a type that disagrees fails at runtime, not at deploy.
--
-- Still deliberately NOT synced, and not an oversight:
--   * gallery_*, songs, playlists — the rows point at files in the app's private
--     storage. Syncing the row without the file gives another device a library
--     of broken references, which is worse than an empty one.
--   * note_attachments, journal_attachments — same reason.
--   * note_tag_links, habit_routine_items, playlist_songs — join tables with no
--     single-column id and no updated_at. They need a different shape (or
--     replace-on-write semantics) to sync safely.
--   * sleep_settings, study_settings, budget_settings — singletons keyed by
--     user_id with no id column.
--   * journal_prompts (app content), notification_log (device bookkeeping).
-- ---------------------------------------------------------------------------

-- --- habits: the ticks and the excused days -------------------------------

create table if not exists public.habit_logs (
  id text primary key,
  user_id uuid not null,
  habit_id text not null,
  log_date text not null,
  value double precision not null default 1,
  note text,
  logged_at bigint not null,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.habit_logs enable row level security;
create policy "habit_logs_own" on public.habit_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.habit_skips (
  id text primary key,
  user_id uuid not null,
  habit_id text not null,
  log_date text not null,
  reason text not null default 'skip',
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.habit_skips enable row level security;
create policy "habit_skips_own" on public.habit_skips
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- water: every glass ----------------------------------------------------

create table if not exists public.water_intake_logs (
  id text primary key,
  user_id uuid not null,
  log_date text not null,
  amount_ml bigint not null,
  logged_at bigint not null,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.water_intake_logs enable row level security;
create policy "water_intake_logs_own" on public.water_intake_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- goals: the checkpoints and the progress ------------------------------

create table if not exists public.goal_milestones (
  id text primary key,
  user_id uuid not null,
  goal_id text not null,
  title text not null,
  is_completed bigint not null default 0,
  completed_at bigint,
  position bigint not null default 0,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.goal_milestones enable row level security;
create policy "goal_milestones_own" on public.goal_milestones
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.goal_progress_logs (
  id text primary key,
  user_id uuid not null,
  goal_id text not null,
  value double precision not null,
  delta double precision not null default 0,
  note text,
  logged_at bigint not null,
  log_date text not null,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.goal_progress_logs enable row level security;
create policy "goal_progress_logs_own" on public.goal_progress_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- study: the sessions, not just the subjects ---------------------------

create table if not exists public.study_sessions (
  id text primary key,
  user_id uuid not null,
  subject_id text,
  log_date text not null,
  started_at bigint not null,
  ended_at bigint not null,
  duration_seconds bigint not null,
  mode text not null default 'pomodoro',
  focus_rating bigint,
  note text,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.study_sessions enable row level security;
create policy "study_sessions_own" on public.study_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- journal: the answers to the prompts ----------------------------------

create table if not exists public.journal_reflections (
  id text primary key,
  user_id uuid not null,
  entry_id text not null,
  prompt_id text not null,
  answer_text text not null,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.journal_reflections enable row level security;
create policy "journal_reflections_own" on public.journal_reflections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- The engine pulls with `where user_id = ? and updated_at > cursor order by
-- updated_at`, so this is the index every one of these tables is read by.
-- ---------------------------------------------------------------------------
create index if not exists habit_logs_sync_idx on public.habit_logs (user_id, updated_at);
create index if not exists habit_skips_sync_idx on public.habit_skips (user_id, updated_at);
create index if not exists water_intake_logs_sync_idx
  on public.water_intake_logs (user_id, updated_at);
create index if not exists goal_milestones_sync_idx on public.goal_milestones (user_id, updated_at);
create index if not exists goal_progress_logs_sync_idx
  on public.goal_progress_logs (user_id, updated_at);
create index if not exists study_sessions_sync_idx on public.study_sessions (user_id, updated_at);
create index if not exists journal_reflections_sync_idx
  on public.journal_reflections (user_id, updated_at);
