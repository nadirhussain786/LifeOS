import { View } from 'react-native';

import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import { formatStudyDuration } from '@/features/study/services/study-stats';
import type { SubjectBreakdown as Breakdown } from '@/features/study/types/study.types';

const NEUTRAL = '#8b5cf6';

/** Proportional split of study time by subject over the window. Bars are
 * normalized to the largest subject so the leader always fills the track. */
export function SubjectBreakdownList({ breakdown }: { breakdown: Breakdown[] }) {
  const max = breakdown.reduce((m, b) => Math.max(m, b.seconds), 0) || 1;

  return (
    <View className="gap-3">
      {breakdown.map((entry, index) => {
        const color = entry.subject?.colorToken ?? NEUTRAL;
        return (
          <View key={entry.subject?.id ?? `general-${index}`} className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <Text className="font-sora-medium text-foreground">{entry.subject?.name ?? 'General'}</Text>
              </View>
              <Text variant="caption">{formatStudyDuration(entry.seconds)}</Text>
            </View>
            <ProgressBar progress={entry.seconds / max} color={color} height={6} />
          </View>
        );
      })}
    </View>
  );
}
