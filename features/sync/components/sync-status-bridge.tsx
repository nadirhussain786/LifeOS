import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { syncNow } from '@/features/sync/services/sync-engine';
import { useSyncStore } from '@/features/sync/store/sync-store';
import { errorKind } from '@/lib/supabase-error';
import { toast } from '@/lib/toast-store';

/**
 * Surfaces sync failures wherever the user happens to be.
 *
 * The engine records `status: 'error'` and a message, but the only screen that
 * ever read them was Settings → Sync & Account. Everywhere else a failed sync
 * was completely silent: the app is offline-first so nothing appears broken,
 * and a user could go on writing for days believing their notes were reaching
 * the cloud. Silence is the wrong default for the one failure the user can
 * neither see nor infer.
 *
 * A toast rather than a permanent banner, because the app genuinely does keep
 * working — this is information, not an outage. Offline gets no toast at all:
 * "you have no signal" is not news, and the sync will resume by itself.
 *
 * Renders nothing.
 */
export function SyncStatusBridge() {
  const { t } = useTranslation();
  const status = useSyncStore((s) => s.status);
  const lastError = useSyncStore((s) => s.lastError);
  const previousStatus = useRef(status);

  useEffect(() => {
    const wasSyncing = previousStatus.current === 'syncing';
    previousStatus.current = status;

    // Only on the transition into failure, so a lingering error state doesn't
    // re-toast on every screen change.
    if (status !== 'error' || !wasSyncing) return;

    const kind = errorKind(lastError ?? '');
    // Being offline is the expected state of a phone, not a fault to report.
    if (kind === 'offline' || kind === 'not-configured') return;

    toast.error(t('sync.failedToast'), {
      label: t('common.retry'),
      onPress: () => void syncNow(),
    });
  }, [status, lastError, t]);

  return null;
}
