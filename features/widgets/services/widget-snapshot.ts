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
  /** Epoch ms of the last write; 0 means the app has never synced yet. */
  updatedAt: number;
};

const STORAGE_KEY = 'lifeos.widget.today.v1';

export const EMPTY_SNAPSHOT: TodaySnapshot = {
  tasksDue: 0,
  habitsLeft: 0,
  waterMl: 0,
  waterGoalMl: 2000,
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
