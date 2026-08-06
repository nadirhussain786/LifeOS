import { isSupabaseConfigured } from '@/lib/env';
import { generateId } from '@/lib/id';
import { supabase } from '@/lib/supabase';

/**
 * Filing a report on shared content.
 *
 * This is the app's whole abuse path for encrypted surfaces, and the shape
 * follows from that: the operator cannot read shared content, so the report has
 * to carry it. The client attaches the decrypted item the reporter is looking
 * at — which is only ever something they could already see.
 *
 * `evidence` is therefore deliberately narrow. It holds what was complained
 * about and nothing around it: the one message, not the conversation; the one
 * image reference, not the album. A report that hoovers up context is a way to
 * exfiltrate a whole shared space by complaining about one line of it.
 */
export type ReportReason = 'spam' | 'harassment' | 'sexual_content' | 'impersonation' | 'other';

export type ReportSurface = 'expense_group' | 'shared_space';

export type ReportInput = {
  reportedUserId: string | null;
  surface: ReportSurface;
  surfaceId: string | null;
  reason: ReportReason;
  note?: string;
  /** The single item complained about. Keep it to one item. */
  evidence: Record<string, unknown>;
};

export type ReportResult =
  { ok: true; id: string } | { ok: false; error: 'not-configured' | 'rate-limited' | 'failed' };

export async function submitReport(input: ReportInput): Promise<ReportResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'not-configured' };

  const id = generateId();
  const { error } = await supabase.rpc('submit_content_report', {
    p_report_id: id,
    p_reported_user_id: input.reportedUserId,
    p_surface: input.surface,
    p_surface_id: input.surfaceId,
    p_reason: input.reason,
    p_note: input.note ?? null,
    p_evidence: input.evidence,
  });

  if (error) {
    // The server caps reports per hour; surfaced distinctly so the UI can say
    // "you've reported a lot recently" rather than "something went wrong",
    // which reads as a bug and gets retried.
    return {
      ok: false,
      error: /too many reports/i.test(error.message) ? 'rate-limited' : 'failed',
    };
  }
  return { ok: true, id };
}
