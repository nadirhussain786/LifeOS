import { setNoteReminderNotificationId } from '@/features/notes/services/notes-repository';
import { cancelNotification, scheduleOneTimeNotification } from '@/lib/notifications';
import type { Note } from '@/features/notes/types/note.types';

/** Cancels any previously-scheduled reminder and, if the note still wants
 * one, schedules a fresh one-time notification for it — called after every
 * create/update so the schedule can never drift from what's saved. */
export async function syncNoteReminder(note: Note): Promise<void> {
  await cancelNotification(note.reminderNotificationId);

  if (!note.reminderAt) {
    setNoteReminderNotificationId(note.id, null);
    return;
  }

  const id = await scheduleOneTimeNotification({
    title: note.title || 'Note reminder',
    body: 'Take a look at this note.',
    date: note.reminderAt,
    data: { category: 'notes', route: '/note/[id]', params: { id: note.id } },
  });
  setNoteReminderNotificationId(note.id, id);
}

export async function cancelNoteReminder(note: Pick<Note, 'id' | 'reminderNotificationId'>): Promise<void> {
  await cancelNotification(note.reminderNotificationId);
  setNoteReminderNotificationId(note.id, null);
}
