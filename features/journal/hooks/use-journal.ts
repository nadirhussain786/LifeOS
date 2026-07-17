import { endOfMonth, startOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

import { calculateJournalStreak } from '@/features/journal/services/journal-streak';
import { listEntriesBetween } from '@/features/journal/services/journal-repository';
import { useJournalFilterStore } from '@/features/journal/store/journal-filter-store';
import { toDateKey } from '@/lib/date';

export function useJournalMonth() {
  const { visibleMonth } = useJournalFilterStore();

  return useQuery({
    queryKey: ['journal', 'month', visibleMonth],
    queryFn: async () => {
      const anchor = new Date(visibleMonth);
      const start = toDateKey(startOfMonth(anchor));
      const end = toDateKey(endOfMonth(anchor));
      return listEntriesBetween(start, end);
    },
  });
}

/** Consecutive-day streak, computed from the trailing year of entries — enough
 * history for any realistic streak without scanning the whole journal. */
export function useJournalStreak() {
  return useQuery({
    queryKey: ['journal', 'streak'],
    queryFn: async () => {
      const end = toDateKey(new Date());
      const start = toDateKey(new Date(Date.now() - 366 * 24 * 60 * 60 * 1000));
      const entries = listEntriesBetween(start, end);
      return calculateJournalStreak(entries.map((entry) => entry.entryDate));
    },
  });
}
