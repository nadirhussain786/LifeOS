/**
 * Registry driving the sync engine and the per-module allow-sync toggles.
 *
 * v1 syncs each module's **primary record tables** — the ones that have both a
 * text `id` primary key and an `updated_at` column, which the engine needs for
 * clean upserts and last-write-wins change detection. Child/log/join tables
 * (habit logs, note tags, goal milestones, journal reflections, per-module
 * settings rows, attachments) lack `updated_at` or a single-column id and are
 * a documented v2 (see TODO.md). Media-backed modules (Gallery, Music) and
 * device-local data (notification log, journal prompts) never sync.
 *
 * `sensitive` modules default to sync OFF and stay local unless explicitly
 * enabled — reserved for the planned encrypted modules (Love Diary, Vault),
 * none of which exist yet.
 */
export type SyncModule =
  | 'tasks'
  | 'notes'
  | 'habits'
  | 'journal'
  | 'calendar'
  | 'goals'
  | 'sleep'
  | 'study'
  | 'budget';

export type SyncModuleConfig = {
  key: SyncModule;
  label: string;
  /** Local table names synced for this module, parents before children. */
  tables: string[];
  /** Sensitive modules default OFF and stay local unless the user opts in. */
  sensitive: boolean;
};

export const SYNC_MODULES: SyncModuleConfig[] = [
  { key: 'tasks', label: 'Tasks', tables: ['task_categories', 'tasks'], sensitive: false },
  { key: 'notes', label: 'Notes', tables: ['note_categories', 'notes'], sensitive: false },
  { key: 'habits', label: 'Habits', tables: ['habit_categories', 'habits', 'habit_routines'], sensitive: false },
  { key: 'journal', label: 'Journal', tables: ['journal_entries'], sensitive: false },
  { key: 'calendar', label: 'Calendar', tables: ['calendar_events'], sensitive: false },
  { key: 'goals', label: 'Goals', tables: ['goals'], sensitive: false },
  { key: 'sleep', label: 'Sleep', tables: ['sleep_sessions'], sensitive: false },
  { key: 'study', label: 'Study', tables: ['study_subjects'], sensitive: false },
  { key: 'budget', label: 'Budget', tables: ['budget_transactions', 'savings_goals', 'budget_debts'], sensitive: false },
];

/** Every table the engine touches, flattened. */
export const ALL_SYNC_TABLES: string[] = SYNC_MODULES.flatMap((m) => m.tables);

/** Default allow-sync map: sensitive modules OFF, the rest ON. */
export function defaultModuleFlags(): Record<SyncModule, boolean> {
  return SYNC_MODULES.reduce(
    (acc, m) => {
      acc[m.key] = !m.sensitive;
      return acc;
    },
    {} as Record<SyncModule, boolean>,
  );
}
