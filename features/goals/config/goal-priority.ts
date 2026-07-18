import { priorityColors } from '@/constants/theme';
import type { GoalPriority } from '@/features/goals/types/goal.types';

/** Sort weight for priority — high first when sorting by priority. */
export const PRIORITY_RANK: Record<GoalPriority, number> = { low: 0, medium: 1, high: 2 };

/** Reuses the app-wide traffic-light priority ladder so "high" reads the same
 * urgent red here as it does on tasks. */
export function goalPriorityColor(priority: GoalPriority): string {
  return priorityColors[priority];
}
