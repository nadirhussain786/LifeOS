import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuthStore } from '@/features/auth/services/auth-store';
import * as repo from '@/features/split/services/split-repository';
import { computeBalances, simplifyDebts, totalSpend } from '@/features/split/services/split-math';
import type { GroupKind, MemberBalance, Transfer } from '@/features/split/types/split.types';

/** One cache namespace so a mutation can invalidate a whole group at once. */
export const splitKeys = {
  groups: ['split', 'groups'] as const,
  group: (id: string) => ['split', 'group', id] as const,
};

export function useGroups(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: splitKeys.groups,
    queryFn: repo.listGroups,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Everything one group needs, in a single cache entry.
 *
 * Balances are derived here rather than stored, so they cannot drift from the
 * ledger they came from. Shares are fetched by expense id because a share
 * belongs to its expense, not directly to the group.
 */
export function useGroupDetail(groupId: string | undefined) {
  return useQuery({
    queryKey: splitKeys.group(groupId ?? ''),
    enabled: !!groupId,
    queryFn: async () => {
      const id = groupId!;
      const [group, members, expenses, settlements, activity] = await Promise.all([
        repo.getGroup(id),
        repo.listMembers(id),
        repo.listExpenses(id),
        repo.listSettlements(id),
        repo.listActivity(id),
      ]);
      const shares = await repo.listShares(expenses.map((e) => e.id));
      return { group, members, expenses, shares, settlements, activity };
    },
  });
}

/** Balances, suggested transfers and totals for a loaded group. */
export function useGroupBalances(data: ReturnType<typeof useGroupDetail>['data']): {
  balances: MemberBalance[];
  transfers: Transfer[];
  spendCents: number;
  /** The signed-in person's own position, if they are a member. */
  mine: MemberBalance | null;
} {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  return useMemo(() => {
    if (!data) return { balances: [], transfers: [], spendCents: 0, mine: null };
    const balances = computeBalances(
      data.members.map((m) => m.id),
      data.expenses,
      data.shares,
      data.settlements,
    );
    const myMemberId = data.members.find((m) => m.userId === userId)?.id ?? null;
    return {
      balances,
      transfers: simplifyDebts(balances),
      spendCents: totalSpend(data.expenses),
      mine: balances.find((b) => b.memberId === myMemberId) ?? null,
    };
  }, [data, userId]);
}

// --- mutations -------------------------------------------------------------

export function useSplitMutations(groupId?: string) {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  /** Group data is shared, so a local write is not the whole truth — refetch
   *  rather than patching the cache by hand. */
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: splitKeys.groups });
    if (groupId) void queryClient.invalidateQueries({ queryKey: splitKeys.group(groupId) });
  };

  const createGroup = useMutation({
    mutationFn: (input: { name: string; kind: GroupKind; currency: string }) =>
      repo.createGroup({ ...input, displayName: profile?.displayName ?? null }),
    onSuccess: invalidate,
  });

  const addMember = useMutation({
    mutationFn: (input: { email: string; displayName: string | null }) =>
      repo.addMemberByEmail({ groupId: groupId!, ...input }),
    onSuccess: invalidate,
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => repo.removeMember(memberId),
    onSuccess: invalidate,
  });

  const addExpense = useMutation({
    mutationFn: (input: Omit<Parameters<typeof repo.createExpense>[0], 'groupId'>) =>
      repo.createExpense({ groupId: groupId!, ...input }),
    onSuccess: invalidate,
  });

  const editExpense = useMutation({
    mutationFn: (input: Parameters<typeof repo.updateExpense>[0]) => repo.updateExpense(input),
    onSuccess: invalidate,
  });

  const removeExpense = useMutation({
    mutationFn: (expenseId: string) => repo.deleteExpense(expenseId),
    onSuccess: invalidate,
  });

  const settleUp = useMutation({
    mutationFn: (input: Omit<Parameters<typeof repo.recordSettlement>[0], 'groupId'>) =>
      repo.recordSettlement({ groupId: groupId!, ...input }),
    onSuccess: invalidate,
  });

  return { createGroup, addMember, removeMember, addExpense, editExpense, removeExpense, settleUp };
}
