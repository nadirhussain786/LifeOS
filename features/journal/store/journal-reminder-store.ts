import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type JournalReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

export const DEFAULT_JOURNAL_REMINDER: JournalReminderSettings = {
  enabled: false,
  hour: 21,
  minute: 0,
};

type JournalReminderState = {
  settings: JournalReminderSettings;
  /** Id returned by expo-notifications for the currently-scheduled reminder,
   * kept so it can be cancelled before rescheduling with new settings. */
  scheduledNotificationId: string | null;
  setReminder: (settings: JournalReminderSettings, notificationId: string | null) => void;
};

export const useJournalReminderStore = create<JournalReminderState>()(
  persist(
    (set) => ({
      settings: DEFAULT_JOURNAL_REMINDER,
      scheduledNotificationId: null,
      setReminder: (settings, scheduledNotificationId) => set({ settings, scheduledNotificationId }),
    }),
    {
      name: 'journal-reminder-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
