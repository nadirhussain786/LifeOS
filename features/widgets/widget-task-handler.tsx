import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { TodayWidget } from '@/features/widgets/components/today-widget';
import { WIDGET_NAME } from '@/features/widgets/config';
import { readTodaySnapshot } from '@/features/widgets/services/widget-snapshot';

/**
 * Runs in a headless JS context whenever the OS needs the widget rendered —
 * when it's first placed (WIDGET_ADDED), on the periodic updatePeriodMillis
 * tick (WIDGET_UPDATE), and on resize. It reads the snapshot the app last wrote
 * (SQLite isn't reliably available here) and renders from it. Immediate updates
 * after in-app changes come from syncTodayWidget's requestWidgetUpdate instead.
 * Taps are handled natively via the widget's OPEN_APP clickAction.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const snapshot = await readTodaySnapshot();
      props.renderWidget(<TodayWidget snapshot={snapshot} />);
      break;
    }
    default:
      break;
  }
}
