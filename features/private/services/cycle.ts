import type { CycleEntry, CycleFields } from '@/features/private/services/cycle-math';
import {
  createPrivateRecord,
  deletePrivateRecord,
  listPrivateRecords,
} from '@/features/private/services/private-repository';

/**
 * Cycle records, through the encrypted store. The derivations live in
 * cycle-math.ts; this file is only the boundary between them and the vault.
 *
 * Every read normalises defensively. A payload written by an older build (or a
 * partially-written one) must degrade to a usable entry rather than crashing
 * the screen — there is no server-side schema to lean on here, and no way to
 * migrate rows we cannot decrypt without the user present.
 */
export function listCycleEntries(): CycleEntry[] {
  return listPrivateRecords<CycleFields>('cycle')
    .map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      date: typeof r.date === 'string' ? r.date : '',
      flow: r.flow ?? null,
      symptoms: Array.isArray(r.symptoms) ? r.symptoms : [],
      mood: typeof r.mood === 'number' ? r.mood : null,
      note: typeof r.note === 'string' ? r.note : '',
    }))
    .filter((entry) => entry.date !== '')
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function addCycleEntry(fields: CycleFields): string | null {
  return createPrivateRecord('cycle', fields);
}

export function removeCycleEntry(id: string): void {
  deletePrivateRecord(id);
}
