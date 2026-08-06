import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { useAuthStore } from '@/features/auth/services/auth-store';
import { getInstallId } from '@/features/analytics/services/install-id';
import { today, useUsageStore } from '@/features/analytics/store/usage-store';
import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';

/**
 * Sends the buffered counters, and nothing else.
 *
 * Two paths, because there are two populations and they are not the same unit:
 * a signed-in account reports per-module counters under its uid, and a guest
 * reports a bare "this install was active today" against an id that resolves to
 * no account. Neither carries content.
 *
 * Never throws. Usage reporting failing is not a reason for anything the user
 * is doing to fail, and the buffer is restored so the numbers catch up on the
 * next flush rather than silently losing a day.
 */

let inFlight: Promise<void> | null = null;

export function flushUsage(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = runFlush().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runFlush(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const store = useUsageStore.getState();
  if (!store.enabled || !store.hydrated) return;

  const uid = useAuthStore.getState().user?.id;
  if (uid) await flushSignedIn();
  else await pingSignedOut();
}

async function flushSignedIn(): Promise<void> {
  const entries = useUsageStore.getState().drain();
  if (entries.length === 0) return;

  try {
    const { error } = await supabase.rpc('record_usage', {
      p_entries: entries,
      p_now: Date.now(),
    });
    if (error) throw new Error(error.message);
  } catch {
    // Put them back — an offline week should show up as a spike when the device
    // reconnects, not as a week that never happened.
    useUsageStore.getState().restore(entries);
  }
}

async function pingSignedOut(): Promise<void> {
  const store = useUsageStore.getState();
  const day = today();
  // The server keys on (install, date) so repeats are harmless, but there is no
  // reason to make the call ten times because somebody switched apps ten times.
  if (store.lastAnonPingDay === day) return;

  try {
    const installId = await getInstallId();
    const { error } = await supabase.rpc('record_anon_activity', {
      p_install_id: installId,
      p_platform: Platform.OS,
      p_app_version: Constants.expoConfig?.version ?? null,
    });
    if (error) throw new Error(error.message);
    useUsageStore.getState().setLastAnonPingDay(day);
  } catch {
    // Try again on the next foreground.
  }
}
