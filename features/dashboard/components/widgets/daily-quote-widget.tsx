import { Quote } from 'lucide-react-native';
import { View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { WidgetCard } from '@/features/dashboard/components/widget-card';
import { useDailyQuote } from '@/features/dashboard/hooks/use-widget-data';

export function DailyQuoteWidget() {
  const { data, isLoading } = useDailyQuote();

  return (
    <WidgetCard icon={Quote} title="Daily quote">
      {isLoading || !data ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <View className="gap-1">
          <Text variant="muted">&ldquo;{data.quote}&rdquo;</Text>
          <Text variant="caption">— {data.author}</Text>
        </View>
      )}
    </WidgetCard>
  );
}
