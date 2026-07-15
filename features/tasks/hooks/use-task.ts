import { useQuery } from '@tanstack/react-query';

import { getTask } from '@/features/tasks/services/tasks-repository';

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'detail', id],
    queryFn: async () => (id ? getTask(id) : null),
    enabled: !!id,
  });
}
