# LifeOS — Remaining Tasks

Roadmap for the **Reminders / Notifications / Widgets** work.
Everything in the shipped section is on branch `feat/notifications-and-widgets` and
verified with `tsc` + `expo config` + `expo export` (build-level only — see caveat).

> ⚠️ **Nothing below the "Shipped" list has been observed running on a device.**
> Notifications and widgets do **not** run in Expo Go or `expo export`; they need a
> dev/production build. First real test: `eas build -p android --profile development`.

---

## ✅ Shipped (this branch)

- [x] Central notifications backbone (categories, quiet hours, deep-link tap, inbox)
- [x] Unified Notification Settings screen + dashboard bell & unread badge
- [x] Smart-digest delivery mode (folds water/habits/journal into one morning brief)
- [x] All 8 module reminders tagged with category + deep-link route
- [x] Android home-screen widget "Today at a glance" (tasks/habits/water) with per-row deep links + live refresh
- [x] Android notification channels (heads-up vs quiet) + brand color
- [x] True kill switch (master/category OFF cancels queued reminders)
- [x] Per-module reminder screens reconciled with central switches (CategoryOffNotice)
- [x] `eas.json` + bundle identifiers for dev builds
- [x] **Auth**: email/password sign-up/in/out + reset, guest mode, auth gate, profile
- [x] **Sync engine (v1)**: offline-first local↔Supabase, last-write-wins, `'local'↔uid` translation (guest→account migration automatic), per-module allow-sync toggles, auto-sync on launch/foreground + manual "Sync now"
- [x] **Sync & Account** settings screen (profile, sync status, module toggles, sign out)
- [x] **Supabase server schema** — `supabase/migrations/0001_init.sql` (profiles + trigger + 15 v1 tables + RLS)

---

## 🔁 Sync coverage, performance & hardening (0016 + 0017 shipped)

Sync now covers **every** local table except `notification_log`, which is this
phone's record of what it scheduled and is meaningless anywhere else.

- [x] **The local database could not open on a fresh install.** `TABLE_BOOTSTRAP_SQL`
      had six missing commas; SQLite rejects all six, and a failing statement
      aborts the whole exec. Every check in CI passed because they all read the
      SQL as text and nothing ran it. `database/schema.test.ts` now executes it
      against a real SQLite (`node:sqlite`), which is why CI needs Node 24.
- [x] **Everything left over now syncs**: tags and tag links, wiki-links between
      entries, routine and playlist membership, custom journal prompts,
      per-module settings, and media metadata.
- [x] **Media syncs as rows, not bytes.** Albums, playlists, captions, ordering
      and favourites travel; the photo/video/audio files stay on the device that
      imported them and show as "Not on this device" elsewhere.
- [x] **Device-local columns stopped travelling.** `reminder_notification_id`
      had been syncing since 0001 — one phone's OS notification handles
      overwriting another's, which is how you get a reminder that cannot be
      switched off. Dropped server-side in 0016.
- [x] **Cursors are `(updated_at, id)` pairs.** A plain timestamp cursor cannot
      advance past a page-full of rows sharing one millisecond, and those rows
      become permanently invisible to sync.
- [x] **Both directions paginate.** PostgREST caps a response at 1000 rows
      regardless; the old code took that as "everything", so a large account
      synced one page per launch.
- [x] Chunked pushes, one transaction per pulled page, throttle + jittered
      exponential backoff, and local sync indexes (the row lookup during a pull
      was a full table scan per row).
- [x] **RLS made affordable** (0017): every owner policy re-evaluated
      `auth.uid()` per row. Now `(select auth.uid())`, an InitPlan computed once
      per statement that the index can be used against.
- [x] **A blocked account is refused server-side** (0017). It could previously
      write freely — the only check was in the client. 0017 denied writes and
      left reads alone; 0019 closed reads too, so see the moderation section
      below for what a block now means.
- [x] **Session moved to the OS keystore** (`lib/secure-session-storage.ts`),
      chunked because a Supabase session exceeds SecureStore's 2048-byte
      threshold. Existing sessions migrate on first read rather than logging
      everyone out.
- [x] PKCE flow (the reset deep link no longer carries tokens in a URL),
      AppState-driven token refresh, and a real password policy.

Still to do here:

- [ ] **Raise the server-side password floor to match the client.** Supabase
      project settings → Auth → `password_min_length` (10) and consider enabling
      leaked-password protection. `features/auth/services/password-policy.ts` is
      advisory until that is done — it improves the choice, it does not stop a
      crafted request.
- [ ] **Media bytes.** `remote_path` exists on every media table and nothing
      writes it. Uploading the files needs Storage buckets with per-user RLS, a
      resumable upload queue, per-user quotas and a download-on-demand cache —
      and at ten million users it is the line item that dominates the bill, so
      it wants a quota and an opt-in before it wants code.
- [ ] **The expense-group policies still use membership functions** that take a
      per-row argument and so cannot be hoisted the way 0017 hoisted the owner
      policies. Making those cheap means turning the membership check into a
      join the planner can see through — worth doing, easy to get wrong in a way
      that leaks between groups.
- [ ] **Nothing here has run against a real Supabase project or a real device.**
      The migrations are executed by `npm run test:sql` against WASM Postgres and
      the local schema by `npm test`; neither proves behaviour on hardware.

## 🛡 Moderation & operations (0018 + 0019 shipped — see docs/OPERATIONS.md)

- [x] **Migration runner** — `npm run migrate:status|staging|production`, with a
      `schema_migrations` ledger, checksums that refuse an edited-after-applied
      migration, an advisory lock, and a transaction per file. Two databases,
      staging and production, from shell env vars only.
- [x] **Two operator tiers.** `staff` can reach an account only while a live
      report names it; `admin` is unrestricted. Both audited, both still behind
      0014's origin allowlist. Existing rows default to `admin`.
- [x] **A block now blocks.** RLS denies reads _and_ writes; the device is sent
      a `wipe_local` command it acknowledges; production keeps the data
      soft-deleted so an unblock restores it.
- [x] **Evacuation window** so the wipe does not destroy what the cloud never
      received, and an honest list of what it could not save.
- [x] **Admin can read any row including soft-deleted ones**, with no password
      or PIN, against a table whitelist and with an audit row first.

Still to do here:

- [ ] **Register the admin origins before adding any staff.** Until the first
      `admin_allowed_origins` row exists the allowlist is inert (0014), which
      means a staff account would be usable from anywhere. That bootstrap is now
      load-bearing in a way it was not when there was one operator.
- [x] **User-side reporting and blocking** (0021). `submitReport` had existed
      since 0013 with no caller — the app had a complete abuse pipeline and no
      opening. There is now a report sheet on the group and on every member, a
      block reachable without reporting first, and a Settings → Blocked accounts
      screen to undo one. Enforcement is server-side across all three contact
      routes. `features/moderation/moderation-wiring.test.ts` fails if any of it
      becomes unreachable again.
- [ ] **Operator console UI.** All of this is SQL in the editor today. Fine for
      one owner; poor for a moderator working a queue, and worse at 3am.
      `operator_report_queue()` is the screen that wants building first.
- [ ] **Wipe needs a cooperating client.** A modified build can decline to run
      it. The server-side denial cannot be declined; the local wipe can. Worth
      stating in any T&S policy rather than implying devices are controllable.
- [ ] **Appeals have no route back in.** The block screen offers an email link.
      A blocked user cannot read their own data to export it, so a data-access
      request has to be served by an admin running `admin_user_rows` by hand —
      which is a GDPR obligation currently met by a person remembering to.
- [ ] **No staging project exists yet.** The runner supports one; nothing has
      been run against either database.

## 🔒 Needs you (blocked on account / asset / decision)

- [ ] **Supabase projects** — create **two** (staging and production). Export
      `SUPABASE_DB_URL_STAGING` / `SUPABASE_DB_URL_PRODUCTION` in your shell —
      never in `.env`, which Expo inlines into the app bundle — then
      `npm run migrate:staging`, verify, `npm run migrate:production`. Put the
      project URL + anon key in `.env` (currently placeholders). Required before
      auth or sync can run. 0016 drops columns that older app builds still push,
      so apply it during a release rather than ahead of one — a stale client's
      sync will fail loudly.
- [ ] **Device validation** — run `eas login && eas init && eas build -p android --profile development`, install the APK, and confirm reminders fire + widget renders + sign-in/sync works. _#1 next step._
- [ ] **Notification status-bar icon** — provide a 96×96 white-on-transparent PNG in `assets/`; then wire `"icon"` into the `expo-notifications` plugin.
- [ ] **Real bundle identifier** — replace the `com.lifeos.app` placeholder before any store submission.
- [ ] **iOS widget prerequisite** — a paid Apple Developer account (to build/test on a device).

## 🔐 Private space (shipped — these harden it further)

- [ ] **Device validation.** None of this has run on hardware. Priority checks:
      PBKDF2 unlock latency on a mid-range Android (target < 1.5s), screenshot
      blocking actually engaging, and decrypt time for a full vault grid.
- [ ] **SQLCipher underneath it** (`docs/SQLCIPHER.md`). Private rows are already
      encrypted field-by-field, so this is defence in depth rather than a
      prerequisite — but it would also cover the _other_ modules' data at rest.
- [ ] **Hidden entry point.** The Settings row reveals the feature exists (not
      what is in it). A "hide from Settings" option with a re-entry gesture
      (long-press the version number) would close that gap.
- [ ] **Vault video support.** Images only today — the 8 MB ceiling exists
      because encryption runs in JavaScript. Needs a native crypto module.
- [ ] **Encrypted E2E sync for private modules.** The `sensitive` flag in
      `sync-tables.ts` was built for this: upload ciphertext only, so the server
      cannot read it. Requires key transfer between devices, which is its own
      design problem (QR-based key exchange is the usual answer).
- [ ] **Private media is not covered by the media-metadata sync.** Vault images
      live in `private-vault/` and are encrypted field-by-field; they are not in
      `gallery_photos` and nothing in 0016 touches them.

## 🔑 Operator access & escrow (0014 + 0015 shipped) — READ THIS FIRST

**LifeOS is no longer end-to-end encrypted.** The vault master key is sealed to
an operator X25519 key and uploaded, so staff can open any signed-in user's
private space. This was a deliberate decision; the app copy and PRIVACY.md have
been rewritten to say so.

- [ ] **Generate the operator keypair, offline.**
      `generateOperatorKeypair()` in `features/private/services/vault-escrow.ts`.
      Put only the **public** half in `EXPO_PUBLIC_VAULT_ESCROW_PUBLIC_KEY`.
- [ ] **Keep the private half out of this repo and out of the deployment.** It
      is the one secret that turns every escrow row into plaintext, and the
      database it opens is a far likelier breach target than a key kept offline.
      HSM or an offline password manager; never an env var on Supabase.
- [ ] **Register admin origins before launch** —
      `insert into public.admin_allowed_origins (id, ip_range, label) …`.
      Until the first row exists the allowlist is inert and admin access is
      unrestricted (that is the bootstrap, and it is a switch you must throw).
- [ ] **Store review will ask.** Cycle/intimacy data is GDPR Art. 9
      special-category and App Store 5.1.3 governs the health parts. Expect to
      justify operator access in the review notes and the data-safety form.
- [ ] **Escrow is not written for accounts that create a vault while signed out,
      or for vaults created before 0015.** Those stay unreadable. Decide whether
      to backfill on next unlock or leave them alone.
- [ ] **Deleting a vault locally does not remove the server escrow.** It goes
      with the account. Consider wiring `destroyVaultKeys()` to also delete the
      `vault_escrow` row, or say so in the UI.

## 🤝 Sharing & E2E sync — DESIGNED, NOT BUILT

Decisions are locked (end-to-end encryption kept; sharing protections are
best-effort and stated honestly). These two are the remaining large pieces.

**Secure shared spaces (couples / groups)** — the hard part is key exchange, not
the UI:

- [ ] Space has a random symmetric key. Content is encrypted under it and
      uploaded as ciphertext; the server stores bytes it cannot read.
- [ ] Invite carries the space key **out of band** — a QR code or a link
      fragment that never reaches the server. This is the whole design; anything
      that posts the key to Supabase silently converts this to server-readable.
- [ ] Viewer: `SecureContentView` is already built (screenshot block, watermark,
      no save/share, report button). Wire it to real shared content.
- [ ] ⚠️ **Revocation is partial and must be said so in the UI.** Removing a
      member stops them fetching _new_ content; it cannot un-know the space key
      they already hold, so anything they already downloaded stays readable.
      Rotating the key on removal fixes future content only.

**E2E sync for private modules** — same key-exchange problem:

- [ ] `sensitive: true` in `sync-tables.ts` was built for this. Upload ciphertext
      only; the server column is opaque.
- [ ] Needs the vault key on the second device, which means QR-based transfer
      between two devices the user holds. Do not add a "recover my vault" server
      path — that is escrow by another name.

## 🎛 Module switches (0011 shipped — these finish it)

- [ ] **Admin UI for the switches.** Today it is
      `select public.admin_set_module_enabled('split', false, 'reason');` in the
      SQL editor. Fine for one operator, poor under pressure at 3am.
- [ ] **Privatised modules still write notifications.** Reminders are scheduled
      by module, and a privatised module's reminder text would name its content
      on a lock screen. Either suppress those reminders while a module is
      privatised, or fall back to generic text.
- [ ] **Widget respects neither switch yet.** The Android widget reads tasks /
      habits / water directly; if one of those is privatised or disabled it will
      keep rendering. Needs the same check as the route guard.
- [ ] **Per-user switches.** 0011 is global. A per-account override would allow
      staged rollouts and one-off support fixes; needs a second table and a
      merge rule (user override wins, absence falls through to global).

## 📊 Operator surface (0010 shipped — these finish it)

- [ ] **Seed the admin roster** — `insert into public.admins (user_id, note) values ('<your-uuid>', 'owner');`
      from the SQL editor. Nothing in `admin_*` works until this row exists, and
      the table is invisible to clients by design.
- [ ] **Hard block should also ban in GoTrue** — `account_status = 'blocked'`
      stops the shared surfaces via RLS and pauses sync in the app, but the JWT
      stays valid. An edge function calling
      `auth.admin.updateUserById(uid, { ban_duration })` is what actually kills
      live sessions. Until then, blocking is defence-in-depth, not a hard stop.
- [ ] **Admin dashboard** — point Metabase (or a small internal page) at
      `admin_active_users()` / `admin_module_reach()`. Don't build a custom UI
      before there are numbers worth looking at.
- [ ] **Tune the thresholds** — 20 invitations/hr and 10 groups/day are guesses.
      Check `abuse_counters` against real traffic after a week before trusting
      them.
- [ ] **`record_anon_activity` is callable with only the anon key** — bounded by
      a UUID-shape check and one row per install per day, so it is padding-prone
      rather than dangerous. Move it behind an edge function with per-IP limits
      if guest numbers ever matter commercially.

## 🔁 Sync v2 (deeper coverage)

- [ ] Sync child/log tables (habit logs & skips, note tags/links, goal milestones & progress logs, journal reflections, study sessions, water logs, entry links) — need `updated_at` + a change strategy for append/join tables.
- [ ] Sync per-module settings rows (sleep/study/budget settings — single-row, no id).
- [ ] Media sync via Supabase Storage (gallery photos/videos, note & journal attachments, music files).
- [ ] Account switch handling (clear-and-pull when a different uid signs in on a device).
- [ ] Conflict surfacing (currently silent last-write-wins).

---

## 🟢 Buildable next (verifiable only on a device build)

- [ ] **iOS widget** — "Today at a glance" via `expo-widgets` (SwiftUI/Expo UI).
- [ ] **Water "+1 glass" widget** — quick-add button (needs headless background-write wiring).
- [ ] **Habits check-off widget** — Streaks-style tappable habit list.
- [ ] **Widget polish** — picker preview image; light/dark render variants.
- [ ] **Instant widget refresh** on more events (currently launch + mutations + 30-min tick).

---

## ⚖️ Deferred (by design)

- [ ] **Streak-at-risk notifications** — local notifications can't evaluate completion state at fire time, so any version nags after the habit is done. Revisit only with server push (FCM) or a background task. In-app confetti already covers celebrations.

---

## 🔵 Later / optional

- [ ] **FCM (server push)** — only if we add remote/server-driven notifications. Local reminders don't need it.
- [ ] **Re-enable Goals/Study/Streak categories** — currently hidden (no scheduler). Build goal-deadline & study reminders to bring their toggles back.
