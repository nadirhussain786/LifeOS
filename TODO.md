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
- [x] **The expense-group policies are hoistable now** (0023). Inverted rather
      than optimised: instead of "is the caller in _this row's_ group?" per row,
      "which groups is the caller in?" once per statement, tested with
      `group_id in (select public.my_expense_group_ids())`. Same predicate, so
      the whole existing 0003–0021 group suite passes unchanged — which is the
      evidence that mattered, given how this could have leaked. Three new tests
      cover the failure the new shape could introduce: a set that spans groups
      instead of scoping to one.
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
- [x] **A blocked account can get its own data** (0022). "Download my data" on
      the block screen calls `export_own_data`, which is SECURITY DEFINER so it
      sees past the block, includes the soft-deleted rows a purge left behind,
      and takes **no user id at all** — it reads `auth.uid()` and nothing else,
      which is the whole of its safety argument. A test asserts no overload
      taking a uuid exists, so adding one fails the build rather than review.
      `private_entries` stays out and the exported file says why: the server
      holds ciphertext sealed to a key it never had.
- [ ] **Appeals are still a mailto.** The data-access half is automated now;
      deciding an appeal is not, and probably should not be.
- [ ] **No staging project exists yet.** The runner supports one; nothing has
      been run against either database.

## 🔑 Sign-in providers (code done, consoles are yours) — docs/AUTH_PROVIDERS.md

Google and Apple sign-in are built and bundle clean. **Neither has run against a
real provider**, and cannot from here. Until the consoles are configured both
buttons appear (whenever the Supabase vars are set) and fail with "That sign-in
method is not switched on for this project yet." Email and guest are unaffected.

- [ ] **Google Cloud** — OAuth consent screen + a **Web** OAuth client whose
      redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`. That
      is Supabase's URL, not the app's; Google redirects to Supabase and Supabase
      redirects to the app.
- [ ] **Supabase → Providers → Google** — client id + secret.
- [ ] **Supabase → URL Configuration → Redirect URLs** — add both
      `lifeos://auth/callback` and `lifeos:///auth/callback`. An unlisted
      redirect is refused before the user sees anything.
- [ ] **Apple** — needs the paid developer account (same one blocking the iOS
      widget): App ID capability, a Sign in with Apple key (`.p8`, one download
      only), a Services ID, then Supabase → Providers → Apple.
- [ ] ⚠️ **Guideline 4.8**: Sign in with Apple must be offered wherever another
      third-party login is. Shipping Google to iOS without Apple is a rejection —
      they go live together. Android can ship Google alone.

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
- [x] **Hidden entry point.** The private-space row can now be removed from
      Settings, from inside the space itself. The way back is a long-press on
      the version number under Settings → About — wired up unconditionally,
      hidden or not, so the gesture can become habit before it becomes the only
      route. The confirmation names it and asks you to try it once.
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

- [x] **Privatised modules no longer write legible notifications.** A privatised
      module's reminders still fire and still deep-link, with text that names
      nothing ("You have a reminder") — dropping them would penalise somebody
      for using a privacy feature. An operator-_disabled_ module is suppressed
      outright instead, which is a different problem with a different answer.
      Both flip a full reminder resync, because the OS owns the text of anything
      already queued and will not let us edit it. See
      `features/notifications/services/notification-visibility.ts`.
- [x] **Widget respects both switches.** Visibility is decided in the app and
      baked into the snapshot, since the widget's task handler runs headless
      where those stores are not reliably available. `EMPTY_SNAPSHOT` defaults
      every row to hidden so an upgrade stops leaking immediately rather than on
      next launch.
- [x] **The widget speaks all four languages.** Strings are formatted in the app
      with i18next's own plural rules and put in the snapshot, for the same
      reason `show` is — i18next is not safe to initialise in the headless task
      handler. A language change rewrites the snapshot, because nothing else
      would ever invalidate it.
- [x] **Per-user switches** (0024). A user override wins; absence falls through
      to the global switch; absence of both means enabled. The override is a
      tri-state rather than a boolean, which is the load-bearing part — without
      a middle value there is no way to say "on for this account while off
      globally", and that is exactly what a staged rollout is. The client reads
      the merged `my_module_flags()` instead of the table. The internal
      per-account note is never returned to its subject; only the global row's
      user-facing `message` is.
- [ ] **Admin UI for the switches** (global and per-user) — still SQL in the
      editor. See the operator-console note below: it is the same decision.

## 📊 Operator surface (0010 shipped — these finish it)

- [ ] **Seed the admin roster** — `insert into public.admins (user_id, note) values ('<your-uuid>', 'owner');`
      from the SQL editor. Nothing in `admin_*` works until this row exists, and
      the table is invisible to clients by design.
- [x] **A hard block now ends the session** —
      `supabase/functions/ban-account` calls
      `auth.admin.updateUserById(uid, { ban_duration })`, which is what actually
      invalidates the token a blocked account is already holding. It reads the
      caller's JWT and asks the database `is_admin()` _as that caller_, so a
      client cannot claim its own privileges; banning yourself is refused,
      because it locks the only account that could unban anybody. **Needs
      `supabase functions deploy ban-account`.**
- [ ] **Admin dashboard** — point Metabase (or a small internal page) at
      `admin_active_users()` / `admin_module_reach()`. Don't build a custom UI
      before there are numbers worth looking at. Same reasoning parks the
      operator console and the module-switch UI: every capability behind them is
      callable from the SQL editor today, and this account has no users yet, so
      a bespoke console would be built against imagined usage.
- [ ] **Tune the thresholds** — 20 invitations/hr and 10 groups/day are guesses.
      Check `abuse_counters` against real traffic after a week before trusting
      them.
- [ ] **`record_anon_activity` is callable with only the anon key** — bounded by
      a UUID-shape check and one row per install per day, so it is padding-prone
      rather than dangerous. Move it behind an edge function with per-IP limits
      if guest numbers ever matter commercially.

## 🔁 Sync v2 (deeper coverage)

> Most of this list was **already delivered by 0016/0017** and the section had
> not been updated — child/log tables, per-module settings rows and media
> metadata all sync, and account-switch handling shipped as
> `features/sync/services/account-reconcile.ts`. What is genuinely left:

- [ ] Media **bytes** via Supabase Storage (see the sync-hardening section above:
      wants quotas and an opt-in before it wants code).
- [x] **Conflict surfacing.** Last-write-wins still wins — losing is just no
      longer silent. A local edit overwritten by a newer one from another device
      is recorded with a snapshot and offered back from Settings → Sync.
      Detection keys off the set of rows the push _just uploaded_, which is
      exactly "edited here since the last sync"; without that, every ordinary
      remote update would read as a conflict. Restoring stamps `updated_at` to
      now so the other device converges, rather than being undone by the next
      pull.

## 🚀 First run (rebuilt — what is left)

- [ ] **Nothing here has been seen on a device.** The seeding writes real habit
      rows and real settings on a real database; `expo export` proves it bundles,
      not that it runs.
- [ ] **Starter habits are a guess.** Thirteen suggestions across nine focus
      areas, written blind. Worth revisiting once anyone has actually used them.
- [x] **Dead locale keys swept**, and `npm run check:i18n` now fails the build on
      a key used in code that no locale defines, or a key English has that
      another language does not. Its first run found six of the former — four of
      which predated the onboarding rewrite, including a gender step that had
      been rendering `onboarding.genderQuestion` on screen as literal text.

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
- [x] **Goals and Study categories are back.** Both have schedulers now:
      `features/goals/services/goal-reminders.ts` (one dated reminder per goal
      with a due date, capped at twelve and horizoned at 120 days, because iOS
      silently discards past 64 pending) and
      `features/study/services/study-reminders.ts` (one weekly trigger per
      selected weekday, not a daily one — a DAILY trigger nags on the days it
      was told not to). `streak` stays hidden, and its exclusion now carries the
      reason in the code: it genuinely needs to evaluate state at fire time.
