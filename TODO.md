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

## 🔒 Needs you (blocked on account / asset / decision)

- [ ] **Supabase project** — create one, run `supabase/migrations/0001_init.sql` in the SQL editor, and put the real URL + anon key in `.env` (currently placeholders). Required before auth or sync can run.
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
