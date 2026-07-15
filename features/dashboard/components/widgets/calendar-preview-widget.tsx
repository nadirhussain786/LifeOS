import { useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { WidgetCard } from '@/features/dashboard/components/widget-card';
import { WidgetEmptyState } from '@/features/dashboard/components/widget-empty-state';
import { useCalendarPreview } from '@/features/dashboard/hooks/use-widget-data';

const DOT_CLASS: Record<string, string> = {
  primary: 'bg-primary',
  muted: 'bg-muted-foreground',
  destructive: 'bg-destructive',
};

export function CalendarPreviewWidget() {
  const router = useRouter();
  const { data, isLoading } = useCalendarPreview();

  return (
    <WidgetCard
      icon={CalendarDays}
      title="Today's schedule"
      actionLabel="Open calendar"
      onActionPress={() => router.push('/(tabs)/calendar')}
    >
      {isLoading || !data ? (
        <View className="gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </View>
      ) : data.events.length === 0 ? (
        <WidgetEmptyState message="Nothing scheduled today" />
      ) : (
        <View className="gap-2.5">
          {data.events.map((event) => (
            <View key={event.id} className="flex-row items-center gap-2.5">
              <View className={`h-2 w-2 rounded-full ${DOT_CLASS[event.colorToken]}`} />
              <Text className="flex-1">{event.title}</Text>
              <Text variant="caption">{event.timeLabel}</Text>
            </View>
          ))}
        </View>
      )}
    </WidgetCard>
  );
}
