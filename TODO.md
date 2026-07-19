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

---

## 🔒 Needs you (blocked on account / asset / decision)
- [ ] **Device validation** — run `eas login && eas init && eas build -p android --profile development`, install the APK, and confirm reminders fire + widget renders. *This is the #1 next step.*
- [ ] **Notification status-bar icon** — provide a 96×96 white-on-transparent PNG in `assets/`; then wire `"icon"` into the `expo-notifications` plugin.
- [ ] **Real bundle identifier** — replace the `com.lifeos.app` placeholder before any store submission.
- [ ] **iOS widget prerequisite** — a paid Apple Developer account (to build/test on a device).

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
