import { and, desc, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/database/client';
import { budgetDebts } from '@/database/schema';
import { generateId } from '@/lib/id';
import { LOCAL_USER_ID } from '@/lib/local-user';
import { withStatus } from '@/features/budget/services/debt-status';
import type {
  CreateDebtInput,
  Debt,
  DebtTotals,
  DebtWithStatus,
  UpdateDebtInput,
} from '@/features/budget/types/budget.types';

function toDebt(row: typeof budgetDebts.$inferSelect): Debt {
  return {
    id: row.id,
    direction: row.direction,
    counterparty: row.counterparty,
    principalCents: row.principalCents,
    paidCents: row.paidCents,
    currency: row.currency,
    note: row.note,
    dueDate: row.dueDate,
    reminderDaysBefore: row.reminderDaysBefore,
    reminderNotificationId: row.reminderNotificationId,
    settledAt: row.settledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listDebts(): DebtWithStatus[] {
  return getDb()
    .select()
    .from(budgetDebts)
    .where(and(eq(budgetDebts.userId, LOCAL_USER_ID), isNull(budgetDebts.deletedAt)))
    .orderBy(desc(budgetDebts.createdAt))
    .all()
    .map((row) => withStatus(toDebt(row)));
}

export function getDebt(id: string): Debt | null {
  const row = getDb().select().from(budgetDebts).where(eq(budgetDebts.id, id)).get();
  return row ? toDebt(row) : null;
}

/** Sums outstanding balances across active (unsettled) debts. Amounts are
 * summed in raw cents — accurate for the common single-currency case; the UI
 * shows the user's main currency symbol on the totals. */
export function debtTotals(debts: DebtWithStatus[]): DebtTotals {
  let oweCents = 0;
  let owedCents = 0;
  let activeCount = 0;
  for (const d of debts) {
    if (d.isSettled) continue;
    activeCount += 1;
    if (d.direction === 'borrowed') oweCents += d.remainingCents;
    else owedCents += d.remainingCents;
  }
  return { oweCents, owedCents, netCents: owedCents - oweCents, activeCount };
}

export function createDebt(input: CreateDebtInput): Debt {
  const now = Date.now();
  const debt: Debt = {
    id: generateId(),
    direction: input.direction,
    counterparty: input.counterparty.trim(),
    principalCents: Math.round(input.principalCents),
    paidCents: 0,
    currency: input.currency,
    note: input.note ?? null,
    dueDate: input.dueDate ?? null,
    reminderDaysBefore: input.reminderDaysBefore ?? null,
    reminderNotificationId: null,
    settledAt: null,
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .insert(budgetDebts)
    .values({ ...debt, userId: LOCAL_USER_ID, syncStatus: 'pending' })
    .run();
  return debt;
}

export function updateDebt(id: string, input: UpdateDebtInput) {
  const patch: Record<string, unknown> = { ...input, updatedAt: Date.now(), syncStatus: 'pending' };
  if (input.principalCents !== undefined) patch.principalCents = Math.round(input.principalCents);
  if (input.paidCents !== undefined) patch.paidCents = Math.max(0, Math.round(input.paidCents));
  getDb().update(budgetDebts).set(patch).where(eq(budgetDebts.id, id)).run();
}

/** Adds a payment to a debt, auto-marking it settled once the balance is
 * cleared. Returns the fresh row so callers can re-sync its reminder. */
export function recordDebtPayment(id: string, amountCents: number): Debt | null {
  const debt = getDebt(id);
  if (!debt) return null;
  const paidCents = Math.min(debt.principalCents, debt.paidCents + Math.max(0, Math.round(amountCents)));
  const settledAt = paidCents >= debt.principalCents ? Date.now() : null;
  updateDebt(id, { paidCents, settledAt });
  return getDebt(id);
}

/** Marks a debt fully paid (paid = principal, settled now). */
export function settleDebt(id: string): Debt | null {
  const debt = getDebt(id);
  if (!debt) return null;
  updateDebt(id, { paidCents: debt.principalCents, settledAt: Date.now() });
  return getDebt(id);
}

/** Re-opens a settled debt back to its previous outstanding balance. */
export function reopenDebt(id: string): Debt | null {
  const debt = getDebt(id);
  if (!debt) return null;
  const paidCents = debt.paidCents >= debt.principalCents ? 0 : debt.paidCents;
  updateDebt(id, { paidCents, settledAt: null });
  return getDebt(id);
}

export function setDebtReminderNotificationId(id: string, notificationId: string | null) {
  getDb()
    .update(budgetDebts)
    .set({ reminderNotificationId: notificationId })
    .where(eq(budgetDebts.id, id))
    .run();
}

export function deleteDebt(id: string) {
  getDb()
    .update(budgetDebts)
    .set({ deletedAt: Date.now(), syncStatus: 'pending' })
    .where(eq(budgetDebts.id, id))
    .run();
}
