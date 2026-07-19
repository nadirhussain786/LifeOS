import { isToday } from 'date-fns';

import { listDebts } from '@/features/budget/services/debts-repository';
import { listHabitsWithToday } from '@/features/habits/services/habits-repository';
import { useNotificationsStore } from '@/features/notifications/store/notifications-store';
import { listTasks } from '@/features/tasks/services/tasks-repository';
import { cancelNotification, scheduleDailyNotification } from '@/lib/notifications';

export type DigestSummary = {
  tasksDueToday: number;
  habitsRemaining: number;
  moneyDue: number;
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

  try {
    tasksDueToday = listTasks('active', 'due-date').filter((t) => t.dueDate != null && isToday(t.dueDate)).length;
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

  return { tasksDueToday, habitsRemaining, moneyDue };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function composeDigest(summary: DigestSummary): { title: string; body: string } {
  const parts: string[] = [];
  if (summary.tasksDueToday) parts.push(plural(summary.tasksDueToday, 'task') + ' due');
  if (summary.habitsRemaining) parts.push(plural(summary.habitsRemaining, 'habit') + ' to go');
  if (summary.moneyDue) parts.push(plural(summary.moneyDue, 'money reminder'));

  const title = 'Good morning ☀️';
  const body =
    parts.length === 0
      ? "Nothing pressing today — enjoy the calm."
      : `Today: ${listJoin(parts)}. Tap to plan your day.`;
  return { title, body };
}

function listJoin(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
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

  const digestOn = store.masterEnabled && store.deliveryMode === 'digest' && (store.categories.digest ?? true);
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
