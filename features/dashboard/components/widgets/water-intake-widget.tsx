import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { GlassWater } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { WidgetCard } from '@/features/dashboard/components/widget-card';
import { useWaterIntake } from '@/features/dashboard/hooks/use-widget-data';
import type { WaterIntakeData } from '@/features/dashboard/types/dashboard.types';

const INCREMENT_ML = 250;

export function WaterIntakeWidget() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useWaterIntake();

  const addWater = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    queryClient.setQueryData<WaterIntakeData>(['dashboard', 'water-intake'], (prev) =>
      prev ? { ...prev, currentMl: Math.min(prev.currentMl + INCREMENT_ML, prev.goalMl) } : prev,
    );
  };

  const progress = data ? Math.min(data.currentMl / data.goalMl, 1) : 0;

  return (
    <WidgetCard icon={GlassWater} title="Water intake">
      {isLoading || !data ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text variant="muted">
              {data.currentMl} / {data.goalMl} ml
            </Text>
            <Button label={`+${INCREMENT_ML}ml`} size="sm" variant="secondary" onPress={addWater} />
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-muted">
            <View className="h-full rounded-full bg-primary" style={{ width: `${progress * 100}%` }} />
          </View>
        </View>
      )}
    </WidgetCard>
  );
}
