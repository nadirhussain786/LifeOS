import * as Sentry from '@sentry/react-native';

import { env } from '@/lib/env';
import { setErrorSink } from '@/lib/error-reporting';

let initialized = false;

/**
 * Initializes Sentry when a DSN is present and routes the app's error choke
 * point (reportError → setErrorSink) to it. No-ops when EXPO_PUBLIC_SENTRY_DSN
 * is absent, so dev and unconfigured builds keep local-only reporting (console
 * + dev banner) with zero network. Call once at startup.
 */
export function initSentry(): void {
  if (initialized) return;
  const dsn = env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    // Keep it lean: errors only, no perf tracing by default.
    tracesSampleRate: 0,
  });

  setErrorSink((error, context) => {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  });

  initialized = true;
}
