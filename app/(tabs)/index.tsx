import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Fab } from '@/components/ui/fab';
import { DashboardHeader } from '@/features/dashboard/components/dashboard-header';
import { QuickActionsSheet } from '@/features/dashboard/components/quick-actions-sheet';
import { TodayFocusCard } from '@/features/dashboard/components/today-focus-card';
import { useDashboardWidgets } from '@/features/dashboard/hooks/use-dashboard-widgets';

export default function DashboardScreen() {
  const widgets = useDashboardWidgets();
  const queryClient = useQueryClient();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    setRefreshing(false);
  }, [queryClient]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-28"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <DashboardHeader />
        <TodayFocusCard />
        {widgets.map(({ id, Component }) => (
          <Component key={id} />
        ))}
      </ScrollView>

      <Fab onPress={() => sheetRef.current?.present()} />
      <QuickActionsSheet ref={sheetRef} />
    </View>
  );
}
