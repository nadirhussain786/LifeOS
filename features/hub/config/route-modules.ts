/**
 * Maps a route's first path segment to the module that owns it.
 *
 * Two features need this and must agree: usage reporting (which module was
 * opened) and the module guard (may this be opened at all). Keeping one map
 * means a module cannot be counted under one identity and gated under another
 * — and, more importantly, that adding a module to one list and forgetting the
 * other is not possible.
 *
 * Matching on the first segment is deliberate: it covers every sub-route a
 * module has, so `/budget/transactions/x` is gated by the same rule as
 * `/budget`. A per-screen guard would have to be remembered on each of them,
 * and the one that gets forgotten is the deep link somebody actually follows.
 */
export const SEGMENT_TO_MODULE: Record<string, string> = {
  '': 'dashboard',
  index: 'dashboard',
  tasks: 'tasks',
  task: 'tasks',
  habits: 'habits',
  habit: 'habits',
  routine: 'habits',
  journal: 'journal',
  hub: 'hub',
  goals: 'goals',
  study: 'study',
  notes: 'notes',
  note: 'notes',
  timeline: 'timeline',
  sleep: 'sleep',
  'water-intake': 'water',
  budget: 'budget',
  split: 'split',
  gallery: 'gallery',
  music: 'music',
  settings: 'settings',
  search: 'search',
  notifications: 'notifications',
};

/** The module a path belongs to, or null for routes that belong to none
 * (auth, onboarding, the private space's own screens). */
export function moduleForPath(pathname: string): string | null {
  const segment = pathname.split('?')[0].split('/').filter(Boolean)[0] ?? '';
  return SEGMENT_TO_MODULE[segment] ?? null;
}
