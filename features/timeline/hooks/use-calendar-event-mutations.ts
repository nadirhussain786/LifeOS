import { useQueryClient, useMutation } from '@tanstack/react-query';

import { createCalendarEvent, deleteCalendarEvent } from '@/features/timeline/services/calendar-events-repository';
import type { CreateCalendarEventInput } from '@/features/timeline/types/timeline.types';

export function useCalendarEventMutations() {
  const queryClient = useQueryClient();

  // Timeline queries are keyed ['timeline', dateKey] — invalidating the
  // 'timeline' prefix refetches whichever day is currently open.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['timeline'] });

  const create = useMutation({
    mutationFn: async (input: CreateCalendarEventInput) => createCalendarEvent(input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteCalendarEvent(id),
    onSuccess: invalidate,
  });

  return { create, remove };
}
