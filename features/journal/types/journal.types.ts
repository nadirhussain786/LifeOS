export type MoodOption = 'great' | 'good' | 'okay' | 'low' | 'rough';

export type JournalEntry = {
  id: string;
  entryDate: string; // 'YYYY-MM-DD'
  body: string;
  mood: MoodOption | null;
  energy: number | null;
  stress: number | null;
  focus: number | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  moodReasons: string[] | null;
  locationLabel: string | null;
  locationLat: number | null;
  locationLng: number | null;
  createdAt: number;
  updatedAt: number;
};

export type UpsertJournalEntryInput = {
  entryDate: string;
  body?: string;
  mood?: MoodOption | null;
  energy?: number | null;
  stress?: number | null;
  focus?: number | null;
  sleepHours?: number | null;
  sleepQuality?: number | null;
  moodReasons?: string[] | null;
  locationLabel?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
};

export type JournalPrompt = {
  id: string;
  text: string;
  isActive: boolean;
  sortOrder: number;
  isCustom: boolean;
};

export type JournalReflection = {
  id: string;
  entryId: string;
  promptId: string;
  answerText: string;
};

export const MOOD_REASONS = ['work', 'family', 'health', 'friends', 'money', 'weather', 'relationships'] as const;
export type MoodReason = (typeof MOOD_REASONS)[number];

export type JournalAttachmentKind = 'image' | 'audio' | 'pdf' | 'file';

export type JournalAttachment = {
  id: string;
  entryId: string;
  kind: JournalAttachmentKind;
  uri: string;
  thumbnailUri: string | null;
  durationMs: number | null;
  createdAt: number;
};
