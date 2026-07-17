import { useQuery } from '@tanstack/react-query';

import { listTimelineForDate } from '@/features/timeline/services/timeline-repository';

export function useTimelineForDate(dateKey: string) {
  return useQuery({
    queryKey: ['timeline', dateKey],
    queryFn: async () => listTimelineForDate(dateKey),
  });
}
