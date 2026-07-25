import { useDevErrorStore } from '@/lib/dev-error-store';

export type ErrorContext = Record<string, unknown> & { scope?: string };

type Sink = (error: unknown, context?: ErrorContext) => void;

let sink: Sink | null = null;

/**
 * Registers the production error sink (e.g. Sentry). Call once at startup after
 * initializing the SDK:
 *   setErrorSink((e, ctx) => Sentry.captureException(e, { extra: ctx }))
 * Until a sink is registered, production errors are logged to the console only.
 */
export function setErrorSink(fn: Sink): void {
  sink = fn;
}

/**
 * The single choke point for reporting caught / non-fatal errors (failed
 * queries & mutations, render errors caught by the ErrorBoundary, swallowed
 * catches worth surfacing). Unlike the old `__DEV__`-gated path, this reports
 * in production too — to the console and any registered sink — so failed
 * syncs/DB reads are no longer invisible in release builds. In dev it also
 * drives the on-device DevErrorBanner.
 */
export function reportError(error: unknown, context?: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error('[error]', context?.scope ?? '', message, error);

  if (__DEV__) {
    useDevErrorStore.getState().setError(context?.scope ? `${context.scope}: ${message}` : message);
    return;
  }
  sink?.(error, context);
}
