import {
  Banknote,
  Bus,
  Clapperboard,
  CreditCard,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Landmark,
  PiggyBank,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import type { BudgetAccount, ExpenseCategoryId, IncomeCategoryId } from '@/features/budget/types/budget.types';

export type CategoryMeta<T extends string> = { id: T; label: string; icon: LucideIcon; tint: string };

/** Fixed expense catalog — each drives an icon + tint in lists and the donut. */
export const EXPENSE_CATEGORIES: CategoryMeta<ExpenseCategoryId>[] = [
  { id: 'food', label: 'Food', icon: Utensils, tint: '#f97316' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, tint: '#ec4899' },
  { id: 'gym', label: 'Gym', icon: Dumbbell, tint: '#ef4444' },
  { id: 'education', label: 'Education', icon: GraduationCap, tint: '#8b5cf6' },
  { id: 'entertainment', label: 'Fun', icon: Clapperboard, tint: '#a855f7' },
  { id: 'transport', label: 'Transport', icon: Bus, tint: '#0ea5e9' },
  { id: 'bills', label: 'Bills', icon: Receipt, tint: '#eab308' },
  { id: 'health', label: 'Health', icon: HeartPulse, tint: '#14b8a6' },
  { id: 'investment', label: 'Investment', icon: TrendingUp, tint: '#22c55e' },
  { id: 'others', label: 'Other', icon: CreditCard, tint: '#737373' },
];

export const INCOME_CATEGORIES: CategoryMeta<IncomeCategoryId>[] = [
  { id: 'salary', label: 'Salary', icon: Banknote, tint: '#22c55e' },
  { id: 'freelance', label: 'Freelance', icon: Wallet, tint: '#0ea5e9' },
  { id: 'gift', label: 'Gift', icon: PiggyBank, tint: '#ec4899' },
  { id: 'investment', label: 'Investment', icon: TrendingUp, tint: '#8b5cf6' },
  { id: 'other', label: 'Other', icon: CreditCard, tint: '#737373' },
];

export const ACCOUNTS: { id: BudgetAccount; label: string; icon: LucideIcon }[] = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'bank', label: 'Bank', icon: Landmark },
];

const EXPENSE_BY_ID = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c]));
const INCOME_BY_ID = new Map(INCOME_CATEGORIES.map((c) => [c.id, c]));

export function expenseCategoryMeta(id: string): CategoryMeta<ExpenseCategoryId> {
  return EXPENSE_BY_ID.get(id as ExpenseCategoryId) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

export function incomeCategoryMeta(id: string): CategoryMeta<IncomeCategoryId> {
  return INCOME_BY_ID.get(id as IncomeCategoryId) ?? INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1];
}

/** Resolves category icon + tint for any transaction type (savings has no
 * sub-category, so it uses a fixed piggy-bank identity). */
export function categoryMetaFor(type: string, categoryId: string): { label: string; icon: LucideIcon; tint: string } {
  if (type === 'income') return incomeCategoryMeta(categoryId);
  if (type === 'savings') return { label: 'Savings', icon: PiggyBank, tint: '#6366f1' };
  return expenseCategoryMeta(categoryId);
}

export const SAVINGS_COLORS = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#0ea5e9', '#8b5cf6'];
