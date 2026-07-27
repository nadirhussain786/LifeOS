import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { reportError } from '@/lib/error-reporting';

function reportQueryError(scope: string, key: unknown, error: unknown) {
  // Reported in dev AND production now (console + registered sink, and the
  // on-device DevErrorBanner in dev) — a failed query/mutation/sync used to be
  // completely invisible in release builds.
  reportError(error, { scope, key });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 2,
    },
  },
  // Surfaces otherwise-silent query/mutation failures (dev banner + prod sink)
  // instead of a screen quietly rendering its empty state forever.
  queryCache: new QueryCache({
    onError: (error, query) => reportQueryError('Query', query.queryKey, error),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) =>
      reportQueryError(
        'Mutation',
        mutation.options.mutationKey ?? mutation.options.mutationFn?.name,
        error,
      ),
  }),
});
