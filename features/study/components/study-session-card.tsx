import { format, parseISO } from 'date-fns';
import { BookOpen, Star } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatStudyDuration } from '@/features/study/services/study-stats';
import type { StudySession, StudySubject } from '@/features/study/types/study.types';

const STUDY_TINT = '#8b5cf6';

const MODE_LABEL: Record<StudySession['mode'], string> = {
  pomodoro: 'Pomodoro',
  custom: 'Custom',
  stopwatch: 'Stopwatch',
};

type Props = {
  session: StudySession;
  subject: StudySubject | null;
  onLongPress: (session: StudySession) => void;
};

export function StudySessionCard({ session, subject, onLongPress }: Props) {
  const color = subject?.colorToken ?? STUDY_TINT;

  return (
    <Pressable
      onLongPress={() => onLongPress(session)}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4"
      accessibilityHint="Long-press to delete"
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1f` }}>
        <BookOpen size={19} color={color} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sora-semibold text-foreground" numberOfLines={1}>
          {subject?.name ?? 'General'}
          {session.note ? ` · ${session.note}` : ''}
        </Text>
        <Text variant="caption">
          {format(parseISO(session.logDate), 'EEE, MMM d')} · {MODE_LABEL[session.mode]}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text className="font-sora-bold" style={{ color }}>
          {formatStudyDuration(session.durationSeconds)}
        </Text>
        {session.focusRating != null && (
          <View className="flex-row items-center gap-0.5">
            <Star size={11} color="#eab308" fill="#eab308" />
            <Text variant="caption">{session.focusRating}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
