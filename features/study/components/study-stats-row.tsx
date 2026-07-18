import { CalendarRange, Clock, Flame, Sigma } from 'lucide-react-native';
import { View } from 'react-native';

import { StatTile } from '@/components/ui/stat-tile';
import { formatStudyDuration } from '@/features/study/services/study-stats';
import type { StudyStats } from '@/features/study/types/study.types';

const STUDY_TINT = '#8b5cf6';

export function StudyStatsRow({ stats }: { stats: StudyStats }) {
  const tiles = [
    { icon: CalendarRange, label: 'This week', value: formatStudyDuration(stats.weekSeconds), tint: STUDY_TINT },
    { icon: Flame, label: 'Streak', value: `${stats.currentStreak}d`, tint: '#f97316' },
    { icon: Clock, label: 'Sessions', value: `${stats.sessionCount}`, tint: '#0ea5e9' },
    { icon: Sigma, label: 'All time', value: formatStudyDuration(stats.totalSeconds), tint: '#22c55e' },
  ];

  return (
    <View className="flex-row gap-2.5">
      {tiles.map((tile, index) => (
        <StatTile key={tile.label} icon={tile.icon} value={tile.value} label={tile.label} tint={tile.tint} index={index} />
      ))}
    </View>
  );
}
