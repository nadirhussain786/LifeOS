import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { WidgetId } from '@/features/dashboard/types/dashboard.types';

export const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  'today-tasks',
  'habit-row',
  'today-timeline',
  'reflect',
  'recent-notes',
  'water-intake',
  'productivity-summary',
  'daily-quote',
];

type DashboardState = {
  widgetOrder: WidgetId[];
  setWidgetOrder: (order: WidgetId[]) => void;
  resetWidgetOrder: () => void;
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      widgetOrder: DEFAULT_WIDGET_ORDER,
      setWidgetOrder: (order) => set({ widgetOrder: order }),
      resetWidgetOrder: () => set({ widgetOrder: DEFAULT_WIDGET_ORDER }),
    }),
    {
      name: 'dashboard-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
