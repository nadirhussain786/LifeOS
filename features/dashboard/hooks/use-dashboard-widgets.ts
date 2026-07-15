import { WIDGET_REGISTRY } from '@/features/dashboard/config/widget-registry';
import { useDashboardStore } from '@/features/dashboard/store/dashboard-store';

/** Ordered list of {id, Component} ready to render — order is user-configurable and persisted. */
export function useDashboardWidgets() {
  const widgetOrder = useDashboardStore((state) => state.widgetOrder);

  return widgetOrder.map((id) => ({ id, Component: WIDGET_REGISTRY[id] }));
}
