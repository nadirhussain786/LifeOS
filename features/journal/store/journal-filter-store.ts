import { create } from 'zustand';

import { toDateKey } from '@/lib/date';

type JournalFilterState = {
  /** The month currently shown on the Timeline, as any date within it. */
  visibleMonth: string;
  setVisibleMonth: (date: string) => void;
};

export const useJournalFilterStore = create<JournalFilterState>((set) => ({
  visibleMonth: toDateKey(new Date()),
  setVisibleMonth: (visibleMonth) => set({ visibleMonth }),
}));
