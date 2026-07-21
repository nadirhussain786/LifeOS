import { set, startOfDay } from 'date-fns';

import { setTaskReminderNotificationId } from '@/features/tasks/services/tasks-repository';
import { cancelNotification, scheduleOneTimeNotification } from '@/lib/notifications';
import type { Task } from '@/features/tasks/types/task.types';

/** All-day tasks (no specific due time) remind at 9am on the due date —
 * the same default other calendar apps use for date-only reminders. */
const ALL_DAY_REMINDER_HOUR = 9;

/** Cancels any previously-scheduled reminder and, if the task still wants
 * one and has an incomplete, future due date, schedules a fresh one-time
 * notification for it — called after every create/update/complete so the
 * schedule can never drift from what's saved. */
export async function syncTaskReminder(task: Task): Promise<void> {
  await cancelNotification(task.reminderNotificationId);

  if (!task.reminderEnabled || !task.dueDate || task.status === 'completed' || task.status === 'archived') {
    setTaskReminderNotificationId(task.id, null);
    return;
  }

  const triggerAt = task.hasDueTime ? task.dueDate : set(startOfDay(task.dueDate), { hours: ALL_DAY_REMINDER_HOUR }).getTime();

  const id = await scheduleOneTimeNotification({
    title: task.title,
    body: task.hasDueTime ? "It's due now." : 'Due today.',
    date: triggerAt,
    data: { category: 'tasks', route: '/tasks' },
  });
  setTaskReminderNotificationId(task.id, id);
}

export async function cancelTaskReminder(task: Pick<Task, 'id' | 'reminderNotificationId'>): Promise<void> {
  await cancelNotification(task.reminderNotificationId);
  setTaskReminderNotificationId(task.id, null);
}
