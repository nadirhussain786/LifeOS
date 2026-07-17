import { useQueryClient, useMutation } from '@tanstack/react-query';

import {
  addNoteAttachment,
  archiveNote,
  createNote,
  deleteNote,
  deleteNoteAttachment,
  setTagsForNote,
  unarchiveNote,
  updateNote,
} from '@/features/notes/services/notes-repository';
import type { CreateNoteInput, NoteAttachment, UpdateNoteInput } from '@/features/notes/types/note.types';

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

  const archive = useMutation({
    mutationFn: async (id: string) => archiveNote(id),
    onSuccess: invalidate,
  });

  const unarchive = useMutation({
    mutationFn: async (id: string) => unarchiveNote(id),
    onSuccess: invalidate,
  });

  const setTags = useMutation({
    mutationFn: async ({ id, tagIds }: { id: string; tagIds: string[] }) => setTagsForNote(id, tagIds),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['notes', 'detail', variables.id, 'tags'] }),
  });

  const attach = useMutation({
    mutationFn: async ({ id, kind, uri, durationMs }: { id: string; kind: NoteAttachment['kind']; uri: string; durationMs?: number | null }) =>
      addNoteAttachment(id, kind, uri, durationMs),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['notes', 'detail', variables.id, 'attachments'] }),
  });

  const removeAttachment = useMutation({
    mutationFn: async ({ id }: { id: string; noteId: string }) => deleteNoteAttachment(id),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['notes', 'detail', variables.noteId, 'attachments'] }),
  });

  return { create, update, remove, archive, unarchive, setTags, attach, removeAttachment };
}
