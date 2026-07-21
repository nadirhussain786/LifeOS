import { isToday } from 'date-fns';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { TodayWidget } from '@/features/widgets/components/today-widget';
import { WIDGET_NAME } from '@/features/widgets/config';
import { writeTodaySnapshot, type TodaySnapshot } from '@/features/widgets/services/widget-snapshot';
import { listHabitsWithToday } from '@/features/habits/services/habits-repository';
import { listTasks } from '@/features/tasks/services/tasks-repository';
import { getDailyTotal } from '@/features/water-intake/services/water-intake-repository';
import { useWaterSettingsStore } from '@/features/water-intake/store/water-settings-store';
import { toDateKey } from '@/lib/date';

/**
 * Reads today's counts from the app's databases/stores. Runs only in the app's
 * JS context (where SQLite is available) — never from the headless widget task
 * handler. Each source is guarded so a not-yet-created table can't sink the
 * whole snapshot.
 */
export function buildTodaySnapshot(): TodaySnapshot {
  let tasksDue = 0;
  let habitsLeft = 0;
  let waterMl = 0;

  try {
    tasksDue = listTasks('active', 'due-date').filter((t) => t.dueDate != null && isToday(t.dueDate)).length;
  } catch {
    /* table not ready */
  }
  try {
    habitsLeft = listHabitsWithToday().filter((h) => h.todayStatus === 'not_yet').length;
  } catch {
    /* table not ready */
  }
  try {
    waterMl = getDailyTotal(toDateKey(new Date()));
  } catch {
    /* table not ready */
  }
  const waterGoalMl = useWaterSettingsStore.getState().goalMl ?? 2000;

  return { tasksDue, habitsLeft, waterMl, waterGoalMl, updatedAt: Date.now() };
}

/**
 * Recomputes the snapshot, persists it for the headless task handler, and pushes
 * an immediate re-render to any placed widget. Call on app launch and after
 * mutations that change today's counts. No-ops off Android (widgets are
 * Android-only here) — safe to call unconditionally.
 */
export async function syncTodayWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const snapshot = buildTodaySnapshot();
  await writeTodaySnapshot(snapshot);
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: () => <TodayWidget snapshot={snapshot} />,
    widgetNotFound: () => {
      // No widget placed on the home screen — the snapshot is still saved so
      // it's correct the moment the user adds one.
    },
  }).catch(() => undefined);
}
