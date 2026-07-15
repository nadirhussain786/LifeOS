import { TrendingUp } from 'lucide-react-native';
import { View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { WidgetCard } from '@/features/dashboard/components/widget-card';
import { useProductivitySummary } from '@/features/dashboard/hooks/use-widget-data';

export function ProductivitySummaryWidget() {
  const { data, isLoading } = useProductivitySummary();

  return (
    <WidgetCard icon={TrendingUp} title="This week">
      {isLoading || !data ? (
        <Skeleton className="h-14 w-full" />
      ) : (
        <View className="gap-3">
          <Text variant="muted">{Math.round(data.weeklyCompletionRate * 100)}% of tasks completed</Text>
          <View className="h-14 flex-row gap-1.5">
            {data.trend.map((value, index) => (
              <View key={index} className="h-full flex-1 justify-end overflow-hidden rounded-sm bg-muted">
                <View className="w-full rounded-sm bg-primary" style={{ height: `${value * 100}%` }} />
              </View>
            ))}
          </View>
        </View>
      )}
    </WidgetCard>
  );
}
