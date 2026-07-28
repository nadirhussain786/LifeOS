import {
  Briefcase,
  Dumbbell,
  GraduationCap,
  Sparkles,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import type { TFunction } from 'i18next';

import type { GoalCategory, GoalPriority } from '@/features/goals/types/goal.types';

export type GoalCategoryMeta = {
  id: GoalCategory;
  labelKey: string;
  icon: LucideIcon;
  /** Identity tint, readable on both light and dark cards. */
  tint: string;
};

/**
 * Goal categories carry their own icon + tint so a goal reads at a glance in
 * the list without a color chip. 'custom' is the escape hatch — its label
 * comes from the goal's categoryLabel and it borrows the neutral brand accent.
 */
export const GOAL_CATEGORIES: GoalCategoryMeta[] = [
  { id: 'fitness', labelKey: 'goalCategory.fitness', icon: Dumbbell, tint: '#f97316' },
  { id: 'study', labelKey: 'goalCategory.study', icon: GraduationCap, tint: '#8b5cf6' },
  { id: 'finance', labelKey: 'goalCategory.finance', icon: Wallet, tint: '#22c55e' },
  { id: 'career', labelKey: 'goalCategory.career', icon: Briefcase, tint: '#0ea5e9' },
  { id: 'personal', labelKey: 'goalCategory.personal', icon: Sparkles, tint: '#ec4899' },
  { id: 'custom', labelKey: 'goalCategory.custom', icon: Target, tint: '#14b8a6' },
];

const CATEGORY_BY_ID = new Map(GOAL_CATEGORIES.map((category) => [category.id, category]));

export function goalCategoryMeta(id: GoalCategory): GoalCategoryMeta {
  return CATEGORY_BY_ID.get(id) ?? GOAL_CATEGORIES[GOAL_CATEGORIES.length - 1];
}

/** Resolves the label to show — the custom free-text label when present,
 * otherwise the category's translated built-in name. */
export function goalCategoryLabel(
  category: GoalCategory,
  customLabel: string | null,
  t: TFunction,
): string {
  if (category === 'custom' && customLabel?.trim()) return customLabel.trim();
  return t(goalCategoryMeta(category).labelKey);
}

export const GOAL_PRIORITIES: { id: GoalPriority; labelKey: string }[] = [
  { id: 'low', labelKey: 'fields.low' },
  { id: 'medium', labelKey: 'fields.medium' },
  { id: 'high', labelKey: 'fields.high' },
];
