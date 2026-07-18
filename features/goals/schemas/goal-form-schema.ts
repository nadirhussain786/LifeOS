import { z } from 'zod';

/**
 * Milestone-mode goals must have at least one milestone at creation, but the
 * edit form manages milestones on the detail timeline instead — so that single
 * rule is parameterized rather than duplicating the whole schema.
 */
export function makeGoalFormSchema(requireMilestones: boolean) {
  return z
    .object({
      title: z.string().trim().min(1, 'Name your goal').max(100),
      description: z.string().trim().max(500).nullable(),
      category: z.enum(['fitness', 'study', 'finance', 'career', 'personal', 'custom']),
      categoryLabel: z.string().trim().max(30).nullable(),
      priority: z.enum(['low', 'medium', 'high']),
      progressMode: z.enum(['percent', 'count', 'milestones']),
      targetValue: z.number().positive().nullable(),
      unit: z.string().trim().max(20).nullable(),
      dueDate: z.number().nullable(),
      milestones: z.array(z.string().trim().max(100)),
    })
    .superRefine((values, ctx) => {
      if (values.category === 'custom' && !values.categoryLabel?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Name your custom category', path: ['categoryLabel'] });
      }
      if (values.progressMode === 'count' && !values.targetValue) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Set a target amount', path: ['targetValue'] });
      }
      if (values.progressMode === 'count' && !values.unit?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Add a unit (e.g. books, kg, $)', path: ['unit'] });
      }
      if (requireMilestones && values.progressMode === 'milestones' && values.milestones.filter((m) => m.trim()).length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Add at least one milestone', path: ['milestones'] });
      }
    });
}

export const goalFormSchema = makeGoalFormSchema(true);

export type GoalFormValues = z.infer<typeof goalFormSchema>;

export const goalFormDefaults: GoalFormValues = {
  title: '',
  description: null,
  category: 'personal',
  categoryLabel: null,
  priority: 'medium',
  progressMode: 'percent',
  targetValue: null,
  unit: null,
  dueDate: null,
  milestones: [],
};
