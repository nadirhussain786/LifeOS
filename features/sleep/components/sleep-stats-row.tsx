import { Flame, Moon, Trophy, Waves } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { StatTile } from '@/components/ui/stat-tile';
import { formatDuration } from '@/features/sleep/services/sleep-stats';
import type { SleepStats } from '@/features/sleep/types/sleep.types';

const SLEEP_TINT = '#6366f1';

export function SleepStatsRow({ stats }: { stats: SleepStats }) {
  const { t } = useTranslation();
  const tiles = [
    {
      icon: Moon,
      label: t('sleep.avgPerNight'),
      value: formatDuration(stats.avgDurationMinutes),
      tint: SLEEP_TINT,
    },
    { icon: Flame, label: t('sleep.streak'), value: `${stats.currentStreak}`, tint: '#f97316' },
    { icon: Trophy, label: t('sleep.best'), value: `${stats.bestStreak}`, tint: '#eab308' },
    {
      icon: Waves,
      label: t('sleep.consistency'),
      value: `${Math.round(stats.consistency * 100)}%`,
      tint: '#22c55e',
    },
  ];

  return (
    <View className="flex-row gap-2.5">
      {tiles.map((tile, index) => (
        <StatTile
          key={tile.label}
          icon={tile.icon}
          value={tile.value}
          label={tile.label}
          tint={tile.tint}
          index={index}
        />
      ))}
    </View>
  );
}
