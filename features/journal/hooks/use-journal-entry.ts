import { useQuery } from '@tanstack/react-query';

import { getEntryByDate, listAttachmentsForEntry, listPrompts, listReflectionsForEntry } from '@/features/journal/services/journal-repository';

export function useJournalEntry(entryDate: string) {
  return useQuery({
    queryKey: ['journal', 'entry', entryDate],
    queryFn: async () => getEntryByDate(entryDate),
  });
}

export function useJournalPrompts() {
  return useQuery({ queryKey: ['journal', 'prompts'], queryFn: async () => listPrompts() });
}

export function useJournalReflections(entryId: string | null) {
  return useQuery({
    queryKey: ['journal', 'reflections', entryId],
    queryFn: async () => (entryId ? listReflectionsForEntry(entryId) : []),
    enabled: !!entryId,
  });
}

export function useJournalAttachments(entryId: string | null) {
  return useQuery({
    queryKey: ['journal', 'attachments', entryId],
    queryFn: async () => (entryId ? listAttachmentsForEntry(entryId) : []),
    enabled: !!entryId,
  });
}
