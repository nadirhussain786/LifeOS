import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@/features/auth/services/auth-store';
import * as repo from '@/features/split/services/split-repository';
import { notifyGroup } from '@/features/split/services/push-registration';
import { computeBalances, simplifyDebts, totalSpend } from '@/features/split/services/split-math';
import type {
  ExpenseGroup,
  GroupKind,
  MemberBalance,
  Transfer,
} from '@/features/split/types/split.types';

/** One cache namespace so a mutation can invalidate a whole group at once. */
export const splitKeys = {
  groups: ['split', 'groups'] as const,
  summaries: ['split', 'summaries'] as const,
  group: (id: string) => ['split', 'group', id] as const,
};

export function useGroups(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: splitKeys.groups,
    queryFn: repo.listGroups,
    enabled: options?.enabled ?? true,
  });
}

/** One group as the list screen shows it: identity, size, and where you stand. */
export type GroupSummary = {
  group: ExpenseGroup;
  memberCount: number;
  /** Positive: the group owes you. Negative: you owe it. Null: you aren't a
   *  member row yet (invited by email but not joined). */
  netCents: number | null;
  expenseCount: number;
  /** Up to three names, for the stacked avatars on the card. */
  memberNames: string[];
};

/**
 * The groups list, priced.
 *
 * "Am I up or down?" is the question this screen exists to answer, and it used
 * to answer it with the group's name and nothing else — you had to open each
 * group in turn to find out. The ledger arrives batched (see listGroupLedgers)
 * and the balances are computed with the same tested function the detail screen
 * uses, so the two can't drift.
 */
export function useGroupSummaries(options?: { enabled?: boolean }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const query = useQuery({
    queryKey: splitKeys.summaries,
    queryFn: repo.listGroupLedgers,
    enabled: options?.enabled ?? true,
  });

  const summaries = useMemo<GroupSummary[]>(() => {
    const data = query.data;
    if (!data) return [];

    const byGroup = <T extends { groupId: string }>(rows: T[]) => {
      const map = new Map<string, T[]>();
      for (const row of rows) map.set(row.groupId, [...(map.get(row.groupId) ?? []), row]);
      return map;
    };
    const members = byGroup(data.members);
    const expenses = byGroup(data.expenses);
    const settlements = byGroup(data.settlements);

    return data.groups.map((group) => {
      const groupMembers = members.get(group.id) ?? [];
      const groupExpenses = expenses.get(group.id) ?? [];
      const expenseIds = new Set(groupExpenses.map((e) => e.id));
      const balances = computeBalances(
        groupMembers.map((m) => m.id),
        groupExpenses,
        data.shares.filter((s) => expenseIds.has(s.expenseId)),
        settlements.get(group.id) ?? [],
      );
      const currentMembers = groupMembers.filter((m) => m.removedAt === null);
      const myMemberId = currentMembers.find((m) => m.userId === userId)?.id ?? null;

      return {
        group,
        memberCount: currentMembers.length,
        expenseCount: groupExpenses.length,
        netCents: myMemberId
          ? (balances.find((b) => b.memberId === myMemberId)?.netCents ?? 0)
          : null,
        memberNames: currentMembers
          .map((m) => m.displayName || m.email || '')
          .filter(Boolean)
          .slice(0, 3),
      };
    });
  }, [query.data, userId]);

  return { ...query, summaries };
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
      return {
        group,
        // Everyone who has ever been in the group. The balances need the full
        // set — see listMembers — while the pickers need only `activeMembers`.
        members,
        activeMembers: members.filter((m) => m.removedAt === null),
        expenses,
        shares,
        settlements,
        activity,
      };
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
    // Over ALL members, removed ones included: their share of the ledger does
    // not disappear when they leave, and the nets only sum to zero while every
    // party is counted.
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

/** Where the signed-in person stands in this group: their member row, whether
 *  they own it, and whether they are still in it at all. */
export function useMyMembership(data: ReturnType<typeof useGroupDetail>['data']) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  return useMemo(() => {
    const me = data?.members.find((m) => m.userId === userId) ?? null;
    return { me, isOwner: me?.role === 'owner', isMember: !!me && me.removedAt === null };
  }, [data, userId]);
}

// --- mutations -------------------------------------------------------------

export function useSplitMutations(groupId?: string) {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const { t } = useTranslation();
  // Composed here rather than in the edge function: the notification should
  // read in the SENDER's language only as a fallback — the recipient's device
  // cannot be localised from the server without storing their locale.
  const actor = profile?.displayName || profile?.username || t('split.someone');
  const notifyTitle = t('split.notifyTitle', { actor });
  const settlementBody = t('split.notifySettlement');

  /** Group data is shared, so a local write is not the whole truth — refetch
   *  rather than patching the cache by hand. */
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: splitKeys.groups });
    // The list screen prices every group, so any write to any group changes it.
    void queryClient.invalidateQueries({ queryKey: splitKeys.summaries });
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

  const invite = useMutation({
    mutationFn: (input: { memberId: string; email: string; groupName: string }) =>
      repo.sendInvite({ groupId: groupId!, ...input }),
    onSuccess: invalidate,
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => repo.removeMember(memberId),
    onSuccess: invalidate,
  });

  /** Owner-only, and soft: everyone else keeps the history. */
  const deleteGroup = useMutation({
    mutationFn: () => repo.deleteGroup(groupId!),
    onSuccess: invalidate,
  });

  const addExpense = useMutation({
    mutationFn: (input: Omit<Parameters<typeof repo.createExpense>[0], 'groupId'>) =>
      repo.createExpense({ groupId: groupId!, ...input }),
    onSuccess: (_id, input) => {
      invalidate();
      // Fire-and-forget: the expense is already saved, so a failed push must
      // not surface as a failed write.
      void notifyGroup({
        groupId: groupId!,
        title: notifyTitle,
        body: input.description,
      });
    },
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
    onSuccess: () => {
      invalidate();
      void notifyGroup({ groupId: groupId!, title: notifyTitle, body: settlementBody });
    },
  });

  return {
    createGroup,
    addMember,
    invite,
    removeMember,
    deleteGroup,
    addExpense,
    editExpense,
    removeExpense,
    settleUp,
  };
}
