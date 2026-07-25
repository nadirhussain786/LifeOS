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
          <View className="h-14 flex-row items-end gap-1.5">
            {data.trend.map((value, index) => {
              // Today (the last bar) reads at full strength; earlier days sit
              // back at lower opacity so the eye lands on "now".
              const isToday = index === data.trend.length - 1;
              return (
                <View key={index} className="h-full flex-1 justify-end overflow-hidden rounded-md bg-muted">
                  <View
                    className="w-full rounded-md bg-accent"
                    style={{ height: `${Math.max(value * 100, 5)}%`, opacity: isToday ? 1 : 0.45 }}
                  />
                </View>
              );
            })}
          </View>
        </View>
      )}
    </WidgetCard>
  );
}
