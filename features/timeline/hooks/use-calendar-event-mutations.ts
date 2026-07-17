import { useQueryClient, useMutation } from '@tanstack/react-query';

import { cancelCalendarEventReminder, scheduleCalendarEventReminder } from '@/features/timeline/services/calendar-event-reminders';
import { createCalendarEvent, deleteCalendarEvent, getCalendarEvent } from '@/features/timeline/services/calendar-events-repository';
import type { CreateCalendarEventInput } from '@/features/timeline/types/timeline.types';

export function useCalendarEventMutations() {
  const queryClient = useQueryClient();

  // Timeline queries are keyed ['timeline', dateKey] — invalidating the
  // 'timeline' prefix refetches whichever day is currently open.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['timeline'] });

  const create = useMutation({
    mutationFn: async (input: CreateCalendarEventInput) => {
      const event = createCalendarEvent(input);
      await scheduleCalendarEventReminder(event);
      return event;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const event = getCalendarEvent(id);
      deleteCalendarEvent(id);
      if (event) await cancelCalendarEventReminder(event);
    },
    onSuccess: invalidate,
  });

  return { create, remove };
}
