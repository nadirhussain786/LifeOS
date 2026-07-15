/**
 * Placeholder owner id for locally-stored rows (tasks, notes, habits, ...).
 * Real Supabase auth isn't wired up yet, and the offline-first design means
 * local data must work with no session at all. Once auth ships, existing
 * local rows get reassigned to the authenticated user's id as part of the
 * first sync.
 */
export const LOCAL_USER_ID = 'local';
