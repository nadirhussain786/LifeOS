import { WIDGET_REGISTRY } from '@/features/dashboard/config/widget-registry';
import { DEFAULT_WIDGET_ORDER, useDashboardStore } from '@/features/dashboard/store/dashboard-store';

/**
 * Ordered list of {id, Component} ready to render — order is user-configurable
 * and persisted. Filters out any persisted id no longer in the registry (e.g.
 * a retired widget from an older build) and appends any new default widget
 * an existing install's persisted order predates, so introducing a widget id
 * doesn't silently hide it for users who already had a saved order.
 */
export function useDashboardWidgets() {
  const widgetOrder = useDashboardStore((state) => state.widgetOrder);
  const known = widgetOrder.filter((id) => id in WIDGET_REGISTRY);
  const missing = DEFAULT_WIDGET_ORDER.filter((id) => !known.includes(id));

  return [...known, ...missing].map((id) => ({ id, Component: WIDGET_REGISTRY[id] }));
}
