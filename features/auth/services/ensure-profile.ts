import { supabase } from '@/lib/supabase';

/**
 * Makes sure the signed-in user has a `public.profiles` row.
 *
 * 0001 creates one from a trigger on `auth.users`, so in theory this is never
 * needed. In practice a row can be absent: the account predates the trigger
 * (0001 applied to a project that already had users), the row was removed by
 * hand, or the trigger was dropped and recreated between deploys.
 *
 * That gap is not cosmetic. `create_expense_group` adds the group's owner with
 * `INSERT … SELECT … FROM profiles WHERE id = auth.uid()`, which inserts NOTHING
 * when there is no profile row — so the creator never becomes a member, the
 * activity insert immediately after is refused by RLS, and the whole
 * transaction rolls back with
 *
 *   new row violates row-level security policy for table "expense_group_activity"
 *
 * which is exactly the error this repairs. Migration 0007 fixes the function
 * itself, but migrations are applied by hand to the hosted project, so a build
 * can be running against a database that has not had it yet. This runs entirely
 * within the existing `profiles_own` policy (`id = auth.uid()`), needs no new
 * SQL, and therefore works against every deployed schema version.
 *
 * `ignoreDuplicates` makes it ON CONFLICT DO NOTHING: an existing profile — with
 * its claimed username and chosen display name — is never overwritten.
 *
 * Never throws. It is a repair, not a step: a caller's real work should not fail
 * because the repair could not run.
 */
export async function ensureProfileRow(): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    const now = Date.now();
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? null,
        display_name:
          (user.user_metadata?.display_name as string | undefined) ??
          (user.user_metadata?.full_name as string | undefined) ??
          user.email?.split('@')[0] ??
          null,
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  } catch {
    // Offline, unconfigured, or a schema that doesn't have the columns — the
    // caller's own error handling covers what happens next.
  }
}
