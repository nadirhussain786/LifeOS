import {
  createPrivateRecord,
  deletePrivateRecord,
  listPrivateRecords,
} from '@/features/private/services/private-repository';

/**
 * The intimacy diary — a relationship log that is nobody else's business.
 *
 * Kept deliberately plain: a date, a mood, some tags, and room to write. The
 * value here is the privacy and the continuity, not a scoring system, and an
 * app that rates somebody's relationship out of five is an app that eventually
 * gets read over their shoulder and causes an argument.
 */
export const INTIMACY_TAGS = [
  'closeness',
  'conflict',
  'apology',
  'distance',
  'goodTalk',
  'plans',
  'gratitude',
  'boundaries',
] as const;

export type IntimacyTag = (typeof INTIMACY_TAGS)[number];

export type IntimacyFields = {
  /** `YYYY-MM-DD`. */
  date: string;
  /** 1–5 on the day overall, or null when they would rather not score it. */
  mood: number | null;
  tags: IntimacyTag[];
  note: string;
};

export type IntimacyEntry = IntimacyFields & {
  id: string;
  createdAt: number;
  updatedAt: number;
};

export function listIntimacyEntries(): IntimacyEntry[] {
  return listPrivateRecords<IntimacyFields>('intimacy')
    .map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      date: typeof r.date === 'string' ? r.date : '',
      mood: typeof r.mood === 'number' ? r.mood : null,
      tags: Array.isArray(r.tags) ? r.tags : [],
      note: typeof r.note === 'string' ? r.note : '',
    }))
    .filter((entry) => entry.date !== '')
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function addIntimacyEntry(fields: IntimacyFields): string | null {
  return createPrivateRecord('intimacy', fields);
}

export function removeIntimacyEntry(id: string): void {
  deletePrivateRecord(id);
}
