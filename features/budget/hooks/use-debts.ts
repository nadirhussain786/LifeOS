import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { cancelDebtReminder, syncDebtReminder } from '@/features/budget/services/debt-reminders';
import {
  createDebt,
  debtTotals,
  deleteDebt,
  getDebt,
  listDebts,
  recordDebtPayment,
  reopenDebt,
  settleDebt,
  updateDebt,
} from '@/features/budget/services/debts-repository';
import type { CreateDebtInput, UpdateDebtInput } from '@/features/budget/types/budget.types';

export function useDebts() {
  const query = useQuery({ queryKey: ['budget', 'debts'], queryFn: async () => listDebts() });
  const debts = query.data ?? [];
  const totals = useMemo(() => debtTotals(debts), [debts]);
  return { ...query, debts, totals };
}

export function useDebtMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['budget'] });

  const addDebt = useMutation({
    mutationFn: async (input: CreateDebtInput) => {
      const debt = createDebt(input);
      await syncDebtReminder(debt);
      return debt;
    },
    onSuccess: invalidate,
  });

  const editDebt = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateDebtInput }) => {
      updateDebt(id, input);
      const debt = getDebt(id);
      if (debt) await syncDebtReminder(debt);
    },
    onSuccess: invalidate,
  });

  const addPayment = useMutation({
    mutationFn: async ({ id, amountCents }: { id: string; amountCents: number }) => {
      const debt = recordDebtPayment(id, amountCents);
      if (debt) await syncDebtReminder(debt);
    },
    onSuccess: invalidate,
  });

  const markSettled = useMutation({
    mutationFn: async (id: string) => {
      const debt = settleDebt(id);
      if (debt) await syncDebtReminder(debt);
    },
    onSuccess: invalidate,
  });

  const markReopened = useMutation({
    mutationFn: async (id: string) => {
      const debt = reopenDebt(id);
      if (debt) await syncDebtReminder(debt);
    },
    onSuccess: invalidate,
  });

  const removeDebt = useMutation({
    mutationFn: async (id: string) => {
      const debt = getDebt(id);
      if (debt) await cancelDebtReminder({ id: debt.id, reminderNotificationId: debt.reminderNotificationId });
      deleteDebt(id);
    },
    onSuccess: invalidate,
  });

  return { addDebt, editDebt, addPayment, markSettled, markReopened, removeDebt };
}
