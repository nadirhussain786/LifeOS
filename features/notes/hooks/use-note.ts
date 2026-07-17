import { useQuery } from '@tanstack/react-query';

import { getNote } from '@/features/notes/services/notes-repository';

export function useNote(id: string) {
  return useQuery({ queryKey: ['notes', 'detail', id], queryFn: async () => getNote(id) });
}
