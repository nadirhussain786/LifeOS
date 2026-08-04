/**
 * Registry driving the sync engine and the per-module allow-sync toggles.
 *
 * Every table here needs a text `id` primary key, a `user_id`, an `updated_at`
 * (the engine's change-detection key) and a `deleted_at` — without the last,
 * a removal cannot propagate and the row is resurrected by the next pull.
 *
 * v1 synced only each module's **primary records** — your habits, your goals,
 * your subjects — and none of the history. Signing in on a second device gave
 * you your habits back with every streak at zero. The history tables are now
 * included (0009 + ADDITIVE_COLUMNS/BACKFILL_SQL in database/schema.ts); list
 * children after their parent so a log never lands before the habit it belongs
 * to.
 *
 * Still deliberately excluded, and the reasons are not interchangeable:
 *   - Gallery, Music and attachments: the rows point at files in the app's
 *     private storage. Syncing a row without its file gives another device a
 *     library of broken references, which is worse than an empty one.
 *   - note_tag_links, habit_routine_items, playlist_songs: join tables with no
 *     single-column id and no updated_at.
 *   - sleep/study/budget settings: singletons keyed by user_id, no id column.
 *   - journal_prompts (app content), notification_log (device bookkeeping).
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
  | 'budget'
  | 'water'
  | 'private';

export type SyncModuleConfig = {
  key: SyncModule;
  labelKey: string;
  /** Local table names synced for this module, parents before children. */
  tables: string[];
  /** Sensitive modules default OFF and stay local unless the user opts in. */
  sensitive: boolean;
};

export const SYNC_MODULES: SyncModuleConfig[] = [
  {
    key: 'tasks',
    labelKey: 'syncModule.tasks',
    tables: ['task_categories', 'tasks'],
    sensitive: false,
  },
  {
    key: 'notes',
    labelKey: 'syncModule.notes',
    tables: ['note_categories', 'notes'],
    sensitive: false,
  },
  {
    key: 'habits',
    labelKey: 'syncModule.habits',
    tables: ['habit_categories', 'habits', 'habit_routines', 'habit_logs', 'habit_skips'],
    sensitive: false,
  },
  {
    key: 'journal',
    labelKey: 'syncModule.journal',
    tables: ['journal_entries', 'journal_reflections'],
    sensitive: false,
  },
  {
    key: 'calendar',
    labelKey: 'syncModule.calendar',
    tables: ['calendar_events'],
    sensitive: false,
  },
  {
    key: 'goals',
    labelKey: 'syncModule.goals',
    tables: ['goals', 'goal_milestones', 'goal_progress_logs'],
    sensitive: false,
  },
  { key: 'sleep', labelKey: 'syncModule.sleep', tables: ['sleep_sessions'], sensitive: false },
  {
    key: 'study',
    labelKey: 'syncModule.study',
    tables: ['study_subjects', 'study_sessions'],
    sensitive: false,
  },
  {
    key: 'water',
    labelKey: 'syncModule.water',
    tables: ['water_intake_logs'],
    sensitive: false,
  },
  {
    key: 'budget',
    labelKey: 'syncModule.budget',
    tables: ['budget_transactions', 'savings_goals', 'budget_debts'],
    sensitive: false,
  },
  /**
   * The private space. `sensitive`, so it stays OFF until the user turns it on.
   *
   * What travels is the same ciphertext the device stores — the sync engine
   * moves `payload` verbatim and never sees inside it. What makes it readable
   * to the operator is the escrowed key (features/private/services/
   * vault-escrow.ts), not this.
   */
  {
    key: 'private',
    labelKey: 'syncModule.private',
    tables: ['private_entries'],
    sensitive: true,
  },
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
