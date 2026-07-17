import { useQueryClient, useMutation } from '@tanstack/react-query';

import { createNote, deleteNote, updateNote } from '@/features/notes/services/notes-repository';
import type { CreateNoteInput, UpdateNoteInput } from '@/features/notes/types/note.types';

export function useNoteMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notes'] });

  const create = useMutation({
    mutationFn: async (input: CreateNoteInput) => createNote(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateNoteInput }) => updateNote(id, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteNote(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
