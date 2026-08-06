import { useAuthStore } from '@/features/auth/services/auth-store';
import { useModerationStore } from '@/features/moderation/store/moderation-store';
import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';

/**
 * Reads this account's standing (0010's `account_status`).
 *
 * The server is the enforcement — RLS refuses what a restricted account may not
 * do whether or not the app agrees. This exists so the app can *explain*: a
 * write that fails with "new row violates row-level security policy" is a bug
 * report waiting to happen, and "your account was restricted until Tuesday, for
 * this reason" is not.
 */

export type ModerationStatus = 'active' | 'throttled' | 'restricted' | 'blocked';

export type AccountStanding = {
  status: ModerationStatus;
  reason: string | null;
  /** ISO timestamp, or null for an open-ended decision. */
  expiresAt: string | null;
};

export const GOOD_STANDING: AccountStanding = {
  status: 'active',
  reason: null,
  expiresAt: null,
};

/** An expired action is over — the row survives as history, so the expiry has
 * to be applied on read here exactly as `can_share()` applies it in SQL. */
export function effectiveStatus(standing: AccountStanding | null): ModerationStatus {
  if (!standing) return 'active';
  if (standing.expiresAt && new Date(standing.expiresAt).getTime() <= Date.now()) return 'active';
  return standing.status;
}

export async function refreshAccountStanding(): Promise<AccountStanding> {
  const uid = useAuthStore.getState().user?.id;
  if (!uid || !isSupabaseConfigured) {
    useModerationStore.getState().setStanding(GOOD_STANDING);
    return GOOD_STANDING;
  }

  const { data, error } = await supabase
    .from('account_status')
    .select('status, reason, expires_at')
    .eq('user_id', uid)
    .maybeSingle();

  // No row is the normal case and means good standing. An error is NOT treated
  // as a block: a network failure must never lock somebody out of their own
  // offline-first app, and the server refuses the abusable actions regardless.
  if (error || !data) {
    if (!error) useModerationStore.getState().setStanding(GOOD_STANDING);
    return useModerationStore.getState().standing ?? GOOD_STANDING;
  }

  const standing: AccountStanding = {
    status: data.status as ModerationStatus,
    reason: data.reason,
    expiresAt: data.expires_at,
  };
  useModerationStore.getState().setStanding(standing);
  return standing;
}

/** Current verdict without a round trip — the sync engine and the overlay both
 * need it synchronously. */
export function currentStatus(): ModerationStatus {
  return effectiveStatus(useModerationStore.getState().standing);
}
