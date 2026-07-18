import { Clock, Star, Sunrise, TrendingDown, TrendingUp } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatStudyDuration, timeOfDayLabel } from '@/features/study/services/study-stats';
import { alpha } from '@/lib/color';
import type { StudyInsights } from '@/features/study/types/study.types';

const STUDY_TINT = '#8b5cf6';

/** A 2×2 grid of "how to improve" signals: when you focus best, typical
 * session length, focus quality, and momentum vs last week. */
export function StudyInsightsCard({ insights }: { insights: StudyInsights }) {
  const wow = insights.weekOverWeek;
  const wowUp = wow != null && wow >= 0;

  const tiles = [
    {
      key: 'best',
      icon: Sunrise,
      tint: '#f59e0b',
      label: 'You focus best in',
      value: insights.bestTimeOfDay ? timeOfDayLabel(insights.bestTimeOfDay) : '—',
    },
    {
      key: 'avg',
      icon: Clock,
      tint: STUDY_TINT,
      label: 'Typical session',
      value: insights.avgSessionSeconds > 0 ? formatStudyDuration(insights.avgSessionSeconds) : '—',
    },
    {
      key: 'focus',
      icon: Star,
      tint: '#eab308',
      label: 'Avg focus',
      value: insights.avgFocusRating != null ? `${insights.avgFocusRating.toFixed(1)}★` : 'Rate sessions',
    },
    {
      key: 'wow',
      icon: wowUp ? TrendingUp : TrendingDown,
      tint: wow == null ? '#6b7280' : wowUp ? '#22c55e' : '#ef4444',
      label: 'vs last week',
      value: wow == null ? 'New' : `${wowUp ? '+' : ''}${Math.round(wow * 100)}%`,
    },
  ];

  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      <Text variant="subheading">Insights</Text>
      <View className="flex-row flex-wrap gap-2.5">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <View key={tile.key} className="gap-1.5 rounded-2xl bg-muted p-3" style={{ width: '48%' }}>
              <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: alpha(tile.tint, 0.16) }}>
                <Icon size={16} color={tile.tint} />
              </View>
              <Text className="font-sora-bold text-foreground" numberOfLines={1}>
                {tile.value}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {tile.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
