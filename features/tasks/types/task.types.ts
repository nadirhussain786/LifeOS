export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'archived';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high';

export type TaskCategory = {
  id: string;
  name: string;
  colorToken: string;
  icon: string;
};

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId: string | null;
  dueDate: number | null;
  completedAt: number | null;
  position: number;
  createdAt: number;
  updatedAt: number;
};

export type TaskDueBucket = 'overdue' | 'today' | 'upcoming' | 'no-date';

export type TaskListFilter = 'active' | 'completed' | 'archived';
export type TaskSort = 'due-date' | 'priority' | 'created';

export type CreateTaskInput = {
  title: string;
  notes?: string | null;
  priority?: TaskPriority;
  categoryId?: string | null;
  dueDate?: number | null;
};

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  status?: TaskStatus;
};
