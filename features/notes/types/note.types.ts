export type NoteCategory = {
  id: string;
  name: string;
  colorToken: string;
  icon: string;
  deletedAt?: number | null;
};

export type Note = {
  id: string;
  title: string;
  body: string | null;
  categoryId: string | null;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
};

export type CreateNoteInput = {
  title: string;
  body?: string | null;
  categoryId?: string | null;
  isPinned?: boolean;
};

export type UpdateNoteInput = Partial<CreateNoteInput>;
