import { differenceInCalendarDays, format, isToday, isTomorrow } from 'date-fns';

export type DueState = 'overdue' | 'today' | 'soon' | 'later';

export type DueInfo = { label: string; state: DueState };

/** Humanizes a goal's due date into a short label + urgency state so the card
 * and detail screen render it (and color it) the same way. */
export function formatDueDate(dueDate: number): DueInfo {
  const date = new Date(dueDate);
  const days = differenceInCalendarDays(date, new Date());

  if (days < 0) {
    const overdueBy = Math.abs(days);
    return { label: overdueBy === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueBy} days`, state: 'overdue' };
  }
  if (isToday(date)) return { label: 'Due today', state: 'today' };
  if (isTomorrow(date)) return { label: 'Due tomorrow', state: 'soon' };
  if (days <= 7) return { label: `Due in ${days} days`, state: 'soon' };
  return { label: `Due ${format(date, 'MMM d')}`, state: 'later' };
}

export function formatProgressPercent(progress: number): string {
  return `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`;
}
