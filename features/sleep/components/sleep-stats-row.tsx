import { Flame, Moon, Trophy, Waves } from 'lucide-react-native';
import { View } from 'react-native';

import { StatTile } from '@/components/ui/stat-tile';
import { formatDuration } from '@/features/sleep/services/sleep-stats';
import type { SleepStats } from '@/features/sleep/types/sleep.types';

const SLEEP_TINT = '#6366f1';

export function SleepStatsRow({ stats }: { stats: SleepStats }) {
  const tiles = [
    { icon: Moon, label: 'Avg / night', value: formatDuration(stats.avgDurationMinutes), tint: SLEEP_TINT },
    { icon: Flame, label: 'Streak', value: `${stats.currentStreak}`, tint: '#f97316' },
    { icon: Trophy, label: 'Best', value: `${stats.bestStreak}`, tint: '#eab308' },
    { icon: Waves, label: 'Consistency', value: `${Math.round(stats.consistency * 100)}%`, tint: '#22c55e' },
  ];

  return (
    <View className="flex-row gap-2.5">
      {tiles.map((tile, index) => (
        <StatTile key={tile.label} icon={tile.icon} value={tile.value} label={tile.label} tint={tile.tint} index={index} />
      ))}
    </View>
  );
}
