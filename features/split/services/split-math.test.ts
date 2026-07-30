import {
  computeBalances,
  isBalancedSplit,
  simplifyDebts,
  splitEvenly,
  totalSpend,
} from './split-math';
import type {
  ExpenseShare,
  GroupExpense,
  MemberBalance,
  Settlement,
} from '@/features/split/types/split.types';

const expense = (id: string, paidByMemberId: string, amountCents: number): GroupExpense => ({
  id,
  groupId: 'g1',
  paidByMemberId,
  description: id,
  amountCents,
  currency: 'USD',
  spentAt: 0,
  note: null,
  createdBy: null,
  createdAt: 0,
  updatedAt: 0,
});

const share = (expenseId: string, memberId: string, shareCents: number): ExpenseShare => ({
  id: `${expenseId}:${memberId}`,
  expenseId,
  memberId,
  shareCents,
});

const settlement = (fromMemberId: string, toMemberId: string, amountCents: number): Settlement => ({
  id: `${fromMemberId}->${toMemberId}`,
  groupId: 'g1',
  fromMemberId,
  toMemberId,
  amountCents,
  currency: 'USD',
  settledAt: 0,
  note: null,
  createdBy: null,
});

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

describe('splitEvenly', () => {
  it('divides evenly when it divides evenly', () => {
    expect(splitEvenly(900, ['a', 'b', 'c'])).toEqual([
      { memberId: 'a', shareCents: 300 },
      { memberId: 'b', shareCents: 300 },
      { memberId: 'c', shareCents: 300 },
    ]);
  });

  it('gives the indivisible remainder to the earliest members', () => {
    // 10.00 three ways is the canonical case: 3.34 / 3.33 / 3.33.
    expect(splitEvenly(1000, ['a', 'b', 'c'])).toEqual([
      { memberId: 'a', shareCents: 334 },
      { memberId: 'b', shareCents: 333 },
      { memberId: 'c', shareCents: 333 },
    ]);
  });

  it('always sums back to the original amount', () => {
    // The database enforces this invariant, so a violation here is a failed write.
    for (const amount of [1, 2, 7, 99, 100, 101, 1000, 1234, 99999, 100000]) {
      for (const size of [1, 2, 3, 4, 5, 6, 7, 11, 13]) {
        const members = Array.from({ length: size }, (_, i) => `m${i}`);
        const shares = splitEvenly(amount, members);
        expect(sum(shares.map((s) => s.shareCents))).toBe(amount);
      }
    }
  });

  it('spreads the remainder by at most one cent per member', () => {
    const shares = splitEvenly(1000, ['a', 'b', 'c']).map((s) => s.shareCents);
    expect(Math.max(...shares) - Math.min(...shares)).toBe(1);
  });

  it('handles amounts smaller than the member count', () => {
    // 2 cents between 5 people: two get a cent, nobody gets a fraction.
    const shares = splitEvenly(2, ['a', 'b', 'c', 'd', 'e']);
    expect(sum(shares.map((s) => s.shareCents))).toBe(2);
    expect(shares.filter((s) => s.shareCents === 1)).toHaveLength(2);
  });

  it('returns nothing for an empty group rather than dividing by zero', () => {
    expect(splitEvenly(1000, [])).toEqual([]);
  });
});

describe('isBalancedSplit', () => {
  it('accepts a split that adds up and rejects one that does not', () => {
    expect(
      isBalancedSplit(1000, [{ shareCents: 334 }, { shareCents: 333 }, { shareCents: 333 }]),
    ).toBe(true);
    expect(
      isBalancedSplit(1000, [{ shareCents: 333 }, { shareCents: 333 }, { shareCents: 333 }]),
    ).toBe(false);
  });
});

describe('computeBalances', () => {
  it('credits the payer and debits the consumers', () => {
    // Ali pays 30.00 for dinner, split three ways.
    const balances = computeBalances(
      ['ali', 'sara', 'omar'],
      [expense('e1', 'ali', 3000)],
      [share('e1', 'ali', 1000), share('e1', 'sara', 1000), share('e1', 'omar', 1000)],
      [],
    );
    expect(balances).toEqual([
      { memberId: 'ali', paidCents: 3000, owedCents: 1000, netCents: 2000 },
      { memberId: 'sara', paidCents: 0, owedCents: 1000, netCents: -1000 },
      { memberId: 'omar', paidCents: 0, owedCents: 1000, netCents: -1000 },
    ]);
  });

  it('always nets to zero across the group', () => {
    const balances = computeBalances(
      ['ali', 'sara', 'omar'],
      [expense('e1', 'ali', 3000), expense('e2', 'sara', 1000), expense('e3', 'omar', 1)],
      [
        ...splitEvenly(3000, ['ali', 'sara', 'omar']).map((s) =>
          share('e1', s.memberId, s.shareCents),
        ),
        ...splitEvenly(1000, ['ali', 'sara']).map((s) => share('e2', s.memberId, s.shareCents)),
        ...splitEvenly(1, ['ali', 'sara', 'omar']).map((s) =>
          share('e3', s.memberId, s.shareCents),
        ),
      ],
      [settlement('sara', 'ali', 500)],
    );
    expect(sum(balances.map((b) => b.netCents))).toBe(0);
  });

  it('moves the balance when a settlement is paid', () => {
    const expenses = [expense('e1', 'ali', 1000)];
    const shares = [share('e1', 'ali', 500), share('e1', 'sara', 500)];

    const before = computeBalances(['ali', 'sara'], expenses, shares, []);
    expect(before.find((b) => b.memberId === 'sara')!.netCents).toBe(-500);

    // Sara pays Ali back in full: both should land on zero.
    const after = computeBalances(['ali', 'sara'], expenses, shares, [
      settlement('sara', 'ali', 500),
    ]);
    expect(after.find((b) => b.memberId === 'sara')!.netCents).toBe(0);
    expect(after.find((b) => b.memberId === 'ali')!.netCents).toBe(0);
  });

  it('ignores shares whose expense has been deleted', () => {
    // The share rows are still present but the expense is gone; a stale share
    // must not keep charging somebody for something that no longer exists.
    const balances = computeBalances(
      ['ali', 'sara'],
      [],
      [share('deleted', 'ali', 500), share('deleted', 'sara', 500)],
      [],
    );
    expect(balances.every((b) => b.owedCents === 0 && b.netCents === 0)).toBe(true);
  });

  it('reports members who have neither paid nor consumed', () => {
    const balances = computeBalances(
      ['ali', 'newcomer'],
      [expense('e1', 'ali', 100)],
      [share('e1', 'ali', 100)],
      [],
    );
    expect(balances.find((b) => b.memberId === 'newcomer')).toEqual({
      memberId: 'newcomer',
      paidCents: 0,
      owedCents: 0,
      netCents: 0,
    });
  });
});

describe('simplifyDebts', () => {
  const balance = (memberId: string, netCents: number): MemberBalance => ({
    memberId,
    paidCents: 0,
    owedCents: 0,
    netCents,
  });

  /** Applying the transfers must bring every member to zero. */
  const settleAll = (balances: MemberBalance[]) => {
    const net = new Map(balances.map((b) => [b.memberId, b.netCents]));
    for (const t of simplifyDebts(balances)) {
      net.set(t.fromMemberId, (net.get(t.fromMemberId) ?? 0) + t.amountCents);
      net.set(t.toMemberId, (net.get(t.toMemberId) ?? 0) - t.amountCents);
    }
    return [...net.values()];
  };

  it('settles a simple two-person debt in one transfer', () => {
    expect(simplifyDebts([balance('ali', 1000), balance('sara', -1000)])).toEqual([
      { fromMemberId: 'sara', toMemberId: 'ali', amountCents: 1000 },
    ]);
  });

  it('zeroes everyone out', () => {
    expect(settleAll([balance('a', 2500), balance('b', -1000), balance('c', -1500)])).toEqual([
      0, 0, 0,
    ]);
  });

  it('needs at most n-1 transfers', () => {
    const balances = [
      balance('a', 5000),
      balance('b', 3000),
      balance('c', -2000),
      balance('d', -2500),
      balance('e', -3500),
    ];
    expect(simplifyDebts(balances).length).toBeLessThanOrEqual(balances.length - 1);
    expect(settleAll(balances).every((n) => n === 0)).toBe(true);
  });

  it('handles the odd cent left by an uneven split', () => {
    // 1000 three ways leaves someone a cent heavier.
    const balances = [balance('a', 667), balance('b', -334), balance('c', -333)];
    expect(settleAll(balances).every((n) => n === 0)).toBe(true);
  });

  it('produces nothing when everyone is square', () => {
    expect(simplifyDebts([balance('a', 0), balance('b', 0)])).toEqual([]);
  });

  it('never suggests a zero-value transfer', () => {
    const transfers = simplifyDebts([balance('a', 100), balance('b', 0), balance('c', -100)]);
    expect(transfers.every((t) => t.amountCents > 0)).toBe(true);
  });
});

describe('totalSpend', () => {
  it('sums every expense', () => {
    expect(totalSpend([expense('e1', 'a', 1000), expense('e2', 'b', 250)])).toBe(1250);
  });

  it('is zero for a new group', () => {
    expect(totalSpend([])).toBe(0);
  });
});

/**
 * Removing somebody from a group is a tombstone, not a deletion — and the
 * balances have to keep counting them.
 *
 * The bug these lock down: `listMembers` filtered `deleted_at is null`, and
 * balances are computed only for the members it returned. So a removed member's
 * spending left the ledger while everything they had paid FOR stayed in it.
 * A £100 dinner paid by Alice and split four ways became Bob, Carol and Dave
 * owing £25 each, nobody owed anything, the nets summing to −£75, and
 * `simplifyDebts` returning NO transfers at all — "Settle up" declaring the
 * group square over three live debts.
 */
describe('members who have left the group', () => {
  const dinner = [expense('e1', 'alice', 10000)];
  const shares = [
    share('e1', 'alice', 2500),
    share('e1', 'bob', 2500),
    share('e1', 'carol', 2500),
    share('e1', 'dave', 2500),
  ];
  const everyone = ['alice', 'bob', 'carol', 'dave'];

  it('still balances to zero when the payer has been removed', () => {
    const balances = computeBalances(everyone, dinner, shares, []);
    expect(balances.reduce((sum, b) => sum + b.netCents, 0)).toBe(0);
  });

  it('keeps what a removed member is owed', () => {
    const balances = computeBalances(everyone, dinner, shares, []);
    expect(balances.find((b) => b.memberId === 'alice')?.netCents).toBe(7500);
  });

  it('still produces the transfers that clear the group', () => {
    const transfers = simplifyDebts(computeBalances(everyone, dinner, shares, []));
    expect(transfers).toHaveLength(3);
    expect(transfers.every((t) => t.toMemberId === 'alice')).toBe(true);
    expect(transfers.reduce((sum, t) => sum + t.amountCents, 0)).toBe(7500);
  });

  it('loses money if the removed member is dropped from the list — the old bug', () => {
    // Kept as an executable description of WHY the member list must include
    // tombstoned rows. If this ever stops holding, the filter came back.
    const withoutAlice = computeBalances(['bob', 'carol', 'dave'], dinner, shares, []);
    expect(withoutAlice.reduce((sum, b) => sum + b.netCents, 0)).toBe(-7500);
    expect(simplifyDebts(withoutAlice)).toEqual([]);
  });

  it('settles a removed member the same way as anyone else', () => {
    const settlements: Settlement[] = [
      {
        id: 's1',
        groupId: 'g1',
        fromMemberId: 'bob',
        toMemberId: 'alice',
        amountCents: 2500,
        currency: 'USD',
        settledAt: 0,
        note: null,
        createdBy: null,
      },
    ];
    const balances = computeBalances(everyone, dinner, shares, settlements);
    expect(balances.find((b) => b.memberId === 'bob')?.netCents).toBe(0);
    expect(balances.find((b) => b.memberId === 'alice')?.netCents).toBe(5000);
    expect(balances.reduce((sum, b) => sum + b.netCents, 0)).toBe(0);
  });
});
