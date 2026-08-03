import { isToday } from 'date-fns';

import { listDebts } from '@/features/budget/services/debts-repository';
import { listHabitsWithToday } from '@/features/habits/services/habits-repository';
import { getEntryByDate } from '@/features/journal/services/journal-repository';
import { useNotificationsStore } from '@/features/notifications/store/notifications-store';
import { listTasks } from '@/features/tasks/services/tasks-repository';
import { getDailyTotal } from '@/features/water-intake/services/water-intake-repository';
import { useWaterSettingsStore } from '@/features/water-intake/store/water-settings-store';
import i18n from '@/lib/i18n';
import { cancelNotification, scheduleDailyNotification } from '@/lib/notifications';
import { toDateKey } from '@/lib/date';

export type DigestSummary = {
  tasksDueToday: number;
  habitsRemaining: number;
  moneyDue: number;
  /** True when today's journal entry hasn't been written — its individual
   * nudge is suppressed in digest mode, so the digest carries the reminder. */
  journalPending: boolean;
  /** True when today's water intake is still under goal — likewise folded in
   * since hydration nudges are suppressed in digest mode. */
  waterBehind: boolean;
};

/**
 * Snapshot of the day used for the morning digest. Local notifications carry
 * fixed text once scheduled, so this is recomputed and the digest rescheduled
 * on every app open (see {@link syncDigest}) — the numbers reflect the state
 * at last launch, which is the best a local-only reminder can do.
 */
export function buildDigestSummary(): DigestSummary {
  let tasksDueToday = 0;
  let habitsRemaining = 0;
  let moneyDue = 0;
  let journalPending = false;
  let waterBehind = false;

  try {
    tasksDueToday = listTasks('active', 'due-date').filter(
      (t) => t.dueDate != null && isToday(t.dueDate),
    ).length;
  } catch {
    // A module's table not being ready yet shouldn't sink the whole digest.
  }
  try {
    habitsRemaining = listHabitsWithToday().filter((h) => h.todayStatus === 'not_yet').length;
  } catch {
    /* ignore */
  }
  try {
    moneyDue = listDebts().filter((d) => d.status === 'overdue' || d.status === 'due_soon').length;
  } catch {
    /* ignore */
  }
  try {
    journalPending = getEntryByDate(toDateKey(new Date())) == null;
  } catch {
    /* ignore */
  }
  try {
    waterBehind =
      getDailyTotal(toDateKey(new Date())) < (useWaterSettingsStore.getState().goalMl ?? 2000);
  } catch {
    /* ignore */
  }

  return { tasksDueToday, habitsRemaining, moneyDue, journalPending, waterBehind };
}

/**
 * The digest sentence.
 *
 * Was assembled in English from a hand-rolled pluraliser (`n + word + 's'`) and
 * a hardcoded "and" joiner — so the one notification most users see every
 * single morning was the only part of the app that could not be translated, and
 * it got Arabic and Urdu plurals wrong by construction. i18next's plural rules
 * handle the counts; `Intl.ListFormat` handles the joining where the runtime
 * supports it.
 */
export function composeDigest(summary: DigestSummary): { title: string; body: string } {
  const parts: string[] = [];
  if (summary.tasksDueToday)
    parts.push(i18n.t('notif.digestTasks', { count: summary.tasksDueToday }));
  if (summary.habitsRemaining)
    parts.push(i18n.t('notif.digestHabits', { count: summary.habitsRemaining }));
  if (summary.moneyDue) parts.push(i18n.t('notif.digestMoney', { count: summary.moneyDue }));
  if (summary.journalPending) parts.push(i18n.t('notif.digestJournal'));
  if (summary.waterBehind) parts.push(i18n.t('notif.digestWater'));

  return {
    title: i18n.t('notif.digestTitle'),
    body:
      parts.length === 0
        ? i18n.t('notif.digestEmpty')
        : i18n.t('notif.digestBody', { summary: listJoin(parts) }),
  };
}

/** Locale-aware list joining, falling back to commas on a Hermes build without
 *  full Intl — a comma-separated list reads fine in every language we ship. */
function listJoin(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  try {
    return new Intl.ListFormat(i18n.language, { style: 'long', type: 'conjunction' }).format(parts);
  } catch {
    return parts.join(', ');
  }
}

/**
 * Cancels any queued digest and, when digest delivery is active, schedules a
 * fresh daily digest at the configured time with today's counts. Called on app
 * launch and whenever the relevant notification settings change, so the digest
 * never drifts from the current preferences or data.
 */
export async function syncDigest(): Promise<void> {
  const store = useNotificationsStore.getState();
  await cancelNotification(store.digestNotificationId);
  store.setDigestNotificationId(null);

  const digestOn =
    store.masterEnabled && store.deliveryMode === 'digest' && (store.categories.digest ?? true);
  if (!digestOn) return;

  const { title, body } = composeDigest(buildDigestSummary());
  const id = await scheduleDailyNotification({
    title,
    body,
    hour: store.digestHour,
    minute: store.digestMinute,
    data: { category: 'digest', route: '/' },
  });
  store.setDigestNotificationId(id);
}
