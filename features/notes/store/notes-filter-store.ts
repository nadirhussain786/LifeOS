import { create } from 'zustand';

type NotesFilterState = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

export const useNotesFilterStore = create<NotesFilterState>((set) => ({
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
