import { create } from 'zustand';

type HabitsFilterState = {
  searchQuery: string;
  showArchived: boolean;
  setSearchQuery: (query: string) => void;
  setShowArchived: (showArchived: boolean) => void;
};

export const useHabitsFilterStore = create<HabitsFilterState>((set) => ({
  searchQuery: '',
  showArchived: false,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setShowArchived: (showArchived) => set({ showArchived }),
}));
