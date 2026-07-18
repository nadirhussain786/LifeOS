import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createSavingsGoal,
  createTransaction,
  deleteSavingsGoal,
  deleteTransaction,
  updateBudgetSettings,
  updateSavingsGoal,
  updateTransaction,
} from '@/features/budget/services/budget-repository';
import type {
  BudgetSettings,
  CreateTransactionInput,
  SavingsGoal,
  UpdateTransactionInput,
} from '@/features/budget/types/budget.types';

export function useBudgetMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['budget'] });

  const addTransaction = useMutation({
    mutationFn: async (input: CreateTransactionInput) => createTransaction(input),
    onSuccess: invalidate,
  });

  const editTransaction = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTransactionInput }) => updateTransaction(id, input),
    onSuccess: invalidate,
  });

  const removeTransaction = useMutation({
    mutationFn: async (id: string) => deleteTransaction(id),
    onSuccess: invalidate,
  });

  const addSavingsGoal = useMutation({
    mutationFn: async ({
      name,
      targetCents,
      colorToken,
      deadline,
    }: {
      name: string;
      targetCents: number;
      colorToken: string;
      deadline: number | null;
    }) => createSavingsGoal(name, targetCents, colorToken, deadline),
    onSuccess: invalidate,
  });

  const editSavingsGoal = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<SavingsGoal, 'name' | 'targetCents' | 'deadline'>> }) =>
      updateSavingsGoal(id, patch),
    onSuccess: invalidate,
  });

  const removeSavingsGoal = useMutation({
    mutationFn: async (id: string) => deleteSavingsGoal(id),
    onSuccess: invalidate,
  });

  const saveSettings = useMutation({
    mutationFn: async (input: Partial<BudgetSettings>) => updateBudgetSettings(input),
    onSuccess: invalidate,
  });

  return {
    addTransaction,
    editTransaction,
    removeTransaction,
    addSavingsGoal,
    editSavingsGoal,
    removeSavingsGoal,
    saveSettings,
  };
}
