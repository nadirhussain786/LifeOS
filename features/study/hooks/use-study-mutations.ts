import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createStudySession,
  createStudySubject,
  deleteStudySession,
  deleteStudySubject,
  renameStudySubject,
  updateStudySettings,
} from '@/features/study/services/study-repository';
import type { CreateStudySessionInput, StudySettings } from '@/features/study/types/study.types';

export function useStudyMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['study'] });

  const logSession = useMutation({
    mutationFn: async (input: CreateStudySessionInput) => createStudySession(input),
    onSuccess: invalidate,
  });

  const removeSession = useMutation({
    mutationFn: async (id: string) => deleteStudySession(id),
    onSuccess: invalidate,
  });

  const addSubject = useMutation({
    mutationFn: async ({ name, colorToken }: { name: string; colorToken: string }) => createStudySubject(name, colorToken),
    onSuccess: invalidate,
  });

  const renameSubject = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => renameStudySubject(id, name),
    onSuccess: invalidate,
  });

  const removeSubject = useMutation({
    mutationFn: async (id: string) => deleteStudySubject(id),
    onSuccess: invalidate,
  });

  const saveSettings = useMutation({
    mutationFn: async (input: Partial<StudySettings>) => updateStudySettings(input),
    onSuccess: invalidate,
  });

  return { logSession, removeSession, addSubject, renameSubject, removeSubject, saveSettings };
}
