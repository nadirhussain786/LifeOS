import type { MoodOption } from '@/features/journal/types/journal.types';

export const MOOD_EMOJI: Record<MoodOption, string> = {
  great: '😄',
  good: '🙂',
  okay: '😐',
  low: '😕',
  rough: '😣',
};

export const MOOD_LABEL: Record<MoodOption, string> = {
  great: 'Great',
  good: 'Good',
  okay: 'Okay',
  low: 'Low',
  rough: 'Rough',
};

// A calm, non-judgmental color per mood — never the app's destructive red,
// so a hard day reads as "noted" rather than "wrong."
export const MOOD_TINT: Record<MoodOption, string> = {
  great: '#22c55e',
  good: '#84cc16',
  okay: '#eab308',
  low: '#0ea5e9',
  rough: '#f97316',
};
