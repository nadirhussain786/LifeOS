import { isToday } from 'date-fns';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { TodayWidget } from '@/features/widgets/components/today-widget';
import { WIDGET_NAME } from '@/features/widgets/config';
import {
  writeTodaySnapshot,
  type TodaySnapshot,
} from '@/features/widgets/services/widget-snapshot';
import { listHabitsWithToday } from '@/features/habits/services/habits-repository';
import { moduleMayBeNamed } from '@/features/notifications/services/notification-visibility';
import { listTasks } from '@/features/tasks/services/tasks-repository';
import { getDailyTotal } from '@/features/water-intake/services/water-intake-repository';
import { useWaterSettingsStore } from '@/features/water-intake/store/water-settings-store';
import { toDateKey } from '@/lib/date';
import i18n from '@/lib/i18n';
import { deviceLocale } from '@/lib/locale';

/**
 * Reads today's counts from the app's databases/stores. Runs only in the app's
 * JS context (where SQLite is available) — never from the headless widget task
 * handler. Each source is guarded so a not-yet-created table can't sink the
 * whole snapshot.
 *
 * Each row is also gated on its module, using the same rule as a lock-screen
 * reminder (`moduleMayBeNamed`): a module the operator has pulled, or one the
 * user has moved behind the vault, contributes nothing. A hidden row is not
 * read at all rather than read and then dropped — the count itself never
 * reaches the file the headless handler can see.
 */
export function buildTodaySnapshot(): TodaySnapshot {
  const show = {
    tasks: moduleMayBeNamed('tasks'),
    habits: moduleMayBeNamed('habits'),
    water: moduleMayBeNamed('water'),
  };

  let tasksDue = 0;
  let habitsLeft = 0;
  let waterMl = 0;

  if (show.tasks) {
    try {
      tasksDue = listTasks('active', 'due-date').filter(
        (t) => t.dueDate != null && isToday(t.dueDate),
      ).length;
    } catch {
      /* table not ready */
    }
  }
  if (show.habits) {
    try {
      habitsLeft = listHabitsWithToday().filter((h) => h.todayStatus === 'not_yet').length;
    } catch {
      /* table not ready */
    }
  }
  if (show.water) {
    try {
      waterMl = getDailyTotal(toDateKey(new Date()));
    } catch {
      /* table not ready */
    }
  }
  const waterGoalMl = show.water ? (useWaterSettingsStore.getState().goalMl ?? 2000) : 0;

  // Formatted here, in the app, because the headless task handler cannot safely
  // initialise i18next — see the `text` field's note in widget-snapshot.ts. Using
  // i18n.t with `count` also means real plural rules rather than the `=== 1`
  // ternary this used to render, which is wrong in Arabic and wrong at zero in
  // Urdu.
  const text = {
    heading: i18n.t('widget.today'),
    tasks: i18n.t('widget.tasksDue', { count: tasksDue }),
    habits: i18n.t('widget.habitsLeft', { count: habitsLeft }),
    water: i18n.t('widget.water', {
      current: formatLitres(waterMl),
      goal: formatLitres(waterGoalMl),
    }),
    empty: i18n.t('widget.openApp'),
  };

  return { tasksDue, habitsLeft, waterMl, waterGoalMl, show, text, updatedAt: Date.now() };
}

/** Litres to one decimal, in the device's locale — so a German phone reads
 *  "1,5 L" rather than "1.5 L". */
function formatLitres(ml: number): string {
  const litres = ml / 1000;
  try {
    return new Intl.NumberFormat(deviceLocale(), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(litres);
  } catch {
    return litres.toFixed(1);
  }
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
