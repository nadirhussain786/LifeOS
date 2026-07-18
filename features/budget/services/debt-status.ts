import { differenceInCalendarDays } from 'date-fns';

import type { Debt, DebtStatus, DebtWithStatus } from '@/features/budget/types/budget.types';

/** A debt is "due soon" once it's within this many days of its deadline. */
export const DUE_SOON_DAYS = 3;

/** Presets offered in the form for "remind me N days before the deadline". */
export const REMINDER_DAY_OPTIONS = [0, 1, 2, 3, 7];

/** Whole calendar days from today until the deadline. Negative = overdue,
 * 0 = due today. `null` when the debt has no deadline. */
export function daysUntil(dueDate: number | null, now = Date.now()): number | null {
  if (dueDate == null) return null;
  return differenceInCalendarDays(new Date(dueDate), new Date(now));
}

/** Derives remaining balance, progress, and a colour-coded status for a debt. */
export function withStatus(debt: Debt, now = Date.now()): DebtWithStatus {
  const remainingCents = Math.max(0, debt.principalCents - debt.paidCents);
  const isSettled = debt.settledAt != null || remainingCents === 0;
  const daysLeft = daysUntil(debt.dueDate, now);

  let status: DebtStatus;
  if (isSettled) status = 'settled';
  else if (daysLeft == null) status = 'no_date';
  else if (daysLeft < 0) status = 'overdue';
  else if (daysLeft <= DUE_SOON_DAYS) status = 'due_soon';
  else status = 'upcoming';

  const progress = debt.principalCents > 0 ? Math.min(1, debt.paidCents / debt.principalCents) : 0;

  return { ...debt, remainingCents, progress, isSettled, daysLeft, status };
}

/** Short human label for a debt's timing, e.g. "3 days left", "Overdue by 2
 * days", "Due today", "Settled". */
export function statusLabel(d: DebtWithStatus): string {
  if (d.isSettled) return 'Settled';
  if (d.daysLeft == null) return 'No deadline';
  if (d.daysLeft < 0) {
    const n = Math.abs(d.daysLeft);
    return `Overdue by ${n} day${n === 1 ? '' : 's'}`;
  }
  if (d.daysLeft === 0) return 'Due today';
  return `${d.daysLeft} day${d.daysLeft === 1 ? '' : 's'} left`;
}

/** Status → accent colour (matches the app's traffic-light convention). */
export function statusTint(status: DebtStatus): string {
  switch (status) {
    case 'overdue':
      return '#ef4444';
    case 'due_soon':
      return '#f59e0b';
    case 'settled':
      return '#22c55e';
    default:
      return '#6366f1';
  }
}
