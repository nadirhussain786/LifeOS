import type { RecoveryEntry, RecoveryFields } from '@/features/private/services/recovery-math';
import {
  createPrivateRecord,
  deletePrivateRecord,
  listPrivateRecords,
} from '@/features/private/services/private-repository';

/** Recovery records through the encrypted store. Derivations live in
 * recovery-math.ts. Reads normalise defensively — there is no server schema
 * to lean on, and a half-written payload must not take the screen down. */
export function listRecoveryEntries(): RecoveryEntry[] {
  return listPrivateRecords<RecoveryFields>('recovery')
    .map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      target: r.target ?? 'other',
      date: typeof r.date === 'string' ? r.date : '',
      outcome: r.outcome === 'relapsed' ? ('relapsed' as const) : ('resisted' as const),
      intensity: typeof r.intensity === 'number' ? r.intensity : 3,
      triggers: Array.isArray(r.triggers) ? r.triggers : [],
      note: typeof r.note === 'string' ? r.note : '',
    }))
    .filter((entry) => entry.date !== '')
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function addRecoveryEntry(fields: RecoveryFields): string | null {
  return createPrivateRecord('recovery', fields);
}

export function removeRecoveryEntry(id: string): void {
  deletePrivateRecord(id);
}
