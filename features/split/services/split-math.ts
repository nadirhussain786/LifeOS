import type {
  ExpenseShare,
  GroupExpense,
  MemberBalance,
  Settlement,
  SplitMode,
  Transfer,
} from '@/features/split/types/split.types';

/**
 * The arithmetic behind splitting. Pure and dependency-free so it can be tested
 * without a database — this is where money bugs live.
 *
 * Everything is integer cents. Splitting 10.00 three ways is 3.34 / 3.33 / 3.33,
 * which does not exist in floating point, so the division is materialised once
 * and stored rather than recomputed from a percentage on every read.
 */

/**
 * Divides `amountCents` across `memberIds` as evenly as integers allow.
 *
 * The remainder cannot be shared, so it goes one cent at a time to the earliest
 * members. That is deterministic and, crucially, the result always sums back to
 * the input — the database enforces exactly that invariant.
 */
export function splitEvenly(
  amountCents: number,
  memberIds: string[],
): { memberId: string; shareCents: number }[] {
  if (memberIds.length === 0) return [];

  const base = Math.floor(amountCents / memberIds.length);
  const remainder = amountCents - base * memberIds.length;

  return memberIds.map((memberId, index) => ({
    memberId,
    shareCents: base + (index < remainder ? 1 : 0),
  }));
}

/** Resolves a split description into concrete per-member cents. */
export function resolveSplit(
  amountCents: number,
  split: SplitMode,
): { memberId: string; shareCents: number }[] {
  if (split.mode === 'equal') return splitEvenly(amountCents, split.memberIds);
  return split.shares.map((s) => ({ memberId: s.memberId, shareCents: s.shareCents }));
}

/** True when a split adds up to the expense it belongs to. */
export function isBalancedSplit(amountCents: number, shares: { shareCents: number }[]): boolean {
  return shares.reduce((sum, s) => sum + s.shareCents, 0) === amountCents;
}

/**
 * Each member's position, derived from the ledger.
 *
 * net = what they fronted − what they consumed, then adjusted by cash already
 * moved: paying a settlement reduces what you owe, receiving one reduces what
 * you are owed. Across a whole group the nets always sum to zero, because every
 * expense's shares sum to its amount and every settlement has two sides.
 */
export function computeBalances(
  memberIds: string[],
  expenses: GroupExpense[],
  shares: ExpenseShare[],
  settlements: Settlement[],
): MemberBalance[] {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  const add = (map: Map<string, number>, key: string, amount: number) =>
    map.set(key, (map.get(key) ?? 0) + amount);

  const liveExpenseIds = new Set(expenses.map((e) => e.id));

  for (const expense of expenses) {
    add(paid, expense.paidByMemberId, expense.amountCents);
  }
  for (const share of shares) {
    // Shares of a deleted expense must not linger in anyone's total.
    if (!liveExpenseIds.has(share.expenseId)) continue;
    add(owed, share.memberId, share.shareCents);
  }

  const settledOut = new Map<string, number>();
  const settledIn = new Map<string, number>();
  for (const s of settlements) {
    add(settledOut, s.fromMemberId, s.amountCents);
    add(settledIn, s.toMemberId, s.amountCents);
  }

  return memberIds.map((memberId) => {
    const paidCents = paid.get(memberId) ?? 0;
    const owedCents = owed.get(memberId) ?? 0;
    const netCents =
      paidCents - owedCents + (settledOut.get(memberId) ?? 0) - (settledIn.get(memberId) ?? 0);
    return { memberId, paidCents, owedCents, netCents };
  });
}

/**
 * Fewest transfers that settle the group up.
 *
 * Greedy: repeatedly net the largest debtor against the largest creditor. That
 * clears at least one party per transfer, so it never needs more than n−1 of
 * them — far better than everyone paying everyone. It optimises for *few*
 * transfers, not for who-owes-whom, so the suggested payment may be to somebody
 * you never directly shared an expense with.
 */
export function simplifyDebts(balances: MemberBalance[]): Transfer[] {
  // Copy: this mutates as it consumes the balances.
  const creditors = balances
    .filter((b) => b.netCents > 0)
    .map((b) => ({ memberId: b.memberId, amount: b.netCents }))
    .sort((a, b) => b.amount - a.amount || a.memberId.localeCompare(b.memberId));
  const debtors = balances
    .filter((b) => b.netCents < 0)
    .map((b) => ({ memberId: b.memberId, amount: -b.netCents }))
    .sort((a, b) => b.amount - a.amount || a.memberId.localeCompare(b.memberId));

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.amount, debtor.amount);

    if (amount > 0) {
      transfers.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amountCents: amount,
      });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount === 0) ci++;
    if (debtor.amount === 0) di++;
  }

  return transfers;
}

/** Total spend of a group — what the whole set of expenses came to. */
export function totalSpend(expenses: GroupExpense[]): number {
  return expenses.reduce((sum, e) => sum + e.amountCents, 0);
}

/** What one member has consumed, i.e. the sum of their shares. */
export function memberSpend(memberId: string, balances: MemberBalance[]): number {
  return balances.find((b) => b.memberId === memberId)?.owedCents ?? 0;
}
