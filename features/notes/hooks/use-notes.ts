import { useQuery } from '@tanstack/react-query';

import { getNoteCategoryById, listArchivedNotes, listNoteCategories, listNotes, listTags } from '@/features/notes/services/notes-repository';
import { useNotesFilterStore } from '@/features/notes/store/notes-filter-store';

export function useNotes() {
  const { searchQuery } = useNotesFilterStore();

  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => listNotes(),
    select: (notes) =>
      searchQuery.trim()
        ? notes.filter((note) => note.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
        : notes,
  });
}

export function useArchivedNotes() {
  return useQuery({ queryKey: ['notes', 'archived'], queryFn: async () => listArchivedNotes() });
}

export function useNoteTags() {
  return useQuery({ queryKey: ['note-tags'], queryFn: async () => listTags() });
}

export function useNoteCategories() {
  return useQuery({ queryKey: ['note-categories'], queryFn: async () => listNoteCategories() });
}

/** Resolves a category by id regardless of soft-delete, so an already-assigned note keeps showing its label. */
export function useNoteCategoryById(id: string | null) {
  return useQuery({
    queryKey: ['note-categories', 'detail', id],
    queryFn: async () => (id ? getNoteCategoryById(id) : null),
    enabled: !!id,
  });
}
