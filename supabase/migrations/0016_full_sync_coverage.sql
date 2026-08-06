-- ---------------------------------------------------------------------------
-- 0016 — Finish sync coverage, and index it for scale.
--
-- 0009 carried the history. This carries everything that was still left behind:
-- tags and the links between notes, routine and playlist membership, per-module
-- settings, custom journal prompts, and media metadata. After this the only
-- local table that does not sync is `notification_log`, which is this phone's
-- record of notifications it scheduled — bookkeeping about a device, not
-- content a person wrote.
--
-- Each exclusion in 0009's header had a reason, and each is answered here
-- rather than overruled:
--
--   * "join tables with no single-column id" — note_tag_links,
--     habit_routine_items and playlist_songs now carry an `id` DERIVED from the
--     pair they join (`noteId:tagId`). That is better than a random one: two
--     devices that make the same link offline produce the same row, and the
--     upsert collapses them instead of leaving the note tagged twice.
--   * "singletons keyed by user_id with no id column" — sleep_settings,
--     study_settings and budget_settings keep user_id as their key. The engine
--     now takes a per-table conflict column instead of assuming `id`, which is
--     a smaller change than inventing ids that two devices would disagree on.
--   * "the rows point at files in the app's private storage" — true, and the
--     answer is that the file paths no longer travel. `uri` and `thumbnail_uri`
--     are device-local columns (features/sync/config/sync-tables.ts): they are
--     never uploaded and never overwritten by a pull. What syncs is the album,
--     the playlist, the caption, the ordering and the favourite flag. A row
--     whose bytes are elsewhere renders as "not on this device", which is more
--     information than the empty gallery the exclusion produced.
--     `remote_path` is where an upload would record itself; nothing writes it
--     yet, and it is here so that adding byte transfer later is not a
--     migration against a live table.
--
-- Column types mirror the on-device SQLite exactly, as everywhere else in this
-- schema: TEXT -> text, INTEGER -> bigint (epoch-ms, booleans as 0/1),
-- REAL -> double precision. The engine pushes raw rows with no per-column
-- mapping, so a type that disagrees fails at runtime, not at deploy.
--
-- Every policy below is written `(select auth.uid())`, not `auth.uid()`. See
-- section 4 for why that parenthesis is the difference between an index lookup
-- and a function call per row.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. NOTES — tags, the links between them, and attachments
-- ===========================================================================

create table if not exists public.note_tags (
  id text primary key,
  user_id uuid not null,
  name text not null,
  color_token text,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.note_tags enable row level security;
create policy "note_tags_own" on public.note_tags
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.note_tag_links (
  id text primary key,
  user_id uuid not null,
  note_id text not null,
  tag_id text not null,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.note_tag_links enable row level security;
create policy "note_tag_links_own" on public.note_tag_links
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- `uri` and `thumbnail_uri` are absent by design: they are paths inside one
-- device's private storage and never leave it. What is here is everything that
-- describes the attachment rather than locates it.
create table if not exists public.note_attachments (
  id text primary key,
  user_id uuid not null,
  note_id text not null,
  kind text not null,
  duration_ms bigint,
  size_bytes bigint,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint,
  remote_path text
);
alter table public.note_attachments enable row level security;
create policy "note_attachments_own" on public.note_attachments
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Wiki-style [[links]] between entries.
create table if not exists public.entry_links (
  id text primary key,
  user_id uuid not null,
  source_type text not null,
  source_id text not null,
  target_type text not null,
  target_id text not null,
  relation text not null,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.entry_links enable row level security;
create policy "entry_links_own" on public.entry_links
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ===========================================================================
-- 2. HABITS, JOURNAL, MUSIC, GALLERY — membership, prompts and media metadata
-- ===========================================================================

create table if not exists public.habit_routine_items (
  id text primary key,
  user_id uuid not null,
  routine_id text not null,
  habit_id text not null,
  position bigint not null default 0,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.habit_routine_items enable row level security;
create policy "habit_routine_items_own" on public.habit_routine_items
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Custom prompts only. The five seeded defaults have a NULL user_id on the
-- device and are never selected for push — they are app content, and each
-- device seeds its own copy. `user_id` is NOT NULL here precisely so a bug that
-- tried to upload one would fail loudly rather than give one user's account a
-- row nobody can see.
create table if not exists public.journal_prompts (
  id text primary key,
  user_id uuid not null,
  text text not null,
  is_active bigint not null default 1,
  sort_order bigint not null default 0,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.journal_prompts enable row level security;
create policy "journal_prompts_own" on public.journal_prompts
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.journal_attachments (
  id text primary key,
  user_id uuid not null,
  entry_id text not null,
  kind text not null,
  duration_ms bigint,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint,
  remote_path text
);
alter table public.journal_attachments enable row level security;
create policy "journal_attachments_own" on public.journal_attachments
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.songs (
  id text primary key,
  user_id uuid not null,
  title text not null,
  artist text,
  duration_ms bigint,
  added_at bigint not null,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint,
  remote_path text
);
alter table public.songs enable row level security;
create policy "songs_own" on public.songs
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.playlists (
  id text primary key,
  user_id uuid not null,
  name text not null,
  color_token text,
  position bigint not null default 0,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.playlists enable row level security;
create policy "playlists_own" on public.playlists
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.playlist_songs (
  id text primary key,
  user_id uuid not null,
  playlist_id text not null,
  song_id text not null,
  position bigint not null default 0,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.playlist_songs enable row level security;
create policy "playlist_songs_own" on public.playlist_songs
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.gallery_albums (
  id text primary key,
  user_id uuid not null,
  name text not null,
  category text not null default 'custom',
  cover_photo_id text,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint
);
alter table public.gallery_albums enable row level security;
create policy "gallery_albums_own" on public.gallery_albums
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.gallery_photos (
  id text primary key,
  user_id uuid not null,
  album_id text,
  media_type text not null default 'photo',
  duration_ms bigint,
  width bigint,
  height bigint,
  caption text,
  tags text,
  is_favorite bigint not null default 0,
  taken_at bigint not null,
  created_at bigint not null,
  updated_at bigint not null default 0,
  deleted_at bigint,
  remote_path text
);
alter table public.gallery_photos enable row level security;
create policy "gallery_photos_own" on public.gallery_photos
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ===========================================================================
-- 3. PER-MODULE SETTINGS — one row per user, keyed by user_id
-- ===========================================================================
--
-- No `id`. These are singletons: the device's copy is keyed by user_id too, and
-- the engine upserts them on that column. Giving them a generated id would mean
-- each device inventing its own and the account ending up with one settings row
-- per phone, none of them authoritative.
--
-- `reminder_notification_id` is absent from sleep_settings for the same reason
-- the media paths are absent above: it is a handle issued by one phone's
-- notification scheduler, and copying it to another device leaves that device
-- cancelling an id that does not exist while the real reminder keeps firing.

create table if not exists public.sleep_settings (
  user_id uuid primary key,
  goal_minutes bigint not null default 480,
  target_bedtime text,
  target_wake_time text,
  reminder_enabled bigint not null default 0,
  updated_at bigint not null default 0
);
alter table public.sleep_settings enable row level security;
create policy "sleep_settings_own" on public.sleep_settings
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.study_settings (
  user_id uuid primary key,
  daily_goal_minutes bigint not null default 120,
  focus_minutes bigint not null default 25,
  break_minutes bigint not null default 5,
  updated_at bigint not null default 0
);
alter table public.study_settings enable row level security;
create policy "study_settings_own" on public.study_settings
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.budget_settings (
  user_id uuid primary key,
  currency text not null default '$',
  monthly_budget_cents bigint,
  updated_at bigint not null default 0
);
alter table public.budget_settings enable row level security;
create policy "budget_settings_own" on public.budget_settings
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ===========================================================================
-- 4. DROP THE NOTIFICATION HANDLES THAT SHOULD NEVER HAVE TRAVELLED
-- ===========================================================================
--
-- `reminder_notification_id` is an identifier issued by one phone's OS
-- notification scheduler. It has been synced since 0001, which means device B
-- has been overwriting its own valid handles with device A's. The visible
-- symptom is a reminder that cannot be switched off: the app cancels the id it
-- has, that id belongs to another device, and the notification it was actually
-- tracking is left running with nothing pointing at it.
--
-- The client stopped sending the column in this release
-- (SYNC_DEVICE_LOCAL_COLUMNS). Dropping it here is what makes that permanent
-- rather than a convention, and it deletes values that were never meaningful on
-- any device but the one that wrote them. Nothing server-side reads them.
--
-- Safe against an older client still in the wild: an upsert naming a column
-- that no longer exists is rejected, so a stale build fails its sync loudly
-- instead of continuing to corrupt the newer devices' reminders.

alter table public.tasks drop column if exists reminder_notification_id;
alter table public.notes drop column if exists reminder_notification_id;
alter table public.habits drop column if exists reminder_notification_id;
alter table public.calendar_events drop column if exists reminder_notification_id;
alter table public.budget_debts drop column if exists reminder_notification_id;

-- Same argument, one class down: `sync_status` and `server_updated_at` are this
-- device's bookkeeping about its own sync state. They were round-tripping to a
-- server that has no opinion about either.
alter table public.tasks drop column if exists sync_status;
alter table public.tasks drop column if exists server_updated_at;
alter table public.notes drop column if exists sync_status;
alter table public.notes drop column if exists server_updated_at;
alter table public.habits drop column if exists sync_status;
alter table public.habits drop column if exists server_updated_at;
alter table public.journal_entries drop column if exists sync_status;
alter table public.journal_entries drop column if exists server_updated_at;
alter table public.goals drop column if exists sync_status;
alter table public.goals drop column if exists server_updated_at;
alter table public.goal_milestones drop column if exists sync_status;
alter table public.goal_milestones drop column if exists server_updated_at;
alter table public.sleep_sessions drop column if exists sync_status;
alter table public.sleep_sessions drop column if exists server_updated_at;
alter table public.study_sessions drop column if exists sync_status;
alter table public.study_sessions drop column if exists server_updated_at;
alter table public.budget_transactions drop column if exists sync_status;
alter table public.budget_transactions drop column if exists server_updated_at;
alter table public.savings_goals drop column if exists sync_status;
alter table public.savings_goals drop column if exists server_updated_at;
alter table public.budget_debts drop column if exists sync_status;
alter table public.budget_debts drop column if exists server_updated_at;

-- ===========================================================================
-- 5. INDEXES
-- ===========================================================================
--
-- Every read the engine makes is `where user_id = ? and updated_at > ? order by
-- updated_at, id`. Without this index that is a sequential scan of a table
-- holding every user's rows: imperceptible with one account in it, and the
-- first thing to fall over with ten million.
--
-- `(user_id, updated_at)` and not `(user_id, updated_at, id)`: the tie-break on
-- id happens within one millisecond's worth of rows, which the index has
-- already narrowed to a handful.

create index if not exists note_tags_sync_idx on public.note_tags (user_id, updated_at);
create index if not exists note_tag_links_sync_idx on public.note_tag_links (user_id, updated_at);
create index if not exists note_attachments_sync_idx
  on public.note_attachments (user_id, updated_at);
create index if not exists entry_links_sync_idx on public.entry_links (user_id, updated_at);
create index if not exists habit_routine_items_sync_idx
  on public.habit_routine_items (user_id, updated_at);
create index if not exists journal_prompts_sync_idx on public.journal_prompts (user_id, updated_at);
create index if not exists journal_attachments_sync_idx
  on public.journal_attachments (user_id, updated_at);
create index if not exists songs_sync_idx on public.songs (user_id, updated_at);
create index if not exists playlists_sync_idx on public.playlists (user_id, updated_at);
create index if not exists playlist_songs_sync_idx on public.playlist_songs (user_id, updated_at);
create index if not exists gallery_albums_sync_idx on public.gallery_albums (user_id, updated_at);
create index if not exists gallery_photos_sync_idx on public.gallery_photos (user_id, updated_at);
create index if not exists sleep_settings_sync_idx on public.sleep_settings (user_id, updated_at);
create index if not exists study_settings_sync_idx on public.study_settings (user_id, updated_at);
create index if not exists budget_settings_sync_idx on public.budget_settings (user_id, updated_at);

-- The tables that already synced were never given this index for
-- `private_entries`, which arrived in 0015 with `(user_id, updated_at)` under a
-- different name. Named consistently here so the contract test can assert one
-- shape for every table rather than carrying an exception list.
create index if not exists private_entries_sync_idx
  on public.private_entries (user_id, updated_at);
