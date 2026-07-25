# LifeOS — Full-App Audit (gaps & refactors to reach global/production standard)

Date: 2026-07-24. Scope: architecture & code quality, backend/sync/security, UX/accessibility/performance, and production-readiness. Read-only analysis; nothing changed.

**Overall:** The product code is unusually disciplined — `strict` TS with ~0 `any`/`@ts-ignore`, a clean repository/hook/store layering, integer-cents money, a strong theme/token system, and genuinely good "why" comments. The gaps are **not sloppiness** — they're the engineering safety-net and correctness edges that separate a well-built prototype from a shippable, multi-device, global product: **sync correctness, at-rest security, tests, observability, and store/legal compliance.**

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low. Each item tagged by area.

---

## ✅ Fixed in the remediation pass (2026-07-25)

Verified each step with `tsc --noEmit` + `jest` (18 tests) + `expo export` (all green).

- **[DATA] Delete-sync bug** — all 15 synced repos now bump `updatedAt` on soft-delete, so deletes propagate (no more resurrecting data).
- **[DATA] Account-switch bleed** — `reconcileAccountOnSignIn()` wipes local data + cursors + profile when a different uid signs in (tracked via `sync-store.lastUserId`); wired into the auth store.
- **[OBSERVABILITY] Error visibility** — root `ErrorBoundary` (recover UI), `lib/error-reporting.ts` choke point, query/mutation `onError` un-gated for production (Sentry-ready via `setErrorSink`).
- **[CORRECTNESS] Currency** — `money.ts` now uses `Intl.NumberFormat` + device locale (`expo-localization`), fixing zero-decimal currencies (JPY/KRW) and locale formatting; half-cent rounding fixed (`+ EPSILON`).
- **[HABITS] Streak bug found & fixed** — `calculateHabitStreaks` current-streak was capped at 0/1 and best-streak couldn't exceed it; rewritten (full backward run + full-history best) and locked with tests.
- **[TESTING] Test infra** — `jest-expo` + `@testing-library/react-native`; `test`/`typecheck`/`format:check` scripts; unit tests for `money.ts` and `habit-streaks.ts` (18 tests).
- **[CI] Pipeline** — `.github/workflows/ci.yml` runs typecheck + lint + tests on push/PR.
- **[DATA/PERF] Server indexes** — `(user_id, updated_at)` index on all 15 sync tables in the migration.
- **[ARCH] features↔widgets cycle** — broken: feature hooks no longer import widgets; the widget refreshes via a query-cache subscription (`use-widget-sync`).
- **[LEGAL] Data export** — now covers budget, goals, sleep, study, and gallery (was omitted).
- **[BUILD] Release config** — `runtimeVersion` (fingerprint) + iOS `privacyManifests` (required-reason APIs) added to app.json.
- **[A11y] Primitives** — `Button` now sets `accessibilityRole`/`accessibilityState`; shared `QueryError` state + wired into the transactions screen (loading skeleton + retry) as the rollout pattern.
- **[BUILD] Missing dep** — installed `expo-local-authentication` (app-lock imported it but it was absent; build was broken).

**Still requires you (external — can't be done from here):**
- **Sentry**: `npx expo install @sentry/react-native`, add its config plugin + DSN, then `setErrorSink((e, ctx) => Sentry.captureException(e, { extra: ctx }))` at startup. The choke point is ready.
- **At-rest encryption (SQLCipher)**: swap the SQLite layer (e.g. op-sqlite) with a key in `expo-secure-store` — a native change to validate on a device.
- **In-app account deletion**: needs a Supabase edge function (`auth.admin.deleteUser` + delete the user's rows) — the client can't do it. Add a "Delete account" action calling it.
- **Privacy policy + store data-safety declarations**, real bundle id, `eas init`, EAS env values, notification mono-icon.

**Perf & a11y sweep (2026-07-25, second pass):**
- **[PERF] Gallery** — migrated to `expo-image` (downsampling/disk-cache/recycling) everywhere except the view-shot capture path in `compare.tsx`; the "All Photos" grid is now a virtualized `FlashList` (`PhotoGridList`).
- **[PERF] Transaction history** — now a virtualized `FlashList` (+ loading skeleton + error state).
- **[A11y] Dynamic type** — `Text` caps scaling at 1.4× (overridable); **SwipeableRow** exposes `accessibilityActions` for swipe-only archive/delete (wired into the task row).
- **[UX] Error states** — `QueryError` (retry) wired into Tasks, Habits, and Transactions on load failure.

**Still remaining (large refactors / broad mechanical sweeps — recommend doing with device testing):**
- Error states + input `accessibilityLabel`s on the *remaining* screens (mechanical).
- Optimistic updates for high-frequency toggles (task/habit/favorite).
- Feature barrels (`index.ts` public API per module) + ban deep cross-feature imports.
- Repository CRUD + reminder-service dedup (shared helpers).
- i18n string extraction (~247 strings) + hardcoded semantic-color → token cleanup.
- Schema drift (drizzle-kit migrations) and sync-cursor keyset (ms `>` edge).
- **External:** Sentry DSN, SQLCipher at-rest encryption, in-app account-deletion edge function, privacy policy.

---

## 🔴 Critical

- 🔴 **[DATA] Soft-deletes never sync → deleted data resurrects.** *(verified)* Nearly every repo delete does `.set({ deletedAt, syncStatus:'pending' })` but **not** `updatedAt` (e.g. `features/tasks/services/tasks-repository.ts:156`, `notes:98`, `journal:114`, `budget:95`, `sleep:156`, `goals:214`, `habits:142`). The sync push is `WHERE updated_at > cursor` (`features/sync/services/sync-engine.ts:30`) and pull LWW compares `updated_at` (`:66`) — so a delete of an already-synced row is invisible to both sides and never propagates. Only `habitRoutines` (`habits-repository.ts:288`) does it right. **Impact:** delete on one device, data stays alive on server + other devices; reinstall re-pulls "deleted" data. Correctness + GDPR "right to delete" failure. **Fix:** bump `updatedAt` on every delete; treat `deleted_at` as an always-propagated tombstone.
- 🔴 **[DATA/SECURITY] Account-switch data bleed on a shared device.** Local DB is permanently `user_id='local'`; `signOut()` (`features/auth/services/auth-store.ts`) clears only the Supabase session, never local rows or cursors. Next sign-in with a *different* account uploads the previous user's rows under the new uid and merges pulls locally. `resetCursors()` exists (`features/sync/store/sync-store.ts:53`) but is **never called** (dead code). Onboarding/profile state also survives the switch (`features/profile/store/profile-store.ts`). **Fix:** on sign-out / uid change, wipe or namespace local data + call `resetCursors()`; confirm before first sync into a new account.
- 🔴 **[SECURITY] No encryption at rest; biometric lock is a UI-only overlay.** `openDatabaseSync('lifeos.db')` has no cipher key — journal free-text, **GPS lat/lng**, full financial ledger, debts/counterparties are plaintext SQLite. App-lock is a JS `absolute inset-0` overlay gated on a zustand boolean (`features/security/`), bypassable via ADB backup / rooted device / debugger. **Fix:** SQLCipher (op-sqlite / expo-sqlite encryption) with the key in `expo-secure-store` (Keychain/Keystore). Do this before any "Vault"/"Love Diary" launch.
- 🔴 **[LEGAL/STORE] No in-app account deletion + no privacy policy.** Settings → "Clear all data" wipes only local SQLite (`lib/data-management.ts`); a signed-in user's Supabase rows and auth user are never deleted. Apple 5.1.1(v) and Google both **require** in-app account deletion — this fails review. No privacy policy URL in-app or (needed) in the store listing. **Fix:** a server-side (edge function) account-delete that removes Supabase data + auth user, keep the local wipe; publish + link a privacy policy.
- 🔴 **[OBSERVABILITY] No production error monitoring and no React ErrorBoundary.** All error capture is `__DEV__`-gated: `lib/query-client.ts` `onError` returns early in prod, `DevErrorBanner` is dev-only. No `ErrorBoundary` anywhere — a single render throw white-screens the whole app (e.g. non-null assertions in `app/gallery/compare.tsx:62,146,185`). In production you have **zero** visibility into crashes or failed queries/syncs. **Fix:** add `@sentry/react-native` + a top-level ErrorBoundary with recovery UI; un-gate the reporting path (keep the visible banner dev-only).
- 🔴 **[TESTING] Zero automated tests.** No jest/testing-library/detox/maestro, no `test` or `typecheck` script, 0 test files over 344 source files. The highest-stakes logic is unverified: `features/budget/services/money.ts` (cents math), `features/sync/services/sync-engine.ts` (LWW/cursors/uid-swap), `features/habits/services/habit-streaks.ts` (streak edge cases), auth state machine. **Fix:** add `jest-expo` + testing-library; unit-test those pure modules first (highest value/hour); one Maestro smoke flow before submission.
- 🔴 **[DATA/ARCH] Schema is hand-maintained in 3 parallel places → drift = crash-loop.** `database/schema.ts` (1240 lines) holds drizzle objects **+** hand-written `TABLE_BOOTSTRAP_SQL` **+** `ADDITIVE_COLUMNS`, all kept consistent by hand. A missed column = `no such column` inside `getDb()` which breaks *every* screen, or a silently-missing column on upgrade installs. **Fix:** move to drizzle-kit generated migrations, or at minimum a boot-time dev assertion reconciling `PRAGMA table_info` against drizzle metadata so drift fails loudly in dev, not on users' devices.

---

## 🟠 High

- 🟠 **[DATA] Synced parents without their children → structurally broken data on a 2nd device.** v1 syncs primary tables only (`features/sync/config/sync-tables.ts`): habits sync without `habit_logs`, notes without `note_tags`/links/attachments, goals without milestones/progress, journal without reflections. Device B shows parents with no history, broken streaks, zero progress — looks corrupt. Root cause: child tables lack `updated_at`/single-column ids. **Fix:** give them sync columns and include them, or block those modules from multi-device sync until children sync.
- 🟠 **[DATA] Fragile sync core — ms cursors + clock-trust.** Cursors are `max(updated_at)` in epoch-ms with strict `>` (`sync-engine.ts:30,52`); batch writes sharing one `Date.now()` ms can be excluded forever (TOCTOU). LWW trusts each device's wall clock, so a skewed/fast clock silently overwrites a peer's newer edit. `server_updated_at` columns exist but are echoed from the client, not set authoritatively by the server. **Fix:** monotonic per-row sequence or a change-log table; resolve conflicts on a server-set timestamp; re-scan `>=` with an id tiebreaker.
- 🟠 **[DATA/PERF] No indexes on the server sync tables.** `supabase/migrations/0001_init.sql` has zero `CREATE INDEX`; every pull `WHERE user_id=? AND updated_at>?` is a sequential scan. **Fix:** `create index on <table>(user_id, updated_at)` for every synced table.
- 🟠 **[ARCH/SECURITY] Weakly-typed sync ingest (string-built SQL + the only real unsafe cast).** `sync-engine.ts:71-74` builds `INSERT OR REPLACE INTO ${table} (${keys})` from **server-returned column names**, values cast `row[k] as never`. It's the highest-trust, weakest-typed code in the app — at the exact boundary where untrusted data enters the DB. **Fix:** route inserts through drizzle per-table (name→table map) so columns/types are schema-checked; kills the string SQL and the `as never`.
- 🟠 **[ARCH] Circular dependency: features ↔ widgets.** `features/widgets/services/widget-data.tsx` imports tasks/habits/water repositories, while those features import `syncTodayWidget` back from widgets (`use-task-mutations.ts:14`, `use-habit-mutations.ts:19`, `use-water-intake.ts:4`). Real cycle → fragile init order, poor tree-shaking. **Fix:** invert (widgets subscribe to a query-cache/event) or hoist `syncTodayWidget` to a neutral `lib/`.
- 🟠 **[ARCH] No feature barrels → pervasive deep cross-feature imports.** No `features/*/index.ts` public API anywhere; aggregators (`features/notifications/services/digest.ts`, dashboard) deep-import 5-8 other features' internals, so any signature change ripples. **Fix:** per-feature `index.ts` public surface + lint-ban deep cross-feature imports.
- 🟠 **[CI] No CI/CD, no pre-commit, no typecheck script.** No `.github/workflows`, no husky/lint-staged; `package.json` has only `lint`+`format` (no `tsc --noEmit`). Broken typecheck/lint can land on `main` unnoticed. **Fix:** GitHub Actions on push/PR running `tsc --noEmit` + `eslint` + `prettier --check` + `jest`; husky + lint-staged pre-commit; add `typecheck`/`format:check` scripts.
- 🟠 **[i18n/CORRECTNESS] Currency is wrong for many listed currencies.** `features/budget/services/money.ts` always divides minor units by 100 and hardcodes `toLocaleString('en-US')` symbol-prefix — but `currencies.ts` includes JPY/KRW/VND/IQD/ISK (0- or 3-decimal). Amounts *and* formatting are incorrect for a large share of the catalog; also not locale-aware (`$1,200.50` vs `1.200,50 €`). **Fix:** `Intl.NumberFormat(locale,{style:'currency',currency})` (Hermes supports Intl — handles minor-unit digits + placement); add `expo-localization`.
- 🟠 **[PERF] Gallery renders the whole library unvirtualized with RN `Image`.** `features/gallery/components/photo-grid.tsx` mounts every tile in a ScrollView (`app/gallery/all.tsx`); `expo-image` isn't even a dep, so no downsampling/disk-cache/recycling — likely OOM/jank on mid-range Android. **Fix:** `FlashList numColumns={3} recycleItems` + migrate gallery to `expo-image` with `recyclingKey` and thumbnail sizing.
- 🟠 **[PERF] Unbounded transaction history is a non-virtualized ScrollView.** `app/budget/transactions.tsx:98-120` `.map`s all transactions; also missing an `isLoading` skeleton (unlike other list screens). **Fix:** `FlashList` with a flattened header|row model (pattern already in `app/(tabs)/tasks.tsx`).
- 🟠 **[UX] No error state on any screen.** `grep isError` = 0 hits; every screen treats query failure as empty data (`const { data = [] }`), indistinguishable from genuinely empty, and prod has no error surface. **Fix:** shared `<QueryBoundary>` / `isError` branch with retry on list screens.
- 🟠 **[LEGAL] Data export is incomplete (GDPR).** `lib/data-export.ts` omits budget, debts, goals, sleep, study, gallery, security — "export everything" doesn't; no cloud export/delete. **Fix:** generate export from the same table list as schema/sync so it can't drift.
- 🟠 **[BUILD] Release-config gaps.** Placeholder bundle id `com.lifeos.app` (unowned); **no iOS `PrivacyInfo.xcprivacy`** (now required — you use AsyncStorage/file-system/UserDefaults reason-APIs → rejection); **no `runtimeVersion` / `expo-updates`** (can't ship JS hotfixes); empty EAS `env` blocks + empty `submit.production`; notification status-bar icon still TODO. **Fix:** own bundle id, add privacy manifest, add `expo-updates` + `runtimeVersion` policy, populate EAS env/submit, wire the mono notification icon.

---

## 🟡 Medium

- 🟡 **[ARCH] Repository CRUD duplication across ~9 features.** `create/update/delete/…Category` in tasks/notes/habits/goals are near-identical; the `*_categories` tables are literally identical in `schema.ts`. **Fix:** `createRepository(table)` / shared `categoriesRepository(table)` + `withTimestamps`/`softDelete` helpers (removes hundreds of lines — and is the natural place to fix the delete bug once).
- 🟡 **[ARCH] Reminder services duplicated across 8 features.** `task/note/habit/sleep/debt/journal/water/calendar-reminders.ts` share one skeleton. **Fix:** one `syncReminder({existingId,when,enabled,payload,persistId})`; features supply only time + copy.
- 🟡 **[ARCH] Aggregators reach into other features' repositories** (`digest.ts`, dashboard). Depend on per-feature barrels (see High) instead.
- 🟡 **[ARCH/UX] Form validation inconsistent — only 2 of ~14 forms use zod.** Goals/habits use RHF+zod; auth/budget/sleep/study/notes/timeline are ad-hoc `useState` (sign-up only checks `!email.trim()`, no format). **Fix:** standardize RHF+zod (schemas exist to copy); also gives runtime validation at the sync-ingest boundary.
- 🟡 **[UX] No optimistic updates.** All 21 mutation modules only `invalidateQueries`; high-frequency toggles (task complete, habit done, favorite) wait a refetch, delaying the checkbox animation. **Fix:** `onMutate` `setQueryData` with rollback for those toggles. (Offline itself is fine — local SQLite.)
- 🟡 **[A11y] Baseline gaps on shared primitives (wide reach).** `components/ui/button.tsx` sets no `accessibilityRole="button"`/`accessibilityState`; `SwipeableRow` archive/delete are unreachable by screen readers (no `accessibilityActions`); only 18 of 45 `TextInput` files set `accessibilityLabel`; no `maxFontSizeMultiplier` anywhere → clipped rows at large OS type. **Fix:** fix the primitives once (Button, SwipeableRow, a labeled input wrapper, Text font-scale cap).
- 🟡 **[PERF] No memoization on list rows.** `React.memo` = 0 hits; `TaskRow`/`HabitRow`/`NoteCard`/`GoalCard` (with per-row Reanimated hooks) rebuild on unrelated parent renders (e.g. typing in search). **Fix:** `React.memo` rows + hoist stable callbacks.
- 🟡 **[UX] 7 modal forms lack keyboard handling.** `budget/transaction`, `sleep/log`, `study/log`, `budget/savings/new`, `budget/debts/new`, `music/playlist/new`, `routine/new` use neither `KeyboardAvoidingView` nor the existing `useKeyboardHeight`. **Fix:** apply the existing hook uniformly.
- 🟡 **[UX] `seeded`-during-render form hydration.** `budget/transaction.tsx:50-59` (and 6 others) call setStates in render body; won't re-seed on refetch, double-renders. **Fix:** seed via `useEffect`/RHF `reset()` on query result.
- 🟡 **[THEME] Hardcoded hex bypassing tokens.** 115 hex literals in `app/`; money red/green, `TYPE_TINT`, favorite red re-invent `success`/`destructive` tokens and don't adapt to dark. **Fix:** route semantic colors through `colors[scheme]`/tokens.
- 🟡 **[DATA] `sync_status` is dead metadata / pull clobbers it.** Pull `INSERT OR REPLACE` overwrites local `sync_status` + `server_updated_at`; the engine keys off cursors not `sync_status`, so repositories' `syncStatus:'pending'` writes are never read. **Fix:** either drive sync off `sync_status` or stop selecting/overwriting it.
- 🟡 **[AUTH/UX] Email-confirmation sign-up strands the user.** If confirmation is on, `signUp` returns no session, `isGuest` is cleared, gate bounces to login with no "check your email" message. **Fix:** propagate a pending-confirmation state from `signUp`.
- 🟡 **[i18n] No i18n framework; ~247 hardcoded English `<Text>` strings.** Defer full extraction unless multi-language is a launch goal — but pair with the currency fix above. **Fix:** `expo-localization` + i18next when scoped.
- 🟡 **[ARCH] Duration/time formatting reimplemented per feature.** Two different `formatDuration` (music ms→m:ss vs sleep min→`7h 45m`), `formatStudyDuration`, scattered `padStart`. **Fix:** consolidate into `lib/duration.ts` (dates/money already centralized).
- 🟡 **[DEPS] Dependency hygiene.** `npm audit` ~19 moderate (likely transitive/dev). **Fix:** `npx expo-doctor` + `expo install --check`; triage audit; add Dependabot/Renovate once CI exists.
- 🟡 **[DOCS] No README / LICENSE / CONTRIBUTING.** `AGENTS.md` is 3 lines; internal comments are excellent but there's no entry doc. **Fix:** README (stack, `.env` setup, run/build, architecture — liftable from file headers) + a LICENSE.

---

## 🟢 Low

- 🟢 **[DATA] Category deletes don't set `syncStatus` or `updatedAt`** (`task_categories`, `note_categories`, `savings_goals`, `study_subjects`) — worse variant of the delete bug; fix together.
- 🟢 **[DATA] Within-module push order lists child before parent** (`sync-tables.ts:45` transactions before savings_goals) — harmless today (no FKs), violates the stated contract.
- 🟢 **[DATA] `generateId()` uses `Math.random()`** — prefer `crypto.randomUUID()`/`expo-crypto`.
- 🟢 **[DATA] `profiles.email` never re-synced** after an auth email change (trigger sets it only on insert).
- 🟢 **[ARCH] Five near-identical `*-filter-store.ts`** → `createFilterStore` factory.
- 🟢 **[ARCH] `router.push(x as never)` repeated 8×** to work around typed routes → shared typed `navigate()` wrapper.
- 🟢 **[A11y] A few touch targets < 44px** (header chips 40px, icon actions ~20px) — mostly mitigated by `hitSlop`.
- 🟢 **[THEME] No AMOLED theme** (only light/dark; dark isn't true black) — if AMOLED parity is a goal.
- 🟢 **[UX] Dark-mode `RefreshControl` has no `tintColor`** (invisible spinner); pull-to-refresh only on dashboard.
- 🟢 **[UX] Notifications inbox rebuilds its own empty state** instead of shared `EmptyState`.
- 🟢 **[PERF] `shadow-e1` custom box-shadow** on 34 static cards adds Android overdraw (safe re: the NativeWind-nav gotcha).
- 🟢 **[ARCH] Broad try/swallow in digest builder** — sound intent, but log the swallowed error to telemetry once it exists.

---

## Recommended sequencing

1. **Stop active data harm first:** the delete-doesn't-sync bug and the account-switch bleed (both Critical/DATA) — small, high-value fixes; ideally land them while extracting the shared repository helper so the delete fix happens once.
2. **Make failures visible:** Sentry + ErrorBoundary + un-gate the query `onError`; add `isError` states. You're flying blind in prod until this exists.
3. **Stand up the safety net:** `jest-expo` + tests for money/sync/streaks; a CI workflow with `tsc --noEmit`; a `typecheck` script.
4. **Store/legal blockers before submission:** in-app account deletion (+ server delete), privacy policy, complete data export, PrivacyInfo.xcprivacy, real bundle id, `runtimeVersion`/`expo-updates`.
5. **Correctness & security edges:** currency (`Intl.NumberFormat`), at-rest encryption (SQLCipher) before any sensitive-module launch, sync child tables + server indexes + robust cursors before enabling multi-device sync broadly.
6. **Quality & scale:** gallery/transactions virtualization + `expo-image`, a11y primitives, optimistic toggles, feature barrels + break the widgets cycle, dedupe repositories/reminders.

## Strengths to preserve
Strict TypeScript with ~0 `any`/`@ts-ignore`; correct react-query (server/DB) vs zustand (UI/session) split; integer-cents money; lazy DB open avoiding boot crashes; the token/theme system + NativeWind-navigation-crash mitigation already baked into `Button`/`Fab`; robust auth init (finally + 4s watchdog); complete RLS on every server table; no secrets committed; consistent loading/empty handling on most screens; and exceptional in-code "why" comments.
