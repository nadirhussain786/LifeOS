import { isPast, isToday, startOfDay } from 'date-fns';

import type { Task, TaskDueBucket } from '@/features/tasks/types/task.types';

const BUCKET_LABEL: Record<TaskDueBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  'no-date': 'No date',
};

export function getDueBucket(task: Task): TaskDueBucket {
  if (!task.dueDate) return 'no-date';
  const due = new Date(task.dueDate);
  if (isToday(due)) return 'today';
  if (isPast(startOfDay(due))) return 'overdue';
  return 'upcoming';
}

export type TaskSection = { bucket: TaskDueBucket; label: string; tasks: Task[] };

const BUCKET_ORDER: TaskDueBucket[] = ['overdue', 'today', 'upcoming', 'no-date'];

/** Groups tasks into due-date buckets, in a fixed display order, dropping empty buckets. */
export function groupTasksByDueDate(tasks: Task[]): TaskSection[] {
  const buckets = new Map<TaskDueBucket, Task[]>();
  for (const task of tasks) {
    const bucket = getDueBucket(task);
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), task]);
  }
  return BUCKET_ORDER.filter((bucket) => buckets.has(bucket)).map((bucket) => ({
    bucket,
    label: BUCKET_LABEL[bucket],
    tasks: buckets.get(bucket)!,
  }));
}
