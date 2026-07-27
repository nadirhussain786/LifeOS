// Supabase Edge Function: delete-account
//
// Permanently deletes the calling user's account and all their synced rows.
// The client (features/auth/services/auth-store.ts → deleteAccount) invokes
// this; the client CANNOT call auth.admin.deleteUser, so it must run here with
// the service-role key. Required for App Store 5.1.1(v) / Google Play
// account-deletion compliance.
//
// Deploy:
//   supabase functions deploy delete-account
// The SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the Supabase runtime; no manual secrets needed.
//
// This file is Deno (URL imports) and is excluded from the app's tsconfig.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Every table that stores per-user rows (mirrors the sync + local-only set).
const USER_TABLES = [
  'tasks',
  'task_categories',
  'notes',
  'note_categories',
  'habits',
  'habit_categories',
  'habit_routines',
  'journal_entries',
  'calendar_events',
  'goals',
  'sleep_sessions',
  'study_subjects',
  'budget_transactions',
  'savings_goals',
  'budget_debts',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Identify the caller from their JWT.
    const authClient = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Invalid session' }, 401);
    const userId = userData.user.id;

    // Service-role admin client to delete rows + the auth user.
    const admin = createClient(supabaseUrl, serviceKey);

    for (const table of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq('user_id', userId);
      if (error) return json({ error: `Failed clearing ${table}: ${error.message}` }, 500);
    }
    await admin.from('profiles').delete().eq('id', userId);

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) return json({ error: deleteError.message }, 500);

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
