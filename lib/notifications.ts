import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import {
  deleteLogByNotificationId,
  logScheduledNotification,
} from '@/features/notifications/services/notification-log-repository';
import { shiftDailyOutOfQuietHours, shiftTimestampOutOfQuietHours } from '@/features/notifications/services/quiet-hours';
import { isCategoryEnabled, useNotificationsStore } from '@/features/notifications/store/notifications-store';
import { CATEGORY_META, type NotificationCategory, type NotificationPayload } from '@/features/notifications/types/notification.types';
import { generateId } from '@/lib/id';

/** Shared local-notification primitives — every module's reminder feature
 * (Water, Habits, Tasks, Notes, Calendar Events, Journal, Sleep, Budget)
 * schedules through these functions instead of each reimplementing permission
 * handling and trigger construction.
 *
 * These functions are the single choke point for the app-wide notification
 * policy: a `data` payload tagging the notification's {@link NotificationPayload}
 * category + deep-link route flows through every call, and when present the
 * primitives enforce the master/per-category switches and quiet hours, record
 * the reminder in the in-app inbox (notification_log), and embed the deep-link
 * so a tap lands on the right screen. Callers that pass no `data` get the
 * original raw behaviour (no gating, no logging) for backwards compatibility. */

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

/** Android notification channels. Android groups notifications by channel and
 * lets the user tune importance/sound per channel in system settings, so we
 * split by urgency: time-critical reminders get a heads-up (HIGH) channel,
 * everyday nudges a quieter DEFAULT one, and the morning digest its own. iOS
 * ignores channels. */
const CHANNELS = {
  timeSensitive: 'lifeos-time-sensitive',
  reminders: 'lifeos-reminders',
  digest: 'lifeos-digest',
} as const;

/** Maps a category to its channel: the digest to its own, time-critical
 * categories (bypassQuietHours) to the heads-up channel, everything else to the
 * default reminders channel. Untagged calls use the default channel. */
function channelForCategory(category?: NotificationCategory): string {
  if (!category) return CHANNELS.reminders;
  if (category === 'digest') return CHANNELS.digest;
  return CATEGORY_META[category].bypassQuietHours ? CHANNELS.timeSensitive : CHANNELS.reminders;
}

/** Creates the Android notification channels. Safe to call every launch
 * (idempotent) and on any platform (no-ops off Android / in Expo Go Android). */
export async function configureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = getNotifications();
  if (!Notifications) return;

  const accent = '#6366f1';
  await Notifications.setNotificationChannelAsync(CHANNELS.timeSensitive, {
    name: 'Time-sensitive',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: accent,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.reminders, {
    name: 'Reminders & nudges',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: accent,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.digest, {
    name: 'Daily digest',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: accent,
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

export async function hasNotificationPermission(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  const existing = await Notifications.getPermissionsAsync();
  return existing.granted;
}

export async function cancelNotification(id: string | null | undefined): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications || !id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  // Keep the inbox in lock-step with what's actually queued.
  deleteLogByNotificationId(id);
}

export async function cancelNotifications(ids: (string | null | undefined)[]): Promise<void> {
  await Promise.all(ids.map((id) => cancelNotification(id)));
}

/** Guard shared by both schedulers. Skips scheduling when the master switch or
 * the notification's category is off, AND — in "smart digest" delivery mode —
 * when the category is a non-time-critical nudge that gets folded into the
 * morning digest instead of pinging on its own. Time-critical categories
 * (bypassQuietHours: due tasks, calendar events, money, bedtime) always fire.
 * The digest itself is exempt. Untagged calls (no payload) always pass. */
function passesCategoryGate(payload?: NotificationPayload): boolean {
  const category = payload?.category;
  if (!category) return true;
  if (!isCategoryEnabled(category)) return false;

  const { deliveryMode } = useNotificationsStore.getState();
  if (deliveryMode === 'digest' && category !== 'digest' && !CATEGORY_META[category].bypassQuietHours) {
    return false;
  }
  return true;
}

function nextDailyOccurrence(hour: number, minute: number): number {
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next.getTime();
}

/** One-time reminder at an exact future timestamp — task due dates, note
 * reminders, calendar events. Returns null (schedules nothing) if the time
 * has already passed, the category is switched off, or permission was denied,
 * rather than throwing. */
export async function scheduleOneTimeNotification(params: {
  title: string;
  body: string;
  date: number;
  data?: NotificationPayload;
}): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;
  if (!passesCategoryGate(params.data)) return null;

  const category = params.data?.category;
  let triggerAt = params.date;
  if (category && !CATEGORY_META[category].bypassQuietHours) {
    triggerAt = shiftTimestampOutOfQuietHours(triggerAt);
  }
  if (triggerAt <= Date.now()) return null;

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  // Generate the inbox row id up front so it can ride inside the payload — a
  // tap then marks exactly this row read. The row is written after scheduling
  // succeeds, once the OS notification id is known.
  const logId = params.data?.category ? generateId() : undefined;
  const data = params.data ? { ...params.data, ...(logId ? { logId } : {}) } : {};

  const scheduleId = await Notifications.scheduleNotificationAsync({
    content: { title: params.title, body: params.body, data },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerAt, channelId: channelForCategory(category) },
  });

  if (params.data?.category) {
    logScheduledNotification({
      id: logId,
      notificationId: scheduleId,
      category: params.data.category,
      title: params.title,
      body: params.body,
      route: params.data.route,
      params: params.data.params,
      scheduledAt: triggerAt,
      repeats: 'none',
    });
  }
  return scheduleId;
}

/** Daily-repeating reminder at a fixed hour/minute — habits, hydration, the
 * journal nudge, bedtime. Shifts out of quiet hours unless the category is
 * exempt. */
export async function scheduleDailyNotification(params: {
  title: string;
  body: string;
  hour: number;
  minute: number;
  data?: NotificationPayload;
}): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;
  if (!passesCategoryGate(params.data)) return null;

  const category = params.data?.category;
  let { hour, minute } = params;
  if (category && !CATEGORY_META[category].bypassQuietHours) {
    ({ hour, minute } = shiftDailyOutOfQuietHours(hour, minute));
  }

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const scheduledAt = nextDailyOccurrence(hour, minute);
  const logId = params.data?.category ? generateId() : undefined;
  const data = params.data ? { ...params.data, ...(logId ? { logId } : {}) } : {};

  const scheduleId = await Notifications.scheduleNotificationAsync({
    content: { title: params.title, body: params.body, data },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: channelForCategory(category) },
  });

  if (params.data?.category) {
    logScheduledNotification({
      id: logId,
      notificationId: scheduleId,
      category: params.data.category,
      title: params.title,
      body: params.body,
      route: params.data.route,
      params: params.data.params,
      scheduledAt,
      repeats: 'daily',
    });
  }
  return scheduleId;
}

/** Cancels every LifeOS-scheduled notification and clears their inbox rows —
 * the true kill switch behind the master toggle, so turning notifications off
 * silences already-queued reminders too, not just future scheduling. No-ops in
 * Expo Go Android. */
export async function cancelAllScheduled(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(scheduled.map((n) => cancelNotification(n.identifier)));
}

/** Subscribes to notification taps. Returns an unsubscribe fn (or a no-op in
 * Expo Go Android). The handler receives the {@link NotificationPayload}. */
export function addNotificationResponseListener(handler: (payload: NotificationPayload) => void): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return () => undefined;
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handler((response.notification.request.content.data ?? {}) as NotificationPayload);
  });
  return () => sub.remove();
}

/** Cancels every OS-queued notification belonging to a category (matched via
 * its data payload) and clears their inbox rows. Used when a category is
 * switched off, or when switching to digest delivery folds a nudge category
 * into the morning summary, so already-queued reminders stop firing without
 * waiting for each owning item to re-sync. No-ops in Expo Go Android. */
export async function cancelScheduledInCategory(category: NotificationCategory): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as NotificationPayload | undefined)?.category === category)
      .map((n) => cancelNotification(n.identifier)),
  );
}

/** The tap that cold-started the app, if any — checked once on mount so a
 * notification opened from a killed state still deep-links. */
export async function getLastNotificationResponse(): Promise<NotificationPayload | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  return (response.notification.request.content.data ?? {}) as NotificationPayload;
}
