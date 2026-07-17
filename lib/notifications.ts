import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** Shared local-notification primitives — every module's reminder feature
 * (Water, Habits, Tasks, Notes, Calendar Events, Journal) schedules through
 * these functions instead of each reimplementing permission handling and
 * trigger construction. */

/**
 * expo-notifications logs a hard ERROR the moment it's imported inside
 * Expo Go on Android (notification support was pulled from Expo Go in
 * SDK 53). The module is therefore loaded lazily and only outside that
 * environment — in Expo Go on Android every function here quietly no-ops
 * (returns null), and reminder settings screens can use this flag to tell
 * the user why. Everything works normally in a development build or
 * production app.
 */
export const notificationsAvailable = !(
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient
);

type NotificationsModule = typeof import('expo-notifications');

let cachedModule: NotificationsModule | null = null;

function getNotifications(): NotificationsModule | null {
  if (!notificationsAvailable) return null;
  // require() (not a static import) is the whole point here — a static import
  // would initialize the module in Expo Go on Android and trigger the ERROR.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (!cachedModule) cachedModule = require('expo-notifications') as NotificationsModule;
  return cachedModule;
}

/** Registers the foreground-presentation handler — without one,
 * notifications delivered while the app is open are suppressed. Called once
 * from the root layout; safe to call anywhere (no-ops in Expo Go Android). */
export function configureNotificationHandler(): void {
  const Notifications = getNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return requested.granted;
}

export async function cancelNotification(id: string | null | undefined): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications || !id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}

export async function cancelNotifications(ids: (string | null | undefined)[]): Promise<void> {
  await Promise.all(ids.map((id) => cancelNotification(id)));
}

/** One-time reminder at an exact future timestamp — task due dates, note
 * reminders, calendar events. Returns null (schedules nothing) if the time
 * has already passed or permission was denied, rather than throwing. */
export async function scheduleOneTimeNotification(params: { title: string; body: string; date: number }): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;

  if (params.date <= Date.now()) return null;
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  return Notifications.scheduleNotificationAsync({
    content: { title: params.title, body: params.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: params.date },
  });
}

/** Daily-repeating reminder at a fixed hour/minute — habits and the
 * journal's "write today" nudge. */
export async function scheduleDailyNotification(params: { title: string; body: string; hour: number; minute: number }): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  return Notifications.scheduleNotificationAsync({
    content: { title: params.title, body: params.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: params.hour, minute: params.minute },
  });
}
