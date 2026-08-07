import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The small, denormalized snapshot the home-screen widget renders from.
 *
 * The widget's task handler runs in a headless JS context that can't reliably
 * open the SQLite database, so the app writes this snapshot to AsyncStorage
 * whenever the underlying data changes (see widget-data.tsx's syncTodayWidget)
 * and the handler just reads it back. This module is deliberately dependency-
 * free apart from AsyncStorage so it's safe to import from that headless
 * context — keep repository/expo imports out of it.
 */
export type TodaySnapshot = {
  tasksDue: number;
  habitsLeft: number;
  waterMl: number;
  waterGoalMl: number;
  /**
   * Which rows may be drawn at all.
   *
   * The home screen is the most exposed surface this app has — it is visible
   * without unlocking the phone on most launchers, to anyone who picks it up.
   * So the two switches that hide a module in the app have to reach out here
   * too, and the decision is baked into the snapshot rather than read at render
   * time: the widget's task handler runs headless, where the stores holding
   * those switches are not reliably available. The app context decides; the
   * handler only draws.
   */
  show: { tasks: boolean; habits: boolean; water: boolean };
  /** Epoch ms of the last write; 0 means the app has never synced yet. */
  updatedAt: number;
};

const STORAGE_KEY = 'lifeos.widget.today.v1';

/**
 * Also the fallback for a snapshot written before `show` existed, since the
 * read below spreads the stored object over this one. Everything defaults to
 * hidden, which is the safe direction for the upgrade: a user who had already
 * privatised a module stops leaking it the moment this build runs, rather than
 * on their next app launch. The cost is a widget that says "open LifeOS" until
 * then, which is honest — it genuinely does not know today's numbers yet.
 */
export const EMPTY_SNAPSHOT: TodaySnapshot = {
  tasksDue: 0,
  habitsLeft: 0,
  waterMl: 0,
  waterGoalMl: 2000,
  show: { tasks: false, habits: false, water: false },
  updatedAt: 0,
};

export async function writeTodaySnapshot(snapshot: TodaySnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => undefined);
}

export async function readTodaySnapshot(): Promise<TodaySnapshot> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_SNAPSHOT;
    return { ...EMPTY_SNAPSHOT, ...(JSON.parse(raw) as Partial<TodaySnapshot>) };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}
