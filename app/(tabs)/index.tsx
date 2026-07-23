import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Fab } from '@/components/ui/fab';
import { Text } from '@/components/ui/text';
import { WIDGET_REGISTRY } from '@/features/dashboard/config/widget-registry';
import { DashboardHeader } from '@/features/dashboard/components/dashboard-header';
import { FocusShortcuts } from '@/features/dashboard/components/focus-shortcuts';
import { QuickActionsSheet } from '@/features/dashboard/components/quick-actions-sheet';
import { TodayFocusCard } from '@/features/dashboard/components/today-focus-card';
import { MoodTile, WaterTile } from '@/features/dashboard/components/wellbeing-tiles';
import type { WidgetId } from '@/features/dashboard/types/dashboard.types';

/**
 * Widgets are grouped into three calm, scannable zones rather than stacked as
 * one long identical list — the hero answers "what now?", then Today holds the
 * active drivers, Wellbeing the gentle check-ins (as a 2-up row of compact
 * tiles, so size variation gives the screen rhythm), and For you the ambient
 * reads. Each widget carries its own module tint, so the screen reads alive
 * without any zone shouting. Any widget not placed in a section — nor handled
 * by the Wellbeing tiles — still renders under "More", so adding one to the
 * registry never silently hides it.
 */
const FULL_SECTIONS: { label: string; ids: WidgetId[] }[] = [
  { label: 'Today', ids: ['today-tasks', 'habit-row', 'today-timeline'] },
  { label: 'For you', ids: ['recent-notes', 'productivity-summary', 'daily-quote'] },
];
/** Rendered as the compact Wellbeing tiles instead of full-width widgets. */
const TILE_HANDLED: WidgetId[] = ['water-intake', 'reflect'];

/** A titled zone of full-width widgets pulled from the registry. */
function WidgetSection({ label, ids }: { label: string; ids: WidgetId[] }) {
  const items = ids.filter((id) => id in WIDGET_REGISTRY);
  if (items.length === 0) return null;
  return (
    <View className="gap-3">
      <Text variant="micro" className="px-1">
        {label}
      </Text>
      {items.map((id) => {
        const Component = WIDGET_REGISTRY[id];
        return <Component key={id} />;
      })}
    </View>
  );
}

export default function DashboardScreen() {
  const queryClient = useQueryClient();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    setRefreshing(false);
  }, [queryClient]);

  const placed = new Set<WidgetId>([...FULL_SECTIONS.flatMap((section) => section.ids), ...TILE_HANDLED]);
  const leftovers = (Object.keys(WIDGET_REGISTRY) as WidgetId[]).filter((id) => !placed.has(id));

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-28"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <DashboardHeader />
        <TodayFocusCard />
        <FocusShortcuts />

        <WidgetSection label="Today" ids={FULL_SECTIONS[0].ids} />

        <View className="gap-3">
          <Text variant="micro" className="px-1">
            Wellbeing
          </Text>
          <View className="flex-row gap-3">
            <WaterTile />
            <MoodTile />
          </View>
        </View>

        <WidgetSection label="For you" ids={FULL_SECTIONS[1].ids} />

        {leftovers.length > 0 ? <WidgetSection label="More" ids={leftovers} /> : null}
      </ScrollView>

      <Fab onPress={() => sheetRef.current?.present()} />
      <QuickActionsSheet ref={sheetRef} />
    </View>
  );
}
