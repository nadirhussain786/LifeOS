import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { useDevErrorStore } from '@/lib/dev-error-store';

function reportDevError(scope: string, key: unknown, error: unknown) {
  if (!__DEV__) return;
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${scope}]`, key, error);
  useDevErrorStore.getState().setError(`${scope} failed: ${message}`);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 2,
    },
  },
  // Dev-only: surfaces silent query/mutation failures via DevErrorBanner
  // instead of a screen quietly rendering its empty state forever.
  queryCache: new QueryCache({
    onError: (error, query) => reportDevError('Query', query.queryKey, error),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => reportDevError('Mutation', mutation.options.mutationKey ?? mutation.options.mutationFn?.name, error),
  }),
});
