import { format } from 'date-fns';

import { setCalendarEventReminderNotificationId } from '@/features/timeline/services/calendar-events-repository';
import { cancelNotification, scheduleOneTimeNotification } from '@/lib/notifications';
import type { CalendarEvent } from '@/features/timeline/types/timeline.types';

export async function scheduleCalendarEventReminder(event: CalendarEvent): Promise<void> {
  if (event.reminderMinutesBefore == null) return;

  const triggerAt = event.startAt - event.reminderMinutesBefore * 60_000;
  const id = await scheduleOneTimeNotification({
    title: event.title,
    body: event.reminderMinutesBefore === 0 ? 'Starting now.' : `Starting in ${event.reminderMinutesBefore} minutes.`,
    date: triggerAt,
    data: { category: 'calendar', route: '/timeline/[date]', params: { date: format(event.startAt, 'yyyy-MM-dd') } },
  });
  setCalendarEventReminderNotificationId(event.id, id);
}

export async function cancelCalendarEventReminder(event: Pick<CalendarEvent, 'id' | 'reminderNotificationId'>): Promise<void> {
  await cancelNotification(event.reminderNotificationId);
}
