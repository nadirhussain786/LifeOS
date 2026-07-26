# LifeOS — Privacy Policy

_Last updated: 2026-07-26_

LifeOS ("the app", "we") is a personal life-organization app. Your privacy is
central to how it's built: **LifeOS is local-first — your data lives on your
device by default**, and only leaves it if you choose to create an account and
enable cloud sync.

## What data LifeOS handles

**On your device (always local):**
- Content you create: tasks, notes, habits and habit logs, journal entries
  (including optional mood, energy, and — only if you enable it — a location tag
  with coordinates), calendar events, water logs, sleep and study sessions,
  budget transactions/debts/savings, goals, and gallery photos/videos you add.
- App preferences: theme, language, notification settings, and app-lock setting.

**In the cloud (only if you sign in and enable sync):**
- The above records for the modules you choose to sync (you control this
  per-module in Settings → Sync & Account). Photos, audio, and reminders are
  **not** synced.
- Your account profile: email address and display name.

We do **not** collect analytics or advertising identifiers, and we do **not**
sell your data.

## Where cloud data is stored

Cloud sync uses [Supabase](https://supabase.com) (Postgres). Every row is
protected by Row Level Security so that only your authenticated account can read
or write your data. Data is transmitted over HTTPS.

## Permissions

LifeOS requests device permissions only for features you use:
- **Notifications** — to deliver reminders you set.
- **Camera / Photos** — to add media to the gallery, notes, and journal.
- **Microphone** — to record voice notes.
- **Location** — only when you explicitly tag a journal entry's location.
- **Face ID / biometrics** — only to unlock the app if you enable App Lock.

## Your rights and controls

- **Export** — Settings → Data → Export data produces a full JSON copy of your
  on-device data.
- **Delete on device** — Settings → Data → Clear all data erases everything
  locally.
- **Delete your account** — Settings → Sync & Account → Delete account
  permanently deletes your account and all your synced cloud data, and clears
  this device. This cannot be undone.
- **Control what syncs** — per-module toggles in Settings → Sync & Account; or
  simply never create an account (guest mode keeps everything local).

## Crash reporting

If a crash-reporting service (Sentry) is configured for a build, technical error
reports (no journal/financial/personal content) may be sent to help fix bugs.
Builds without it configured send nothing.

## Children

LifeOS is not directed to children under 13, and we do not knowingly collect
data from them.

## Changes

We may update this policy; material changes will be reflected by the "Last
updated" date above.

## Contact

Questions about privacy or your data: **nh262464@gmail.com**
