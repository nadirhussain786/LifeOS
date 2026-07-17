import { useQueryClient, useMutation } from '@tanstack/react-query';

import {
  addAttachment,
  createPrompt,
  deactivatePrompt,
  deleteAttachment,
  deleteEntry,
  upsertEntry,
  upsertReflection,
} from '@/features/journal/services/journal-repository';
import type { JournalAttachmentKind, UpsertJournalEntryInput } from '@/features/journal/types/journal.types';

export function useJournalMutations() {
  const queryClient = useQueryClient();

  const invalidateJournal = () => queryClient.invalidateQueries({ queryKey: ['journal'] });

  const upsert = useMutation({
    mutationFn: async (input: UpsertJournalEntryInput) => upsertEntry(input),
    onSuccess: invalidateJournal,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteEntry(id),
    onSuccess: invalidateJournal,
  });

  const addPrompt = useMutation({
    mutationFn: async (text: string) => createPrompt(text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journal', 'prompts'] }),
  });

  const removePrompt = useMutation({
    mutationFn: async (id: string) => deactivatePrompt(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journal', 'prompts'] }),
  });

  const answerPrompt = useMutation({
    mutationFn: async ({ entryId, promptId, answerText }: { entryId: string; promptId: string; answerText: string }) =>
      upsertReflection(entryId, promptId, answerText),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['journal', 'reflections', variables.entryId] }),
  });

  const attach = useMutation({
    mutationFn: async ({
      entryId,
      kind,
      uri,
      durationMs,
    }: {
      entryId: string;
      kind: JournalAttachmentKind;
      uri: string;
      durationMs?: number | null;
    }) => addAttachment(entryId, kind, uri, { durationMs }),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['journal', 'attachments', variables.entryId] }),
  });

  const removeAttachment = useMutation({
    mutationFn: async ({ id }: { id: string; entryId: string }) => deleteAttachment(id),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['journal', 'attachments', variables.entryId] }),
  });

  return { upsert, remove, addPrompt, removePrompt, answerPrompt, attach, removeAttachment };
}
